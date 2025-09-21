import React from 'react';
import Layout from '../components/Layout';
// Import all the necessary components from the Recharts library
import { 
    PieChart, Pie, Cell, Tooltip, Legend, 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    ResponsiveContainer 
} from 'recharts';

// A reusable container for each chart on the page
const ChartCard = ({ title, children, className = '' }) => (
    <div className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm ${className}`}>
        <h2 className="text-xl font-bold text-center text-gray-700 mb-4">{title}</h2>
        {children}
    </div>
);

// --- Data for the Charts (Hardcoded to match your design) ---

const taskStatusData = [
  { name: 'TASK ASSIGNMENT', value: 25, color: '#4287f5' },
  { name: 'PROGRESS TRACKING', value: 10, color: '#1e3a8a' },
  { name: 'DEADLINE MANAGEMENT', value: 20, color: '#34d399' },
  { name: 'RESOURCE ALLOCATION', value: 30, color: '#059669' },
  { name: 'PERFORMANCE REVIEW', value: 15, color: '#d1d5db' },
];

const taskPriorityData = [
    { name: 'HIGH', value: 25, color: '#f97316' },
    { name: 'MEDIUM', value: 30, color: '#f59e0b' },
    { name: 'LOW', value: 20, color: '#84cc16' },
    { name: 'CRITICAL', value: 15, color: '#ef4444' },
    { name: 'ON HOLD', value: 10, color: '#6b7280' },
];

const pendingItemsData = [
  { year: '2021', items: 5 },
  { year: '2022', items: 8 },
  { year: '2023', items: 12 },
  { year: '2024', items: 15 },
];

const budgetData = [
    { name: 'Item 1', budget: [0, 20] },
    { name: 'Item 2', budget: [10, 35] },
    { name: 'Item 3', budget: [5, 45] },
];

// --- The Main Page Component ---

function StatisticsPage() {
    return (
        <Layout title="Statistics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                
                {/* TASK STATUS PIE CHART */}
                <ChartCard title="TASK STATUS">
                    <div className="flex flex-col md:flex-row items-center justify-center w-full h-full">
                        <div className="w-full md:w-1/2 h-64">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={taskStatusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                        {taskStatusData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full md:w-1/2 mt-6 md:mt-0 md:pl-6">
                            <ul className="space-y-2">
                                {taskStatusData.map((entry) => (
                                    <li key={entry.name} className="flex items-start">
                                        <div className="w-4 h-4 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: entry.color }}></div>
                                        <div className="ml-3"><p className="font-bold text-sm text-gray-800">{entry.name}</p></div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </ChartCard>

                {/* TASK PRIORITY PIE CHART */}
                <ChartCard title="TASK PRIORITY">
                     <div className="flex flex-col md:flex-row items-center justify-center w-full h-full">
                        <div className="w-full md:w-1/2 h-64">
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie data={taskPriorityData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ percent }) => `${(percent * 100).toFixed(0)}%`}>
                                        {taskPriorityData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                        <div className="w-full md:w-1/2 mt-6 md:mt-0 md:pl-6">
                            <ul className="space-y-2">
                                {taskPriorityData.map((entry) => (
                                    <li key={entry.name} className="flex items-start">
                                        <div className="w-4 h-4 rounded-full mt-1 flex-shrink-0" style={{ backgroundColor: entry.color }}></div>
                                        <div className="ml-3"><p className="font-bold text-sm text-gray-800">{entry.name}</p></div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </ChartCard>

                {/* PENDING ITEMS BAR CHART */}
                <ChartCard title="PENDING ITEMS">
                    <div className="w-full h-64">
                        <ResponsiveContainer>
                            <BarChart data={pendingItemsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="year" />
                                <YAxis />
                                <Tooltip />
                                <Bar dataKey="items" fill="#ec4899" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* BUDGET BAR CHART */}
                <ChartCard title="BUDGET - JUNE 2022">
                    <div className="w-full h-64">
                         <ResponsiveContainer>
                            <BarChart data={budgetData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                               <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" />
                                <YAxis dataKey="name" type="category" width={60} />
                                <Tooltip />
                                <Bar dataKey="budget" fill="#22c55e" />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </ChartCard>

                {/* TASK TIMELINE (Built with Tailwind CSS) */}
                <ChartCard title="Task Timeline" className="lg:col-span-2">
                    <div className="relative space-y-4 p-4">
                        {/* Background Lines for Months */}
                        <div className="absolute top-0 left-16 right-4 h-full grid grid-cols-5 gap-4">
                           {['Month 1', 'Month 2', 'Month 3', 'Month 4', 'Month 5'].map(month => (
                               <div key={month} className="text-center">
                                   <p className="font-semibold text-gray-600">{month}</p>
                                   <div className="h-full border-l border-gray-200 mt-2"></div>
                               </div>
                           ))}
                        </div>

                        {/* Timeline Items */}
                        <div className="relative pt-12 space-y-6">
                           <div className="flex items-center">
                               <div className="w-16 font-bold text-sm text-right pr-4">Task 1</div>
                               <div className="h-6 bg-cyan-400 rounded-full" style={{ width: '30%', marginLeft: '5%' }}></div>
                           </div>
                           <div className="flex items-center">
                               <div className="w-16 font-bold text-sm text-right pr-4">Task 2</div>
                               <div className="h-6 bg-cyan-400 rounded-full" style={{ width: '25%', marginLeft: '20%' }}></div>
                           </div>
                           <div className="flex items-center">
                               <div className="w-16 font-bold text-sm text-right pr-4">Task 3</div>
                               <div className="h-6 bg-cyan-400 rounded-full" style={{ width: '35%', marginLeft: '30%' }}></div>
                           </div>
                           <div className="flex items-center">
                               <div className="w-16 font-bold text-sm text-right pr-4">Task 4</div>
                               <div className="h-6 bg-cyan-400 rounded-full" style={{ width: '20%', marginLeft: '50%' }}></div>
                           </div>
                           <div className="flex items-center">
                               <div className="w-16 font-bold text-sm text-right pr-4">Task 5</div>
                               <div className="h-6 bg-cyan-400 rounded-full" style={{ width: '40%', marginLeft: '55%' }}></div>
                           </div>
                        </div>
                    </div>
                </ChartCard>
            </div>
        </Layout>
    );
}

export default StatisticsPage;