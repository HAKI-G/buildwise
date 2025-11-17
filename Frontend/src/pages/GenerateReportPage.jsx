import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import jsPDF from 'jspdf';
import Layout from '../components/Layout.jsx';
import { 
    Sparkles, 
    MapPin, 
    Calendar, 
    Loader, 
    FileText,
    Trash2,
    AlertCircle,
    TrendingUp,
    Eye,
    X,
    FileDown
} from 'lucide-react';

const getToken = () => localStorage.getItem('token');

// Utility to clean gibberish from AI text results
const cleanText = text =>
  (text || '')
    .replace(/&[a-z]{1,20}&/gi, ' ')
    .replace(/&[a-z0-9]+/gi, ' ')
    .replace(/[&]{2,}/g, ' ')
    .replace(/[#=]+/g, ' ')
    .replace(/(\s?[a-zA-Z0-9]\s?&)+/g, ' ')
    .replace(/&/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();

function GenerateReportPage() {
    const { projectId } = useParams();
    const navigate = useNavigate();
    const [project, setProject] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [generating, setGenerating] = useState(false);
    const [reportType, setReportType] = useState('Daily Progress');
    const [reports, setReports] = useState([]);
    const [loadingReports, setLoadingReports] = useState(false);
    const [selectedReport, setSelectedReport] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => {
        if (projectId) {
            fetchProject();
            fetchReports();
        }
    }, [projectId]);

    const fetchProject = async () => {
        const token = getToken();
        if (!token) {
            navigate('/login');
            return;
        }
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`http://localhost:5001/api/projects/${projectId}`, config);
            setProject(response.data);
        } catch (error) {
            console.error('Error fetching project:', error);
            setError('Failed to load project');
        } finally {
            setLoading(false);
        }
    };

    const fetchReports = async () => {
        setLoadingReports(true);
        try {
            const token = getToken();
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(
                `http://localhost:5001/api/reports/project/${projectId}`,
                config
            );
            setReports(response.data || []);
        } catch (err) {
            console.error('Error fetching reports:', err);
        } finally {
            setLoadingReports(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!projectId) {
            setError('Project ID is missing');
            return;
        }
        setGenerating(true);
        setError('');
        try {
            const token = getToken();
            const config = { 
                headers: { Authorization: `Bearer ${token}` },
                timeout: 120000
            };
            await axios.post(
                `http://localhost:5001/api/reports/generate/${projectId}`,
                { reportType },
                config
            );
            alert('✅ Report generated successfully!');
            await fetchReports();
        } catch (err) {
            console.error('Error generating report:', err);
            setError(err.response?.data?.message || 'Failed to generate report');
        } finally {
            setGenerating(false);
        }
    };

    const handleViewReport = (report) => {
        setSelectedReport(report);
        setShowModal(true);
    };

    // PDF Download (uses cleaned text)
    const handleDownloadPDF = (report) => {
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);
            let yPosition = margin;

            const checkAndAddPage = (requiredSpace) => {
                if (yPosition + requiredSpace > pageHeight - margin) {
                    doc.addPage();
                    yPosition = margin;
                    return true;
                }
                return false;
            };

            // Header
            doc.setFillColor(37, 99, 235);
            doc.rect(0, 0, pageWidth, 40, 'F');
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(20);
            doc.setFont('helvetica', 'bold');
            doc.text('BuildWise Construction Report', margin, 18);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'normal');
            doc.text(`${report.projectName}`, margin, 28);
            doc.text(`${report.reportType.toUpperCase()}`, margin, 35);
            yPosition = 50;

            // Report Info
            doc.setTextColor(0, 0, 0);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'normal');
            doc.text(`Generated: ${new Date(report.createdAt).toLocaleString()}`, margin, yPosition);
            yPosition += 10;

            // Report Content
            checkAndAddPage(15);
            doc.setFontSize(12);
            doc.setFont('helvetica', 'bold');
            doc.text('Report Content', margin, yPosition);
            yPosition += 8;

            const reportText = cleanText(report.generatedText || 'No content available');
            const lines = reportText.split('\n');
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);

            lines.forEach(line => {
                if (!line.trim()) {
                    yPosition += 3;
                    return;
                }
                checkAndAddPage(6);
                const splitText = doc.splitTextToSize(line, contentWidth);
                doc.text(splitText, margin, yPosition);
                yPosition += splitText.length * 5;
            });

            // Footer
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(128, 128, 128);
                doc.text(
                    `Page ${i} of ${pageCount} | BuildWise AI Report | ${new Date().toLocaleDateString()}`,
                    pageWidth / 2,
                    pageHeight - 10,
                    { align: 'center' }
                );
            }

            doc.save(`${report.projectName}_${report.reportType}_${new Date(report.createdAt).toISOString().split('T')[0]}.pdf`);
            alert('✅ PDF downloaded successfully!');
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('❌ Failed to generate PDF: ' + error.message);
        }
    };

    const handleDelete = async (reportId) => {
        if (!window.confirm('Are you sure you want to delete this report?')) return;
        try {
            const token = getToken();
            const config = { headers: { Authorization: `Bearer ${token}` } };
            await axios.delete(`http://localhost:5001/api/reports/${reportId}`, config);
            setReports(reports.filter(r => r.reportId !== reportId));
            if (selectedReport?.reportId === reportId) {
                setShowModal(false);
                setSelectedReport(null);
            }
            alert('✅ Report deleted successfully');
        } catch (err) {
            console.error('Error deleting report:', err);
            alert('❌ Failed to delete report');
        }
    };

    if (loading) {
        return (
            <Layout title="Loading...">
                <div className="flex items-center justify-center h-64">
                    <Loader className="w-8 h-8 animate-spin text-blue-600" />
                </div>
            </Layout>
        );
    }

    return (
        <Layout title={`Generate Report - ${project?.name || 'Project'}`}>
            <div className="space-y-6">
                {/* Project Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-3 mb-2">
                        <Sparkles className="w-7 h-7" />
                        <h2 className="text-2xl font-bold">{project?.name}</h2>
                    </div>
                    <div className="flex flex-wrap gap-4 text-blue-100 text-sm">
                        {project?.location && (
                            <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {project.location}
                            </div>
                        )}
                        {project?.contractCost && (
                            <span>₱{parseFloat(project.contractCost).toLocaleString()}</span>
                        )}
                    </div>
                </div>

                {/* Generate Report Section */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
                    <div className="flex items-start gap-4 mb-4">
                        <div className="p-3 bg-blue-600 rounded-lg">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
                                AI-Powered Report Generation
                            </h3>
                            {/* <p className="text-sm text-gray-600 dark:text-slate-400">
                                Generate comprehensive construction reports using Claude AI with ALL project data
                            </p> */}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">
                                Report Type
                            </label>
                            <select
                                value={reportType}
                                onChange={(e) => setReportType(e.target.value)}
                                disabled={generating}
                                className="w-full px-4 py-2.5 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                            >
                                <option value="Daily Progress">Daily Progress Report</option>
                                <option value="Weekly Summary">Weekly Summary Report</option>
                                <option value="Monthly Report">Monthly Comprehensive Report</option>
                                <option value="Final Report">Final Project Report</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={handleGenerateReport}
                                disabled={generating}
                                className="w-full px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg transition-colors"
                            >
                                {generating ? (
                                    <>
                                        <Loader className="w-5 h-5 animate-spin" />
                                        Generating with AI...
                                    </>
                                ) : (
                                    <>
                                        <TrendingUp className="w-5 h-5" />
                                        Generate Report
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                        </div>
                    )}
                    {generating && (
                        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                🤖 Claude AI is analyzing milestones, updates, photos, expenses, comments, and documents. This may take 30-60 seconds...
                            </p>
                        </div>
                    )}
                </div>

                {/* Reports List */}
                <div>
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-6 h-6 text-blue-600" />
                            Generated Reports ({reports.length})
                        </h3>
                    </div>
                    {loadingReports ? (
                        <div className="flex justify-center py-8">
                            <Loader className="w-8 h-8 animate-spin text-blue-600" />
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="text-center py-16 bg-white dark:bg-slate-800 rounded-xl border-2 border-dashed border-gray-300 dark:border-slate-700">
                            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                                No Reports Yet
                            </h4>
                            <p className="text-gray-600 dark:text-slate-400">
                                Generate your first AI report above!
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reports.map(report => (
                                <div
                                    key={report.reportId}
                                    className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-lg transition-all"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <FileText className="w-5 h-5 text-blue-600" />
                                                <h4 className="font-semibold text-gray-900 dark:text-white capitalize">
                                                    {report.reportType}
                                                </h4>
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-slate-400 space-y-1">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4 inline" />
                                                    {new Date(report.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => handleViewReport(report)}
                                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                title="View Report"
                                            >
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDownloadPDF(report)}
                                                className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors"
                                                title="Download PDF"
                                            >
                                                <FileDown className="w-5 h-5" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(report.reportId)}
                                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* View Report Modal */}
            {showModal && selectedReport && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50" onClick={() => setShowModal(false)}>
                    <div className="min-h-screen px-4 py-8 flex items-start justify-center">
                        <div 
                            className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Modal Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-t-2xl p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white capitalize mb-2">
                                            {selectedReport.reportType}
                                        </h2>
                                        <p className="text-blue-100 text-sm">
                                            Generated: {new Date(selectedReport.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleDownloadPDF(selectedReport)}
                                            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                                            title="Download PDF"
                                        >
                                            <FileDown className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => setShowModal(false)}
                                            className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            {/* Modal Content */}
                            <div className="p-8 max-h-[70vh] overflow-y-auto">
                                <div className="prose prose-lg max-w-none">
                                    <div className="whitespace-pre-wrap text-gray-800 dark:text-slate-200 leading-relaxed">
                                        {cleanText(selectedReport.generatedText || '')}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default GenerateReportPage;
