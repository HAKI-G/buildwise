import { useState, useEffect } from 'react';
import { Search, FolderOpen, Calendar, User, MapPin, DollarSign, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import Card from '../components/common/Card';
import api from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

const statusColors = {
  'Planning': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  'In Progress': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  'On Hold': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
  'Completed': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  'Cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [filteredProjects, setFilteredProjects] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isLoading, setIsLoading] = useState(true);
  const [expandedProject, setExpandedProject] = useState(null);
  const notify = useNotification();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    let filtered = projects;

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(p =>
        p.name?.toLowerCase().includes(term) ||
        p.projectName?.toLowerCase().includes(term) ||
        p.location?.toLowerCase().includes(term) ||
        p.ownerName?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    setFilteredProjects(filtered);
  }, [searchTerm, statusFilter, projects]);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [projectsRes, usersRes] = await Promise.all([
        api.get('/projects'),
        api.get('/admin/users'),
      ]);

      const userMap = {};
      (usersRes.data || []).forEach(u => {
        userMap[u.userId] = u;
      });

      const enriched = (projectsRes.data || []).map(p => ({
        ...p,
        ownerName: userMap[p.userId]?.name || userMap[p.createdBy]?.name || 'Unknown',
        ownerEmail: userMap[p.userId]?.email || userMap[p.createdBy]?.email || '',
      }));

      setProjects(enriched);
      setFilteredProjects(enriched);
      setUsers(usersRes.data || []);
    } catch (err) {
      console.error('Error fetching projects:', err);
      notify.error('Failed to load projects');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    if (!amount && amount !== 0) return '—';
    return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
  };

  const allStatuses = ['All', 'Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled'];

  const statusCounts = allStatuses.reduce((acc, status) => {
    if (status === 'All') {
      acc[status] = projects.length;
    } else {
      acc[status] = projects.filter(p => p.status === status).length;
    }
    return acc;
  }, {});

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects Overview</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View all projects across the platform ({projects.length} total)
        </p>
      </div>

      {/* Status Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-4">
        {allStatuses.map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
              statusFilter === status
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {status} ({statusCounts[status] || 0})
          </button>
        ))}
      </div>

      <Card>
        {/* Search */}
        <div className="mb-6">
          <div className="relative w-full md:w-96">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
            <input
              type="text"
              placeholder="Search projects by name, location, or owner..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
            <p className="text-gray-600 dark:text-gray-400 mt-4">Loading projects...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="text-center py-12">
            <FolderOpen className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm || statusFilter !== 'All' ? 'No projects match your filters' : 'No projects found'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProjects.map((project) => {
              const isExpanded = expandedProject === (project.projectId || project.id);
              const progress = project.progress || 0;

              return (
                <div
                  key={project.projectId || project.id}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden hover:border-blue-300 dark:hover:border-blue-600 transition-colors"
                >
                  {/* Row Header */}
                  <button
                    onClick={() => setExpandedProject(isExpanded ? null : (project.projectId || project.id))}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-4 min-w-0 flex-1">
                      <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                        {(project.name || project.projectName || '?').charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                          {project.name || project.projectName}
                        </h3>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <User className="w-3 h-3" /> {project.ownerName}
                          </span>
                          {project.location && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {project.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      {/* Progress Bar */}
                      <div className="hidden sm:flex items-center gap-2 w-32">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-2 rounded-full bg-blue-500 transition-all"
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-8 text-right">{progress}%</span>
                      </div>

                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${statusColors[project.status] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                        {project.status || 'Unknown'}
                      </span>

                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-1">Details</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{project.description || 'No description'}</p>
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Timeline</p>
                          <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            {formatDate(project.startDate)} — {formatDate(project.endDate)}
                          </div>
                          {project.budget !== undefined && (
                            <div className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-gray-400" />
                              Budget: {formatCurrency(project.budget)}
                            </div>
                          )}
                        </div>
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Owner</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{project.ownerName}</p>
                          {project.ownerEmail && (
                            <a
                              href={`mailto:${project.ownerEmail}`}
                              className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {project.ownerEmail}
                            </a>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Created: {formatDate(project.createdAt)}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
};

export default Projects;
