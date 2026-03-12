import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import Layout from '../components/Layout';
import SettingsModal from '../components/SettingsModal';
import { useTheme } from '../context/ThemeContext';
import { RefreshCw, Moon, Sun, Bell, Settings, LogOut, X } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
  RadialBarChart, RadialBar,
} from 'recharts';

const API_URL = process.env.REACT_APP_API_URL || 'http://54.251.28.81';
const getToken = () => localStorage.getItem('token');

const formatBudget = (value) => {
  if (!value || value === 0) return '₱0';
  const n = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.-]/g, '')) : value;
  if (isNaN(n) || n === 0) return '₱0';
  const neg = n < 0 ? '-' : '';
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${neg}₱${(abs/1e9).toFixed(1)}B`;
  if (abs >= 1_000_000)     return `${neg}₱${(abs/1e6).toFixed(1)}M`;
  if (abs >= 1_000)         return `${neg}₱${(abs/1e3).toFixed(1)}K`;
  return `${neg}₱${abs.toFixed(2)}`;
};

const toNum = (v) => {
  const n = typeof v === 'string' ? parseFloat(v.replace(/[^0-9.-]/g,'')) : (v||0);
  return isNaN(n) ? 0 : n;
};

const statusBadgeClass = (s) => ({
  'Completed':   'bg-green-100 text-green-700',
  'In Progress': 'bg-blue-100 text-blue-700',
  'On Hold':     'bg-yellow-100 text-yellow-700',
  'Overdue':     'bg-red-100 text-red-700',
  'Not Started': 'bg-gray-100 text-gray-600',
}[s] || 'bg-gray-100 text-gray-600');

function DashboardPage() {
  const [projects, setProjects]                         = useState([]);
  const [projectsWithProgress, setProjectsWithProgress] = useState([]);
  const [loading, setLoading]                           = useState(true);
  const [isRefreshing, setIsRefreshing]                 = useState(false);
  const [pendingTasksCount, setPendingTasksCount]       = useState(0);
  const [modalType, setModalType]                       = useState(null);
  const [pmUsers, setPmUsers]                           = useState([]);
  const [showSettings, setShowSettings]                 = useState(false);
  const [showUsersModal, setShowUsersModal]             = useState(false);
  const [weather, setWeather]                           = useState(null);
  const [weatherLoading, setWeatherLoading]             = useState(true);
  const [activeIndex, setActiveIndex]                   = useState(null);

  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  // ── Data Fetching ──────────────────────────────────────────────
  const fetchProjectsWithProgress = async (showLoadingState = true) => {
    const token = getToken();
    if (!token) { navigate('/login'); return; }
    if (showLoadingState) setLoading(true); else setIsRefreshing(true);
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const { data: projectsData } = await axios.get(`${API_URL}/api/projects`, config);
      setProjects(projectsData);
      let totalPending = 0;
      const withProgress = await Promise.all(projectsData.map(async (p) => {
        try {
          const { data: milestones = [] } = await axios.get(`${API_URL}/api/milestones/project/${p.projectId}`, config);
          const phases = milestones.filter(m => m.isPhase);
          const tasks  = milestones.filter(m => !m.isPhase);
          totalPending += tasks.filter(t => (t.completionPercentage||0) < 100).length;
          let taskProgress = 0;
          if (phases.length > 0) {
            const avgs = phases.map(ph => {
              const pt = tasks.filter(t => t.parentPhase === ph.milestoneId);
              return pt.length ? pt.reduce((s,t)=>s+(t.completionPercentage||0),0)/pt.length : 0;
            });
            taskProgress = Math.round(avgs.reduce((s,a)=>s+a,0)/phases.length);
          } else if (tasks.length > 0) {
            taskProgress = Math.round(tasks.reduce((s,t)=>s+(t.completionPercentage||0),0)/tasks.length);
          }
          const { data: expenses = [] } = await axios.get(`${API_URL}/api/expenses/project/${p.projectId}`, config);
          const totalSpent = expenses.reduce((s,e)=>s+(parseFloat(e.amount)||0),0);
          return { ...p, taskProgress, totalSpent };
        } catch { return { ...p, taskProgress: 0, totalSpent: 0 }; }
      }));
      setProjectsWithProgress(withProgress);
      setPendingTasksCount(totalPending);
    } catch { /* silent */ }
    finally { setLoading(false); setIsRefreshing(false); }
  };

  const fetchUsers = async () => {
    const token = getToken();
    if (!token) return;
    const fallback = [{
      userId: localStorage.getItem('userId') || 'me',
      name:   localStorage.getItem('userName') || 'Me',
      email:  localStorage.getItem('userEmail') || '',
      role:   localStorage.getItem('userRole') || 'User',
      avatar: localStorage.getItem('userAvatar') || '',
    }];
    for (const ep of [`${API_URL}/api/users/all`, `${API_URL}/api/admin/users`, `${API_URL}/api/users`]) {
      try {
        const { data: raw } = await axios.get(ep, { headers: { Authorization: `Bearer ${token}` } });
        const users = Array.isArray(raw) ? raw : raw.users || raw.data || raw.Items || [];
        if (users.length > 0) {
          setPmUsers(users.map(u => ({
            userId: u.userId || u.id || String(Math.random()),
            name:   u.name || u.fullName || u.email?.split('@')[0] || 'User',
            email:  u.email || '',
            role:   u.role || 'User',
            avatar: u.avatar || u.profileImage || '',
          })));
          return;
        }
      } catch { /* try next */ }
    }
    setPmUsers(fallback);
  };

  const getWeatherInfo = (code) => {
    if (code === 0)   return { label:'Clear Sky',     emoji:'☀️',  bg:'from-yellow-400 to-orange-400' };
    if (code <= 2)    return { label:'Partly Cloudy', emoji:'⛅',  bg:'from-blue-400 to-sky-300' };
    if (code === 3)   return { label:'Overcast',      emoji:'☁️',  bg:'from-gray-400 to-slate-400' };
    if (code <= 49)   return { label:'Foggy',         emoji:'🌫️', bg:'from-gray-400 to-slate-300' };
    if (code <= 59)   return { label:'Drizzle',       emoji:'🌦️', bg:'from-blue-500 to-cyan-400' };
    if (code <= 69)   return { label:'Rain',          emoji:'🌧️', bg:'from-blue-600 to-blue-500' };
    if (code <= 79)   return { label:'Snow',          emoji:'❄️',  bg:'from-sky-200 to-blue-200' };
    if (code <= 82)   return { label:'Rain Showers',  emoji:'🌧️', bg:'from-blue-600 to-indigo-500' };
    if (code <= 99)   return { label:'Thunderstorm',  emoji:'⛈️',  bg:'from-gray-700 to-slate-600' };
    return                   { label:'Unknown',       emoji:'🌡️', bg:'from-gray-400 to-gray-500' };
  };

  const fetchWeather = async () => {
    setWeatherLoading(true);
    const setFromCoords = async (lat, lon, city) => {
      const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weathercode&wind_speed_unit=kmh&timezone=auto`);
      const d = await r.json();
      const c = d.current;
      setWeather({ temp: Math.round(c.temperature_2m), feelsLike: Math.round(c.apparent_temperature), humidity: c.relative_humidity_2m, windSpeed: Math.round(c.wind_speed_10m), city, ...getWeatherInfo(c.weathercode) });
    };
    try {
      const pos = await new Promise((res,rej) => navigator.geolocation.getCurrentPosition(res,rej,{timeout:8000}));
      const geo = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&format=json`);
      const gd  = await geo.json();
      await setFromCoords(pos.coords.latitude, pos.coords.longitude, gd.address?.city || gd.address?.town || 'Your Location');
    } catch {
      try { await setFromCoords(14.5995, 120.9842, 'Manila'); } catch { setWeather(null); }
    } finally { setWeatherLoading(false); }
  };

  useEffect(() => { fetchProjectsWithProgress(); fetchUsers(); fetchWeather(); }, []);
  useEffect(() => {
    if (!loading && location.pathname === '/dashboard') fetchProjectsWithProgress(false);
  }, [location.pathname]);

  // ── Stats ──────────────────────────────────────────────────────
  const totalBudget    = projects.reduce((s,p) => s+toNum(p.contractCost), 0);
  const totalSpent     = projectsWithProgress.reduce((s,p) => s+toNum(p.totalSpent), 0);
  const avgCompletion  = projectsWithProgress.length ? Math.round(projectsWithProgress.reduce((s,p)=>s+p.taskProgress,0)/projectsWithProgress.length) : 0;
  const activeProjects = projects.filter(p=>p.status==='In Progress').length;
  const pendingProjects= projects.filter(p=>p.status==='Not Started').length;
  const overBudget     = projectsWithProgress.filter(p=>toNum(p.totalSpent)>toNum(p.contractCost)).length;
  const atRisk         = projectsWithProgress.filter(p=>p.taskProgress<50&&p.status==='In Progress').length;

  const chartData = projectsWithProgress.map(p => ({
    name:      p.name?.length > 12 ? p.name.substring(0,10)+'…' : p.name||'Project',
    Spent:     Math.round(toNum(p.totalSpent)),
    Remaining: Math.round(Math.max(toNum(p.contractCost)-toNum(p.totalSpent), 0)),
  }));

  const ResourceTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-sm shadow-xl">
        <p className="font-bold mb-1">{label}</p>
        {payload.map(e => <p key={e.name} style={{color:e.fill}}>{e.name}: {formatBudget(e.value)}</p>)}
      </div>
    );
  };

  // ── Users Modal ────────────────────────────────────────────────
  const UsersModal = () => {
    if (!showUsersModal) return null;
    const roleColor = (r) => ({
      'Admin':           'bg-red-100 text-red-700',
      'Project Manager': 'bg-blue-100 text-blue-700',
      'Vice President':  'bg-purple-100 text-purple-700',
    }[r] || 'bg-gray-100 text-gray-600');
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={()=>setShowUsersModal(false)}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700" onClick={e=>e.stopPropagation()}>
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Registered Users</h2>
              <p className="text-white/70 text-xs">{pmUsers.length} user{pmUsers.length!==1?'s':''} in the system</p>
            </div>
            <button onClick={()=>setShowUsersModal(false)} className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"><X className="w-4 h-4"/></button>
          </div>
          <div className="overflow-y-auto flex-1 p-5 space-y-3">
            {pmUsers.length === 0
              ? <div className="flex flex-col items-center justify-center py-16 text-gray-400"><p className="text-4xl mb-3">👥</p><p className="font-medium">No users found</p></div>
              : pmUsers.map((u,i) => (
                <div key={u.userId||i} className="flex items-center gap-4 p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-gray-50 dark:bg-slate-700/50 hover:shadow-md transition-all">
                  {u.avatar
                    ? <img src={u.avatar} alt={u.name} className="w-11 h-11 rounded-full object-cover flex-shrink-0 border-2 border-white shadow"/>
                    : <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 border-2 border-white shadow" style={{background:`hsl(${(i*67+210)%360},65%,55%)`}}>
                        {(u.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
                      </div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{u.name||'Unnamed User'}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{u.email||'—'}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${roleColor(u.role)}`}>{u.role||'User'}</span>
                </div>
              ))
            }
          </div>
          <div className="border-t border-gray-200 dark:border-slate-700 px-5 py-3 bg-gray-50 dark:bg-slate-800/50 flex justify-end">
            <button onClick={()=>setShowUsersModal(false)} className="px-4 py-2 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg transition-colors">Close</button>
          </div>
        </div>
      </div>
    );
  };

  // ── Pie Colors ─────────────────────────────────────────────────
  const PIE_COLORS = ['#3b82f6','#10b981','#f59e0b','#8b5cf6','#ef4444','#06b6d4','#f97316','#6366f1','#14b8a6','#ec4899'];

  // ── Budget Pie Chart Modal ─────────────────────────────────────
  const BudgetPieModal = () => {
    if (modalType !== 'budget') return null;

    const pieData = projectsWithProgress
      .filter(p => toNum(p.contractCost) > 0)
      .map(p => ({
        name:      p.name || 'Unnamed',
        allocated: toNum(p.contractCost),
        spent:     toNum(p.totalSpent),
        left:      Math.max(toNum(p.contractCost) - toNum(p.totalSpent), 0),
        over:      toNum(p.totalSpent) > toNum(p.contractCost),
        projectId: p.projectId,
      }));

    const allocPieData = pieData.map(p => ({ name: p.name, value: p.allocated }));
    const spentPieData = [
      { name: 'Spent',     value: totalSpent },
      { name: 'Remaining', value: Math.max(totalBudget - totalSpent, 0) },
    ];

    const CustomTooltip = ({ active, payload }) => {
      if (!active || !payload?.length) return null;
      const d = payload[0];
      return (
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-gray-700">
          <p className="font-bold mb-0.5">{d.name}</p>
          <p style={{color: d.payload.fill || d.color}}>{formatBudget(d.value)}</p>
          <p className="text-gray-400">{((d.value / totalBudget) * 100).toFixed(1)}% of total</p>
        </div>
      );
    };

    const SpentTooltip = ({ active, payload }) => {
      if (!active || !payload?.length) return null;
      const d = payload[0];
      const pct = totalBudget > 0 ? ((d.value / totalBudget) * 100).toFixed(1) : 0;
      return (
        <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-gray-700">
          <p className="font-bold mb-0.5">{d.name}</p>
          <p style={{color: d.name === 'Spent' ? '#ef4444' : '#10b981'}}>{formatBudget(d.value)}</p>
          <p className="text-gray-400">{pct}% of total</p>
        </div>
      );
    };

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={()=>setModalType(null)}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700" onClick={e=>e.stopPropagation()}>
          <div className="bg-green-600 px-6 py-3 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-white">Budget Overview</h2>
              <span className="text-white/60 text-xs hidden sm:block">— {formatBudget(totalBudget)} allocated</span>
            </div>
            <button onClick={()=>setModalType(null)} className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"><X className="w-4 h-4"/></button>
          </div>
          <div className="overflow-y-auto flex-1 p-6">
            {pieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <p className="text-5xl mb-4">💰</p>
                <p className="text-lg font-medium">No budget data available</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50 rounded-xl p-4 text-center">
                    <p className="text-xs text-green-600 font-medium mb-1">Total Allocated</p>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{formatBudget(totalBudget)}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700/50 rounded-xl p-4 text-center">
                    <p className="text-xs text-red-600 font-medium mb-1">Total Spent</p>
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{formatBudget(totalSpent)}</p>
                  </div>
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-4 text-center">
                    <p className="text-xs text-blue-600 font-medium mb-1">Remaining</p>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{formatBudget(Math.max(totalBudget - totalSpent, 0))}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 border border-gray-200 dark:border-slate-600">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 text-center">Budget Allocation per Project</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={allocPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value"
                          onMouseEnter={(_,i)=>setActiveIndex(i)} onMouseLeave={()=>setActiveIndex(null)}>
                          {allocPieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} opacity={activeIndex === null || activeIndex === i ? 1 : 0.5} stroke="none"/>
                          ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip/>}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-1.5 max-h-28 overflow-y-auto pr-1">
                      {allocPieData.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background: PIE_COLORS[i % PIE_COLORS.length]}}/>
                            <span className="text-gray-600 dark:text-gray-400 truncate">{d.name}</span>
                          </div>
                          <span className="font-semibold text-gray-700 dark:text-gray-300 flex-shrink-0">{formatBudget(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 border border-gray-200 dark:border-slate-600">
                    <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-4 text-center">Spent vs. Remaining</h4>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie data={spentPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                          <Cell fill="#ef4444" stroke="none"/>
                          <Cell fill="#10b981" stroke="none"/>
                        </Pie>
                        <Tooltip content={<SpentTooltip/>}/>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="mt-2 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-red-400 flex-shrink-0"/><span className="text-gray-600 dark:text-gray-400">Spent</span></div>
                        <span className="font-semibold text-red-600">{formatBudget(totalSpent)}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0"/><span className="text-gray-600 dark:text-gray-400">Remaining</span></div>
                        <span className="font-semibold text-green-600">{formatBudget(Math.max(totalBudget - totalSpent, 0))}</span>
                      </div>
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-slate-600 flex items-center justify-between text-xs">
                        <span className="text-gray-500">Utilization</span>
                        <span className="font-bold text-gray-700 dark:text-gray-300">
                          {totalBudget > 0 ? ((totalSpent / totalBudget) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-6">
                  <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Per-Project Breakdown</h4>
                  <div className="space-y-2">
                    {pieData.map((p, i) => {
                      const pct = p.allocated > 0 ? Math.min((p.spent / p.allocated) * 100, 100) : 0;
                      return (
                        <div key={p.projectId}
                          onClick={()=>{navigate(`/projects/${p.projectId}`);setModalType(null);}}
                          className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/40 hover:shadow-md cursor-pointer transition-all group">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{background: PIE_COLORS[i % PIE_COLORS.length]}}/>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <p className="text-sm font-semibold text-gray-800 dark:text-white truncate group-hover:text-green-600 transition-colors">{p.name}</p>
                              {p.over && <span className="ml-2 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full flex-shrink-0">⚠️ Over</span>}
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
                              <div className="h-1.5 rounded-full transition-all" style={{width:`${pct}%`, background: p.over ? '#ef4444' : PIE_COLORS[i % PIE_COLORS.length]}}/>
                            </div>
                          </div>
                          <div className="flex gap-4 text-xs text-right flex-shrink-0">
                            <div><p className="text-gray-400">Budget</p><p className="font-semibold text-gray-700 dark:text-gray-300">{formatBudget(p.allocated)}</p></div>
                            <div><p className="text-gray-400">Spent</p><p className={`font-semibold ${p.over ? 'text-red-600' : 'text-gray-700 dark:text-gray-300'}`}>{formatBudget(p.spent)}</p></div>
                            <div><p className="text-gray-400">Left</p><p className="font-semibold text-green-600">{formatBudget(p.left)}</p></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
          <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-slate-800/50 flex-shrink-0">
            <p className="text-sm text-gray-500">{pieData.length} project{pieData.length!==1?'s':''} shown</p>
            <div className="flex gap-3">
              <button onClick={()=>{navigate('/projects');setModalType(null);}} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-colors">Go to Projects</button>
              <button onClick={()=>setModalType(null)} className="px-4 py-2 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg transition-colors">Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ── Shared dark tooltip ───────────────────────────────────────
  const DarkTooltip = ({ active, payload, label, formatter }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-white text-xs shadow-xl">
        {label && <p className="font-bold mb-1 text-sm">{label}</p>}
        {payload.map((e,i) => (
          <p key={i} style={{color: e.color || e.fill || '#fff'}}>
            {e.name}: {formatter ? formatter(e.value) : e.value}
          </p>
        ))}
      </div>
    );
  };

  // ── Unified Chart Modal ────────────────────────────────────────
  const ChartModal = () => {
    if (!modalType || modalType === 'budget') return null;

    const STATUS_COLORS = {
      'Completed':   '#10b981',
      'In Progress': '#3b82f6',
      'On Hold':     '#f59e0b',
      'Overdue':     '#ef4444',
      'Not Started': '#9ca3af',
    };

    const configs = {
      total: {
        title: 'Total Projects', subtitle: `${projects.length} total`, headerColor: 'bg-gray-700',
        summaryCards: [
          { label:'Total',       value: projects.length,                                     color:'bg-gray-100 border-gray-300',   text:'text-gray-800' },
          { label:'In Progress', value: projects.filter(p=>p.status==='In Progress').length, color:'bg-blue-50 border-blue-200',    text:'text-blue-700' },
          { label:'Completed',   value: projects.filter(p=>p.status==='Completed').length,   color:'bg-green-50 border-green-200',  text:'text-green-700' },
          { label:'On Hold',     value: projects.filter(p=>p.status==='On Hold').length,     color:'bg-yellow-50 border-yellow-200',text:'text-yellow-700' },
        ],
        charts: () => {
          const statusGroups = ['Completed','In Progress','On Hold','Not Started','Overdue']
            .map(s => ({ name: s, value: projects.filter(p=>p.status===s).length }))
            .filter(d=>d.value>0);
          return (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 border border-gray-200 dark:border-slate-600">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">Projects by Status</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={statusGroups} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {statusGroups.map((d,i) => <Cell key={i} fill={STATUS_COLORS[d.name]||PIE_COLORS[i]} stroke="none"/>)}
                    </Pie>
                    <Tooltip content={<DarkTooltip/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {statusGroups.map((d,i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{background:STATUS_COLORS[d.name]||PIE_COLORS[i]}}/><span className="text-gray-600 dark:text-gray-400">{d.name}</span></div>
                      <span className="font-bold text-gray-700 dark:text-gray-300">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl p-4 border border-gray-200 dark:border-slate-600">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3 text-center">Completion per Project</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={projectsWithProgress.map(p=>({name:p.name?.substring(0,10)||'?', progress:p.taskProgress}))} layout="vertical" margin={{left:0,right:20,top:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" horizontal={false}/>
                    <XAxis type="number" domain={[0,100]} tick={{fontSize:10}} tickFormatter={v=>`${v}%`} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false} width={70}/>
                    <Tooltip content={<DarkTooltip formatter={v=>`${v}%`}/>}/>
                    <Bar dataKey="progress" radius={[0,4,4,0]}>
                      {projectsWithProgress.map((p,i)=><Cell key={i} fill={p.taskProgress>=75?'#10b981':p.taskProgress>=40?'#3b82f6':'#ef4444'}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        },
        tableData: projectsWithProgress,
        tableColor: 'gray',
      },

      active: {
        title: 'Active Projects', subtitle: `${activeProjects} in progress`, headerColor: 'bg-blue-600',
        summaryCards: [
          { label:'Active',       value: activeProjects, color:'bg-blue-50 border-blue-200', text:'text-blue-700' },
          { label:'Avg Progress', value: (() => { const inProg = projectsWithProgress.filter(p=>p.status==='In Progress'); return `${activeProjects>0?Math.round(inProg.reduce((s,p)=>s+p.taskProgress,0)/activeProjects):0}%`; })(), color:'bg-cyan-50 border-cyan-200', text:'text-cyan-700' },
          { label:'On Time',      value: projectsWithProgress.filter(p=>p.status==='In Progress'&&p.taskProgress>=50).length, color:'bg-green-50 border-green-200', text:'text-green-700' },
          { label:'Behind',       value: projectsWithProgress.filter(p=>p.status==='In Progress'&&p.taskProgress<50).length,  color:'bg-red-50 border-red-200',   text:'text-red-700' },
        ],
        charts: () => {
          const activeData = projectsWithProgress.filter(p=>p.status==='In Progress');
          const barData = activeData.map(p=>({ name: p.name?.substring(0,12)||'?', progress: p.taskProgress, budget: toNum(p.contractCost), spent: toNum(p.totalSpent) }));
          return (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-blue-50 dark:bg-slate-700/30 rounded-xl p-4 border border-blue-200 dark:border-slate-600">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">Completion Progress</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} layout="vertical" margin={{left:0,right:25,top:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" horizontal={false}/>
                    <XAxis type="number" domain={[0,100]} tick={{fontSize:10}} tickFormatter={v=>`${v}%`} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false} width={72}/>
                    <Tooltip content={<DarkTooltip formatter={v=>`${v}%`}/>}/>
                    <Bar dataKey="progress" radius={[0,4,4,0]}>
                      {barData.map((d,i)=><Cell key={i} fill={d.progress>=75?'#10b981':d.progress>=40?'#3b82f6':'#ef4444'}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-blue-50 dark:bg-slate-700/30 rounded-xl p-4 border border-blue-200 dark:border-slate-600">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">Budget vs Spent</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{left:0,right:10,top:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#dbeafe" vertical={false}/>
                    <XAxis dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis tickFormatter={v=>formatBudget(v)} tick={{fontSize:9}} axisLine={false} tickLine={false} width={52}/>
                    <Tooltip content={<DarkTooltip formatter={formatBudget}/>}/>
                    <Legend iconSize={10} wrapperStyle={{fontSize:10}}/>
                    <Bar dataKey="budget" fill="#93c5fd" radius={[4,4,0,0]} name="Budget"/>
                    <Bar dataKey="spent"  fill="#3b82f6" radius={[4,4,0,0]} name="Spent"/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        },
        tableData: projectsWithProgress.filter(p=>p.status==='In Progress'),
        tableColor: 'blue',
      },

      completion: {
        title: 'Avg. Completion', subtitle: `${avgCompletion}% overall`, headerColor: 'bg-purple-600',
        summaryCards: [
          { label:'Avg. Completion', value:`${avgCompletion}%`, color:'bg-purple-50 border-purple-200', text:'text-purple-700' },
          { label:'≥ 75% Done',      value: projectsWithProgress.filter(p=>p.taskProgress>=75).length,                     color:'bg-green-50 border-green-200',  text:'text-green-700' },
          { label:'40–74%',          value: projectsWithProgress.filter(p=>p.taskProgress>=40&&p.taskProgress<75).length,  color:'bg-blue-50 border-blue-200',    text:'text-blue-700' },
          { label:'< 40%',           value: projectsWithProgress.filter(p=>p.taskProgress<40).length,                      color:'bg-red-50 border-red-200',      text:'text-red-700' },
        ],
        charts: () => {
          const sorted = [...projectsWithProgress].sort((a,b)=>b.taskProgress-a.taskProgress);
          const radialData = sorted.map((p,i) => ({ name: p.name?.substring(0,14)||'?', progress: p.taskProgress, fill: PIE_COLORS[i%PIE_COLORS.length] }));
          return (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-purple-50 dark:bg-slate-700/30 rounded-xl p-4 border border-purple-200 dark:border-slate-600">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">Radial Progress</h4>
                <ResponsiveContainer width="100%" height={210}>
                  <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={radialData} startAngle={180} endAngle={0}>
                    <RadialBar minAngle={5} dataKey="progress" cornerRadius={4} background={{fill:'#e5e7eb'}}/>
                    <Tooltip content={<DarkTooltip formatter={v=>`${v}%`}/>}/>
                    <Legend iconSize={8} wrapperStyle={{fontSize:10, paddingTop:8}}/>
                  </RadialBarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-purple-50 dark:bg-slate-700/30 rounded-xl p-4 border border-purple-200 dark:border-slate-600">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">Completion Ranking</h4>
                <ResponsiveContainer width="100%" height={210}>
                  <BarChart data={sorted.map(p=>({name:p.name?.substring(0,10)||'?',progress:p.taskProgress}))} layout="vertical" margin={{left:0,right:25,top:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e9d5ff" horizontal={false}/>
                    <XAxis type="number" domain={[0,100]} tick={{fontSize:10}} tickFormatter={v=>`${v}%`} axisLine={false} tickLine={false}/>
                    <YAxis type="category" dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false} width={70}/>
                    <Tooltip content={<DarkTooltip formatter={v=>`${v}%`}/>}/>
                    <Bar dataKey="progress" radius={[0,4,4,0]}>
                      {sorted.map((p,i)=><Cell key={i} fill={p.taskProgress>=75?'#10b981':p.taskProgress>=40?'#8b5cf6':'#ef4444'}/>)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        },
        tableData: [...projectsWithProgress].sort((a,b)=>b.taskProgress-a.taskProgress),
        tableColor: 'purple',
      },

      pending: {
        title: 'Pending Projects', subtitle: `${pendingProjects} not started`, headerColor: 'bg-yellow-500',
        summaryCards: [
          { label:'Not Started',  value: pendingProjects,                                                          color:'bg-yellow-50 border-yellow-200', text:'text-yellow-700' },
          { label:'Total Budget', value: formatBudget(projectsWithProgress.filter(p=>p.status==='Not Started').reduce((s,p)=>s+toNum(p.contractCost),0)), color:'bg-green-50 border-green-200', text:'text-green-700' },
          { label:'On Hold',      value: projects.filter(p=>p.status==='On Hold').length,                         color:'bg-orange-50 border-orange-200', text:'text-orange-700' },
          { label:'All Inactive', value: projects.filter(p=>!['In Progress','Completed'].includes(p.status)).length, color:'bg-gray-50 border-gray-200', text:'text-gray-700' },
        ],
        charts: () => {
          const notStarted = projectsWithProgress.filter(p=>p.status==='Not Started');
          const onHold     = projectsWithProgress.filter(p=>p.status==='On Hold');
          const pieData    = [
            { name:'Not Started', value: notStarted.length },
            { name:'On Hold',     value: onHold.length },
          ].filter(d=>d.value>0);
          const barData = [...notStarted,...onHold].map(p=>({ name: p.name?.substring(0,12)||'?', budget: toNum(p.contractCost), status: p.status }));
          return (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-yellow-50 dark:bg-slate-700/30 rounded-xl p-4 border border-yellow-200 dark:border-slate-600">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">Inactive Breakdown</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      <Cell fill="#f59e0b" stroke="none"/>
                      <Cell fill="#f97316" stroke="none"/>
                    </Pie>
                    <Tooltip content={<DarkTooltip/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {pieData.map((d,i)=>(
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{background:i===0?'#f59e0b':'#f97316'}}/><span className="text-gray-600 dark:text-gray-400">{d.name}</span></div>
                      <span className="font-bold text-gray-700 dark:text-gray-300">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-yellow-50 dark:bg-slate-700/30 rounded-xl p-4 border border-yellow-200 dark:border-slate-600">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">Budget Allocation</h4>
                {barData.length === 0
                  ? <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No pending projects</div>
                  : <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={barData} margin={{left:0,right:10,top:0,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fef3c7" vertical={false}/>
                        <XAxis dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false}/>
                        <YAxis tickFormatter={v=>formatBudget(v)} tick={{fontSize:9}} axisLine={false} tickLine={false} width={52}/>
                        <Tooltip content={<DarkTooltip formatter={formatBudget}/>}/>
                        <Bar dataKey="budget" radius={[4,4,0,0]} name="Budget">
                          {barData.map((d,i)=><Cell key={i} fill={d.status==='On Hold'?'#f97316':'#f59e0b'}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                }
              </div>
            </div>
          );
        },
        tableData: projectsWithProgress.filter(p=>!['In Progress','Completed'].includes(p.status)),
        tableColor: 'yellow',
      },

      overbudget: {
        title: 'Over Budget', subtitle: `${overBudget} exceeding budget`, headerColor: 'bg-red-600',
        summaryCards: [
          { label:'Over Budget',   value: overBudget, color:'bg-red-50 border-red-200', text:'text-red-700' },
          { label:'Total Overage', value: formatBudget(projectsWithProgress.filter(p=>toNum(p.totalSpent)>toNum(p.contractCost)).reduce((s,p)=>s+(toNum(p.totalSpent)-toNum(p.contractCost)),0)), color:'bg-rose-50 border-rose-200', text:'text-rose-700' },
          { label:'Within Budget', value: projectsWithProgress.filter(p=>toNum(p.totalSpent)<=toNum(p.contractCost)).length, color:'bg-green-50 border-green-200', text:'text-green-700' },
          { label:'All Projects',  value: projects.length, color:'bg-gray-50 border-gray-200', text:'text-gray-700' },
        ],
        charts: () => {
          const allBudgetData = projectsWithProgress.map(p=>({ name: p.name?.substring(0,11)||'?', budget: toNum(p.contractCost), spent: toNum(p.totalSpent), over: toNum(p.totalSpent)>toNum(p.contractCost) }));
          const pieData2 = [
            { name:'Over Budget',   value: overBudget },
            { name:'Within Budget', value: projects.length - overBudget },
          ].filter(d=>d.value>0);
          return (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-red-50 dark:bg-slate-700/30 rounded-xl p-4 border border-red-200 dark:border-slate-600">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">Budget Health</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData2} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      <Cell fill="#ef4444" stroke="none"/>
                      <Cell fill="#10b981" stroke="none"/>
                    </Pie>
                    <Tooltip content={<DarkTooltip/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {pieData2.map((d,i)=>(
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{background:i===0?'#ef4444':'#10b981'}}/><span className="text-gray-600 dark:text-gray-400">{d.name}</span></div>
                      <span className="font-bold text-gray-700 dark:text-gray-300">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-red-50 dark:bg-slate-700/30 rounded-xl p-4 border border-red-200 dark:border-slate-600">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">Budget vs Spent (All Projects)</h4>
                {allBudgetData.length === 0
                  ? <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No data</div>
                  : <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={allBudgetData} margin={{left:0,right:10,top:0,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#fee2e2" vertical={false}/>
                        <XAxis dataKey="name" tick={{fontSize:9}} axisLine={false} tickLine={false}/>
                        <YAxis tickFormatter={v=>formatBudget(v)} tick={{fontSize:9}} axisLine={false} tickLine={false} width={52}/>
                        <Tooltip content={<DarkTooltip formatter={formatBudget}/>}/>
                        <Legend iconSize={10} wrapperStyle={{fontSize:10}}/>
                        <Bar dataKey="budget" fill="#fca5a5" radius={[4,4,0,0]} name="Budget"/>
                        <Bar dataKey="spent" radius={[4,4,0,0]} name="Spent">
                          {allBudgetData.map((d,i)=><Cell key={i} fill={d.over?'#ef4444':'#3b82f6'}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                }
              </div>
            </div>
          );
        },
        tableData: projectsWithProgress.filter(p=>toNum(p.totalSpent)>toNum(p.contractCost)),
        tableColor: 'red',
      },

      atrisk: {
        title: 'At Risk', subtitle: `${atRisk} behind schedule`, headerColor: 'bg-indigo-600',
        summaryCards: [
          { label:'At Risk',      value: atRisk, color:'bg-indigo-50 border-indigo-200', text:'text-indigo-700' },
          { label:'Avg Progress', value: (() => { const riskProj = projectsWithProgress.filter(p=>p.taskProgress<50&&p.status==='In Progress'); return `${atRisk>0?Math.round(riskProj.reduce((s,p)=>s+p.taskProgress,0)/atRisk):0}%`; })(), color:'bg-red-50 border-red-200', text:'text-red-700' },
          { label:'Active Safe',  value: projectsWithProgress.filter(p=>p.status==='In Progress'&&p.taskProgress>=50).length, color:'bg-green-50 border-green-200', text:'text-green-700' },
          { label:'Total Active', value: activeProjects, color:'bg-blue-50 border-blue-200', text:'text-blue-700' },
        ],
        charts: () => {
          const riskData = projectsWithProgress.filter(p=>p.status==='In Progress').map(p=>({ name: p.name?.substring(0,12)||'?', progress: p.taskProgress, risk: p.taskProgress < 50 }));
          const pieRisk = [
            { name:'At Risk',  value: atRisk },
            { name:'On Track', value: Math.max(activeProjects-atRisk,0) },
          ].filter(d=>d.value>0);
          return (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-indigo-50 dark:bg-slate-700/30 rounded-xl p-4 border border-indigo-200 dark:border-slate-600">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">Risk Overview</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieRisk} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                      <Cell fill="#ef4444" stroke="none"/>
                      <Cell fill="#10b981" stroke="none"/>
                    </Pie>
                    <Tooltip content={<DarkTooltip/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  {pieRisk.map((d,i)=>(
                    <div key={i} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{background:i===0?'#ef4444':'#10b981'}}/><span className="text-gray-600 dark:text-gray-400">{d.name}</span></div>
                      <span className="font-bold text-gray-700 dark:text-gray-300">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-indigo-50 dark:bg-slate-700/30 rounded-xl p-4 border border-indigo-200 dark:border-slate-600">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">Progress of Active Projects</h4>
                {riskData.length === 0
                  ? <div className="flex items-center justify-center h-40 text-gray-400 text-sm">No active projects</div>
                  : <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={riskData} layout="vertical" margin={{left:0,right:25,top:0,bottom:0}}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" horizontal={false}/>
                        <XAxis type="number" domain={[0,100]} tick={{fontSize:10}} tickFormatter={v=>`${v}%`} axisLine={false} tickLine={false}/>
                        <YAxis type="category" dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false} width={72}/>
                        <Tooltip content={<DarkTooltip formatter={v=>`${v}%`}/>}/>
                        <Bar dataKey="progress" radius={[0,4,4,0]}>
                          {riskData.map((d,i)=><Cell key={i} fill={d.risk?'#ef4444':'#10b981'}/>)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                }
              </div>
            </div>
          );
        },
        tableData: projectsWithProgress.filter(p=>p.taskProgress<50&&p.status==='In Progress'),
        tableColor: 'indigo',
      },

      tasks: {
        title: 'Pending Tasks', subtitle: `${pendingTasksCount} need attention`, headerColor: 'bg-teal-600',
        summaryCards: [
          { label:'Pending Tasks',     value: pendingTasksCount,                                              color:'bg-teal-50 border-teal-200',   text:'text-teal-700' },
          { label:'Projects w/ Tasks', value: projectsWithProgress.filter(p=>p.taskProgress<100).length,     color:'bg-cyan-50 border-cyan-200',   text:'text-cyan-700' },
          { label:'Completed',         value: projectsWithProgress.filter(p=>p.taskProgress===100).length,   color:'bg-green-50 border-green-200', text:'text-green-700' },
          { label:'Avg. Completion',   value: `${avgCompletion}%`,                                            color:'bg-purple-50 border-purple-200', text:'text-purple-700' },
        ],
        charts: () => {
          const taskData = projectsWithProgress.map(p=>({ name: p.name?.substring(0,12)||'?', done: p.taskProgress, pending: 100 - p.taskProgress }));
          const pieTask = [
            { name:'Done',    value: Math.round(projectsWithProgress.reduce((s,p)=>s+p.taskProgress,0)/Math.max(projectsWithProgress.length,1)) },
            { name:'Pending', value: 100 - Math.round(projectsWithProgress.reduce((s,p)=>s+p.taskProgress,0)/Math.max(projectsWithProgress.length,1)) },
          ].filter(d=>d.value>0);
          return (
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-teal-50 dark:bg-slate-700/30 rounded-xl p-4 border border-teal-200 dark:border-slate-600">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">Overall Task Status</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieTask} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value" startAngle={90} endAngle={-270}>
                      <Cell fill="#10b981" stroke="none"/>
                      <Cell fill="#f59e0b" stroke="none"/>
                    </Pie>
                    <Tooltip content={<DarkTooltip formatter={v=>`${v}%`}/>}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500"/><span className="text-gray-600 dark:text-gray-400">Done</span></div><span className="font-bold text-green-600">{pieTask[0]?.value}%</span></div>
                  <div className="flex items-center justify-between text-xs"><div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500"/><span className="text-gray-600 dark:text-gray-400">Pending</span></div><span className="font-bold text-yellow-600">{pieTask[1]?.value || 0}%</span></div>
                </div>
              </div>
              <div className="bg-teal-50 dark:bg-slate-700/30 rounded-xl p-4 border border-teal-200 dark:border-slate-600">
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-2 text-center">Done vs Pending per Project</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={taskData} margin={{left:0,right:10,top:0,bottom:0}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccfbf1" vertical={false}/>
                    <XAxis dataKey="name" tick={{fontSize:10}} axisLine={false} tickLine={false}/>
                    <YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fontSize:9}} axisLine={false} tickLine={false} width={40}/>
                    <Tooltip content={<DarkTooltip formatter={v=>`${v}%`}/>}/>
                    <Legend iconSize={10} wrapperStyle={{fontSize:10}}/>
                    <Bar dataKey="done"    stackId="a" fill="#10b981" name="Done"/>
                    <Bar dataKey="pending" stackId="a" fill="#f59e0b" name="Pending" radius={[4,4,0,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        },
        tableData: projectsWithProgress.filter(p=>p.taskProgress<100),
        tableColor: 'teal',
      },
    };

    const cfg = configs[modalType];
    if (!cfg) return null;

    const tableAccent = {
      gray:   'hover:border-gray-400',
      blue:   'hover:border-blue-400',
      purple: 'hover:border-purple-400',
      yellow: 'hover:border-yellow-400',
      red:    'hover:border-red-400',
      indigo: 'hover:border-indigo-400',
      teal:   'hover:border-teal-400',
    }[cfg.tableColor] || 'hover:border-blue-400';

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={()=>setModalType(null)}>
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700" onClick={e=>e.stopPropagation()}>
          <div className={`${cfg.headerColor} px-6 py-3 flex items-center justify-between flex-shrink-0`}>
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-white">{cfg.title}</h2>
              <span className="text-white/60 text-xs hidden sm:block">— {cfg.subtitle}</span>
            </div>
            <button onClick={()=>setModalType(null)} className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"><X className="w-4 h-4"/></button>
          </div>
          <div className="overflow-y-auto flex-1 p-6 space-y-5">
            <div className="grid grid-cols-4 gap-3">
              {cfg.summaryCards.map((c,i)=>(
                <div key={i} className={`${c.color} border rounded-xl p-3 text-center`}>
                  <p className="text-xs text-gray-500 font-medium mb-1">{c.label}</p>
                  <p className={`text-xl font-bold ${c.text}`}>{c.value}</p>
                </div>
              ))}
            </div>
            {cfg.charts()}
            {cfg.tableData.length > 0 && (
              <div>
                <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 mb-3">Project Details</h4>
                <div className="space-y-2">
                  {cfg.tableData.map((p,i) => {
                    const alloc=toNum(p.contractCost), spent=toNum(p.totalSpent), left=Math.max(alloc-spent,0), over=spent>alloc;
                    return (
                      <div key={p.projectId||i}
                        onClick={()=>{navigate(`/projects/${p.projectId}`);setModalType(null);}}
                        className={`flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700/40 cursor-pointer hover:shadow-md transition-all group ${tableAccent}`}>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-gray-800 dark:text-white truncate group-hover:text-blue-600 transition-colors">{p.name||'Unnamed'}</p>
                            <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold flex-shrink-0 ${statusBadgeClass(p.status)}`}>{p.status||'—'}</span>
                            {over && <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full flex-shrink-0">⚠️ Over</span>}
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full transition-all" style={{width:`${p.taskProgress}%`, background: p.taskProgress>=75?'#10b981':p.taskProgress>=40?'#3b82f6':'#ef4444'}}/>
                          </div>
                        </div>
                        <div className="flex gap-4 text-xs text-right flex-shrink-0">
                          <div><p className="text-gray-400">Progress</p><p className="font-bold text-gray-700 dark:text-gray-300">{p.taskProgress}%</p></div>
                          <div><p className="text-gray-400">Budget</p><p className="font-semibold text-gray-700 dark:text-gray-300">{formatBudget(alloc)}</p></div>
                          <div><p className="text-gray-400">Spent</p><p className={`font-semibold ${over?'text-red-600':'text-gray-700 dark:text-gray-300'}`}>{formatBudget(spent)}</p></div>
                          <div><p className="text-gray-400">Left</p><p className="font-semibold text-green-600">{formatBudget(left)}</p></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          <div className="border-t border-gray-200 dark:border-slate-700 px-4 py-3 flex items-center justify-between bg-gray-50 dark:bg-slate-800/50 flex-shrink-0">
            <p className="text-sm text-gray-500">{cfg.tableData.length} project{cfg.tableData.length!==1?'s':''} shown</p>
            <div className="flex gap-3">
              <button onClick={()=>{navigate('/projects');setModalType(null);}} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors">Go to Projects</button>
              <button onClick={()=>setModalType(null)} className="px-4 py-2 bg-gray-200 dark:bg-slate-600 hover:bg-gray-300 text-gray-700 dark:text-gray-300 text-sm font-semibold rounded-lg transition-colors">Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <Layout title="Dashboard">
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/>
          <p className="text-gray-600 dark:text-gray-400 font-medium">Loading dashboard...</p>
        </div>
      </div>
    </Layout>
  );

  return (
    <Layout title="Dashboard">
      <div className="flex flex-col gap-5 h-full">

        {/* ══ ROW 1 — Weather + Team Members ══════════════════════ */}
        <div className="grid grid-cols-2 gap-4 flex-shrink-0">

          {/* Weather */}
          <div className={`relative overflow-hidden rounded-xl shadow-md border border-white/20 p-6 text-white bg-gradient-to-br ${weather ? weather.bg : 'from-blue-500 to-sky-400'} transition-all duration-700`}>
            <div className="absolute -top-4 -right-4 text-9xl opacity-20 select-none pointer-events-none">
              {weatherLoading ? '🌡️' : (weather?.emoji || '🌡️')}
            </div>
            {weatherLoading ? (
              <div className="flex items-center gap-3 animate-pulse">
                <div className="w-12 h-12 bg-white/30 rounded-full"/>
                <div className="space-y-2">
                  <div className="h-4 bg-white/30 rounded w-28"/>
                  <div className="h-8 bg-white/30 rounded w-20"/>
                </div>
              </div>
            ) : weather ? (
              <>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-white/90 font-bold text-sm">Welcome</p>
                    <p className="text-white/80 text-sm font-medium mt-0.5">📍 {weather.city}</p>
                    <h2 className="text-white font-bold text-lg">{weather.label}</h2>
                  </div>
                  <span className="text-5xl">{weather.emoji}</span>
                </div>
                <div className="flex items-end gap-3 mb-3">
                  <p className="text-6xl font-extrabold tracking-tight leading-none">{weather.temp}°</p>
                  <div className="mb-1">
                    <p className="text-white/70 text-xs">Feels like</p>
                    <p className="text-white font-semibold">{weather.feelsLike}°C</p>
                  </div>
                </div>
                <div className="flex gap-5">
                  <div className="flex items-center gap-1.5">
                    <span>💧</span>
                    <div><p className="text-white/60 text-xs">Humidity</p><p className="text-white font-semibold text-sm">{weather.humidity}%</p></div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span>💨</span>
                    <div><p className="text-white/60 text-xs">Wind</p><p className="text-white font-semibold text-sm">{weather.windSpeed} km/h</p></div>
                  </div>
                  <button onClick={fetchWeather} className="ml-auto self-end text-white/60 hover:text-white transition-colors" title="Refresh"><RefreshCw className="w-4 h-4"/></button>
                </div>
              </>
            ) : (
              <div>
                <p className="text-white font-bold mb-2">Welcome</p>
                <p className="text-white/80 text-sm">Weather unavailable</p>
                <button onClick={fetchWeather} className="mt-2 text-sm underline text-white/70 hover:text-white">Retry</button>
              </div>
            )}
          </div>

          {/* Icons + Team Members */}
          <div className="flex flex-col gap-3 h-full">
            {/* Icon bar */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700/40 dark:to-slate-800/40 px-4 py-3 rounded-xl border border-gray-300 dark:border-slate-600/50 shadow-md flex justify-end items-center gap-2 flex-shrink-0">
              <button onClick={toggleTheme} className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:shadow transition-all" title="Toggle theme">
                {theme==='light' ? <Moon className="w-4 h-4"/> : <Sun className="w-4 h-4"/>}
              </button>
              <button onClick={()=>{}} className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:shadow transition-all" title="Notifications">
                <Bell className="w-4 h-4"/>
              </button>
              <button onClick={()=>setShowSettings(true)} className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-600 hover:shadow transition-all" title="Settings">
                <Settings className="w-4 h-4"/>
              </button>
              <button
                onClick={()=>{['token','userName','userEmail','userRole','userAvatar','userId','lastSelectedProjectId'].forEach(k=>localStorage.removeItem(k));navigate('/login');}}
                className="p-2 rounded-lg text-gray-500 dark:text-slate-400 hover:bg-red-100 dark:hover:bg-red-900/30 hover:text-red-600 transition-all" title="Logout">
                <LogOut className="w-4 h-4"/>
              </button>
            </div>
            {/* Team Members card */}
            <div onClick={()=>setShowUsersModal(true)}
              className="flex-1 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-slate-700/40 dark:to-slate-800/40 p-4 rounded-xl border border-gray-300 dark:border-slate-600/50 shadow-md flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Team Members</p>
              <p className="text-xs text-gray-400 dark:text-slate-500 mb-3">{pmUsers.length} user{pmUsers.length!==1?'s':''} registered</p>
              <div className="flex -space-x-3 justify-center">
                {pmUsers.slice(0,5).map((u,i) => (
                  u.avatar
                    ? <img key={u.userId||i} src={u.avatar} alt={u.name} title={`${u.name} — ${u.role}`} className="w-11 h-11 rounded-full object-cover border-2 border-white dark:border-slate-800 shadow-sm"/>
                    : <div key={u.userId||i} title={`${u.name} — ${u.role}`}
                        className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold border-2 border-white dark:border-slate-800 shadow-sm"
                        style={{background:`hsl(${(i*67+200)%360},60%,52%)`}}>
                        {(u.name||'?').split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
                      </div>
                ))}
                {pmUsers.length > 5 && (
                  <div className="w-11 h-11 rounded-full flex items-center justify-center bg-gray-400 dark:bg-slate-600 text-white text-xs font-bold border-2 border-white dark:border-slate-800">
                    +{pmUsers.length-5}
                  </div>
                )}
              </div>
              {pmUsers.length > 0 && <p className="mt-3 text-xs text-blue-500 dark:text-blue-400 font-medium">View all →</p>}
            </div>
          </div>
        </div>

        {/* ══ ROW 2 — Top 4 Stat Cards + Resource Chart ═══════════ */}
        <div className="grid grid-cols-2 gap-4 flex-1 min-h-0">
          <div className="grid grid-cols-2 gap-4 h-full">
            <div onClick={()=>setModalType('total')} className="cursor-pointer bg-gradient-to-br from-slate-100 to-gray-200 dark:from-slate-700/40 dark:to-slate-800/40 p-5 rounded-xl border border-gray-300 dark:border-slate-600/50 shadow-md transition-all hover:shadow-lg hover:scale-105">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-3">Total Projects</p>
              <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">{projects.length}</p>
              <p className="text-xs text-gray-500">Across all categories</p>
            </div>
            <div onClick={()=>setModalType('active')} className="cursor-pointer bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/20 p-5 rounded-xl border border-blue-200 dark:border-blue-700/50 shadow-md transition-all hover:shadow-lg hover:scale-105">
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">Active Projects</p>
              <p className="text-4xl font-bold text-blue-800 dark:text-blue-300 mb-1">{activeProjects}</p>
              <p className="text-xs text-blue-500">Currently in progress</p>
            </div>
            <div onClick={()=>setModalType('budget')} className="cursor-pointer bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/30 dark:to-emerald-900/20 p-5 rounded-xl border border-green-200 dark:border-green-700/50 shadow-md transition-all hover:shadow-lg hover:scale-105">
              <p className="text-sm font-medium text-green-600 dark:text-green-400 mb-3">Total Budget</p>
              <p className="text-2xl font-bold text-green-700 dark:text-green-300 mb-1 truncate">{formatBudget(totalBudget)}</p>
              <p className="text-xs text-green-500">Allocated • {formatBudget(totalSpent)} Spent</p>
            </div>
            <div onClick={()=>setModalType('completion')} className="cursor-pointer bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/20 p-5 rounded-xl border border-purple-200 dark:border-purple-700/50 shadow-md transition-all hover:shadow-lg hover:scale-105">
              <p className="text-sm font-medium text-purple-600 dark:text-purple-400 mb-3">Avg. Completion</p>
              <p className="text-4xl font-bold text-purple-800 dark:text-purple-300 mb-1">{avgCompletion}%</p>
              <p className="text-xs text-purple-500">Overall progress</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-gray-200 dark:border-slate-700 shadow-md flex flex-col h-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 dark:text-white">Resource allocation</h3>
              <p className="text-xs text-gray-500 dark:text-slate-400">Budget Spent vs. Remaining per Project</p>
            </div>
            {chartData.length === 0
              ? <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">No budget data available</div>
              : (
                <div className="flex-1 min-h-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{top:10, right:10, left:0, bottom:0}}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false}/>
                      <XAxis dataKey="name" stroke="#6b7280" tick={{fontSize:11}} axisLine={false} tickLine={false}/>
                      <YAxis stroke="#6b7280" tickFormatter={v=>formatBudget(v)} tick={{fontSize:10}} axisLine={false} tickLine={false} width={52}/>
                      <Tooltip content={<ResourceTooltip/>}/>
                      <Legend iconSize={10} wrapperStyle={{fontSize:11}}/>
                      <Bar dataKey="Spent"     stackId="a" fill="#3b82f6"/>
                      <Bar dataKey="Remaining" stackId="a" fill="#10b981" radius={[6,6,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )
            }
          </div>
        </div>

        {/* ══ ROW 3 — Bottom 4 Stat Cards ═════════════════════════ */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0">
          <div onClick={()=>setModalType('pending')} className="cursor-pointer bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/20 p-5 rounded-xl border border-yellow-200 dark:border-yellow-700/50 shadow-md transition-all hover:shadow-lg hover:scale-105">
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-3">Pending Projects</p>
            <p className="text-4xl font-bold text-yellow-800 dark:text-yellow-300 mb-1">{pendingProjects}</p>
            <p className="text-xs text-yellow-500">Not started yet</p>
          </div>
          <div onClick={()=>setModalType('overbudget')} className="cursor-pointer bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/20 p-5 rounded-xl border border-red-200 dark:border-red-700/50 shadow-md transition-all hover:shadow-lg hover:scale-105">
            <p className="text-sm font-medium text-red-600 dark:text-red-400 mb-3">Over Budget</p>
            <p className="text-4xl font-bold text-red-800 dark:text-red-300 mb-1">{overBudget}</p>
            <p className="text-xs text-red-500">Exceeding allocated budget</p>
          </div>
          <div onClick={()=>setModalType('atrisk')} className="cursor-pointer bg-gradient-to-br from-indigo-50 to-violet-50 dark:from-indigo-900/30 dark:to-violet-900/20 p-5 rounded-xl border border-indigo-200 dark:border-indigo-700/50 shadow-md transition-all hover:shadow-lg hover:scale-105">
            <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mb-3">At Risk</p>
            <p className="text-4xl font-bold text-indigo-800 dark:text-indigo-300 mb-1">{atRisk}</p>
            <p className="text-xs text-indigo-500">Behind schedule</p>
          </div>
          <div onClick={()=>setModalType('tasks')} className="cursor-pointer bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/20 p-5 rounded-xl border border-teal-200 dark:border-teal-700/50 shadow-md transition-all hover:shadow-lg hover:scale-105">
            <p className="text-sm font-medium text-teal-600 dark:text-teal-400 mb-3">Pending Tasks</p>
            <p className="text-4xl font-bold text-teal-800 dark:text-teal-300 mb-1">{pendingTasksCount}</p>
            <p className="text-xs text-teal-500">Need attention</p>
          </div>
        </div>

        {isRefreshing && (
          <div className="p-3 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 text-blue-800 dark:text-blue-300 rounded-lg text-sm flex items-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin"/> Updating project data...
          </div>
        )}

      </div>

      {/* Modals */}
      <UsersModal/>
      <SettingsModal isOpen={showSettings} onClose={()=>setShowSettings(false)}/>
      <BudgetPieModal/>
      <ChartModal/>
    </Layout>
  );
}

export default DashboardPage;