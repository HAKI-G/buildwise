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

// ✅ FIX 1: Clean text for display (browser)
const cleanText = text =>
  (text || '')
    .replace(/&[a-zA-Z0-9#;]+/g, '')
    .replace(/[&×÷±§¶•‡†]/g, '')
    .replace(/([a-zA-Z]&)+/g, '')
    .replace(/(&[^&\s]{1,6})+/g, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^\s+|\s+$/gm, '')
    .trim();

// ✅ FIX 2: Clean text specifically for PDF - replaces ₱ with PHP, formats numbers
const cleanForPDF = text =>
  (text || '')
    .replace(/₱\s*/g, 'PHP ')
    .replace(/±\s*/g, 'PHP ')        // ✅ also fix already-corrupted ± symbol
    .replace(/`/g, '')               // ✅ remove backticks causing monospace font
    .replace(/[§¶‡†]/g, '')

// ✅ FIX 3: Format number with commas
const formatNumber = (numStr) => {
  const num = parseFloat((numStr || '').toString().replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return numStr;
  return num.toLocaleString('en-PH');
};

// ✅ FIX 4: Format financial line - handles "PHP 120000000" → "PHP 120,000,000"
const formatFinancialLine = (line) => {
  return cleanForPDF(line).replace(/(PHP\s*)([\d]+)/g, (match, prefix, num) => {
    return prefix + parseInt(num).toLocaleString('en-PH');
  });
};

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

    const parseAccomplishmentReport = (text) => {
        const sections = {};
        const sectionRegex = /---([A-Z_]+)---([\s\S]*?)(?=---[A-Z_]+---|$)/g;
        let match;
        while ((match = sectionRegex.exec(text)) !== null) {
            const sectionName = match[1];
            const content = cleanText(match[2].trim());
            sections[sectionName] = content;
        }
        return sections;
    };

    const renderReportHeader = (headerText) => {
        const lines = headerText.split('\n').filter(l => l.trim());
        return (
            <div className="mb-8 text-center border-t-4 border-b-4 border-yellow-600 py-6 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20">
                <h1 className="text-3xl font-bold text-yellow-900 dark:text-yellow-400 mb-2">
                    {lines[0] || 'Accomplishment Report'}
                </h1>
                {lines.slice(1).map((line, idx) => (
                    <p key={idx} className="text-base text-yellow-800 dark:text-yellow-300 font-semibold">
                        {line}
                    </p>
                ))}
            </div>
        );
    };

    const renderInfoSection = (infoText) => {
        const lines = infoText.split('\n').filter(l => l.trim());
        const details = lines.map(line => {
            const [label, ...rest] = line.split(':');
            return { label: label.trim(), value: rest.join(':').trim() };
        });
        return (
            <div className="mb-8 bg-white dark:bg-slate-800 border-l-4 border-yellow-600 p-6 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {details.map((item, idx) => (
                        <div key={idx}>
                            <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">{item.label}</p>
                            <p className="text-gray-800 dark:text-slate-300">{item.value}</p>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderAccomplishmentSection = (title, body) => {
        const isTable = body.includes('|');
        const isList = body.split('\n').some(l => l.trim().startsWith('-'));
        return (
            <div className="mb-8">
                <h2 className="text-2xl font-bold text-yellow-900 dark:text-yellow-500 mb-4 pb-3 border-b-2 border-yellow-400 dark:border-yellow-700">
                    {title}
                </h2>
                <div className="bg-white dark:bg-slate-800 p-6 rounded-lg">
                    {isTable ? renderTable(body) : isList ? (
                        <ul className="space-y-3">
                            {body.split('\n').filter(l => l.trim()).map((line, idx) => {
                                const cleanLine = line.trim().replace(/^[-•]\s*/, '');
                                return (
                                    <li key={idx} className="flex gap-3 text-gray-700 dark:text-slate-300">
                                        <span className="text-yellow-600 dark:text-yellow-500 font-bold">•</span>
                                        <span>{cleanLine}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    ) : (
                        <p className="text-gray-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{body}</p>
                    )}
                </div>
            </div>
        );
    };

    const renderFooter = (footerText) => (
        <div className="mt-12 pt-6 border-t-2 border-yellow-300 dark:border-yellow-700 text-center text-sm text-gray-600 dark:text-slate-400">
            <p>{footerText}</p>
        </div>
    );

    const renderTable = (tableText) => {
        const lines = tableText.split('\n').filter(line => line.trim());
        if (lines.length < 2) return <p className="text-gray-700 dark:text-slate-300">{tableText}</p>;
        let headerLine = null;
        let headerIndex = 0;
        for (let i = 0; i < lines.length; i++) {
            const cells = lines[i].split('|').map(c => c.trim()).filter(c => c);
            if (cells.length > 0 && !lines[i].includes('---')) {
                headerLine = cells;
                headerIndex = i;
                break;
            }
        }
        if (!headerLine) return <p className="text-gray-700 dark:text-slate-300">{tableText}</p>;
        const bodyLines = lines.slice(headerIndex + 1).filter(line => {
            const cleaned = line.replace(/[|\s-]/g, '');
            return cleaned.length > 0 && !line.includes('---');
        });
        const bodyRows = bodyLines.map(line => line.split('|').map(c => c.trim()).filter(c => c)).filter(row => row.length > 0);
        if (bodyRows.length === 0) return <p className="text-gray-700 dark:text-slate-300">{tableText}</p>;
        return (
            <div className="overflow-x-auto mb-6 border border-gray-300 dark:border-slate-600 rounded-lg">
                <table className="w-full border-collapse bg-white dark:bg-slate-800">
                    <thead>
                        <tr className="bg-yellow-100 dark:bg-yellow-900/30 border-b-2 border-yellow-400 dark:border-yellow-700">
                            {headerLine.map((header, idx) => (
                                <th key={idx} className="border-r border-gray-300 dark:border-slate-600 px-4 py-3 text-left text-sm font-bold text-yellow-900 dark:text-yellow-400">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {bodyRows.map((row, rowIdx) => (
                            <tr key={rowIdx} className="border-b border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700/30">
                                {row.map((cell, cellIdx) => (
                                    <td key={cellIdx} className="border-r border-gray-200 dark:border-slate-700 px-4 py-3 text-sm text-gray-800 dark:text-slate-300 last:border-r-0">{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    useEffect(() => {
        if (projectId) {
            fetchProject();
            fetchReports();
        }
    }, [projectId]);

    const fetchProject = async () => {
        const token = getToken();
        if (!token) { navigate('/login'); return; }
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            const response = await axios.get(`http://47.129.233.194/api/projects/${projectId}`, config);
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
            const response = await axios.get(`http://47.129.233.194/api/reports/project/${projectId}`, config);
            setReports(response.data || []);
        } catch (err) {
            console.error('Error fetching reports:', err);
        } finally {
            setLoadingReports(false);
        }
    };

    const handleGenerateReport = async () => {
        if (!projectId) { setError('Project ID is missing'); return; }
        setGenerating(true);
        setError('');
        try {
            const token = getToken();
            const config = { headers: { Authorization: `Bearer ${token}` }, timeout: 120000 };
            await axios.post(`http://47.129.233.194/api/reports/generate/${projectId}`, { reportType }, config);
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

    // ✅ FIXED PDF Download - proper font, ₱ → PHP, number formatting
    const handleDownloadPDF = (report) => {
        try {
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            const pageHeight = doc.internal.pageSize.getHeight();
            const margin = 15;
            const contentWidth = pageWidth - (margin * 2);
            let yPosition = margin;

            const checkAndAddPage = (requiredSpace) => {
                if (yPosition + requiredSpace > pageHeight - margin - 10) {
                    doc.addPage();
                    yPosition = margin;
                    return true;
                }
                return false;
            };

            const sections = parseAccomplishmentReport(report.generatedText);

            // ✅ HEADER
            checkAndAddPage(15);
            doc.setLineWidth(2);
            doc.setDrawColor(0, 0, 0);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 6;

            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(0, 0, 0);
            const titleLines = doc.splitTextToSize('Accomplishment Report For Construction Team', contentWidth);
            doc.text(titleLines, pageWidth / 2, yPosition, { align: 'center' });
            yPosition += (titleLines.length * 7);

            if (sections.HEADER) {
                const headerLines = sections.HEADER.split('\n').filter(l => l.trim());
                headerLines.slice(1).forEach(line => {
                    checkAndAddPage(6);
                    doc.setFontSize(10);
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(60, 60, 60);
                    const wrapped = doc.splitTextToSize(cleanForPDF(line), contentWidth);
                    doc.text(wrapped, pageWidth / 2, yPosition, { align: 'center' });
                    yPosition += (wrapped.length * 5);
                });
            }

            yPosition += 2;
            doc.setDrawColor(0, 0, 0);
            doc.line(margin, yPosition, pageWidth - margin, yPosition);
            yPosition += 8;

            // ✅ EMPLOYEE INFO - fixed two-column layout
            if (sections.EMPLOYEE_INFO) {
                checkAndAddPage(20);
                const infoLines = sections.EMPLOYEE_INFO.split('\n').filter(l => l.trim());
                const colWidth = contentWidth / 2;

                for (let i = 0; i < infoLines.length; i += 2) {
                    checkAndAddPage(10);
                    
                    // Left column
                    const leftLine = infoLines[i] || '';
                    const [leftLabel, ...leftRest] = leftLine.split(':');
                    const leftValue = cleanForPDF(leftRest.join(':').trim());

                    doc.setFontSize(9);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(0, 0, 0);
                    doc.text(cleanForPDF(leftLabel.trim()) + ':', margin, yPosition);

                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(50, 50, 50);
                    const leftWrapped = doc.splitTextToSize(leftValue, colWidth - 35);
                    doc.text(leftWrapped, margin + 30, yPosition);

                    // Right column
                    if (infoLines[i + 1]) {
                        const rightLine = infoLines[i + 1];
                        const [rightLabel, ...rightRest] = rightLine.split(':');
                        const rightValue = cleanForPDF(rightRest.join(':').trim());

                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(0, 0, 0);
                        doc.text(cleanForPDF(rightLabel.trim()) + ':', margin + colWidth, yPosition);

                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(50, 50, 50);
                        const rightWrapped = doc.splitTextToSize(rightValue, colWidth - 35);
                        doc.text(rightWrapped, margin + colWidth + 30, yPosition);
                    }

                    yPosition += 8;
                }
                yPosition += 4;
            }

            // ✅ Helper to render a section with title and lines
            const renderPDFSection = (title, content, isFinancial = false) => {
                checkAndAddPage(14);
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text(title, margin, yPosition);
                yPosition += 2;
                doc.setLineWidth(0.5);
                doc.setDrawColor(150, 150, 150);
                doc.line(margin, yPosition, pageWidth - margin, yPosition);
                yPosition += 5;

                const lines = content.trim().split('\n');
                lines.forEach(line => {
                    if (!line.trim()) return;
                    checkAndAddPage(6);

                    doc.setFontSize(10);
                    if (line.trim().endsWith(':')) {
                        doc.setFont('helvetica', 'bold');
                        doc.setTextColor(0, 0, 0);
                        doc.text(cleanForPDF(line.trim()), margin + 3, yPosition);
                        yPosition += 5;
                    } else {
                        doc.setFont('helvetica', 'normal');
                        doc.setTextColor(50, 50, 50);
                        // ✅ Format financial lines with proper number formatting
                        const rawLine = line.trim().replace(/^[-•]\s*/, '');
                        const formattedLine = isFinancial ? formatFinancialLine(rawLine) : cleanForPDF(rawLine);
                        const wrappedLines = doc.splitTextToSize(`• ${formattedLine}`, contentWidth - 8);
                        doc.text(wrappedLines, margin + 3, yPosition);
                        yPosition += (wrappedLines.length * 4.5) + 1;
                    }
                });
                yPosition += 4;
            };

            // ✅ INTRODUCTION
            if (sections.INTRODUCTION) {
                checkAndAddPage(14);
                doc.setFontSize(13);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(0, 0, 0);
                doc.text('Introduction', margin, yPosition);
                yPosition += 2;
                doc.setLineWidth(0.5);
                doc.setDrawColor(150, 150, 150);
                doc.line(margin, yPosition, pageWidth - margin, yPosition);
                yPosition += 5;

                doc.setFontSize(10);
                doc.setFont('helvetica', 'normal');
                doc.setTextColor(50, 50, 50);
                const introLines = doc.splitTextToSize(cleanForPDF(sections.INTRODUCTION.trim()), contentWidth);
                doc.text(introLines, margin, yPosition);
                yPosition += (introLines.length * 4.5) + 6;
            }

            // ✅ SECTIONS
            if (sections.KEY_ACCOMPLISHMENTS) renderPDFSection('Key Accomplishments', sections.KEY_ACCOMPLISHMENTS);
            if (sections.FINANCIAL_IMPACT) renderPDFSection('Financial Impact', sections.FINANCIAL_IMPACT, true); // ✅ isFinancial = true
            if (sections.IN_PROGRESS_TASKS) renderPDFSection('In-Progress Construction Activities', sections.IN_PROGRESS_TASKS);
            if (sections.SKILLS_AND_LEARNING) renderPDFSection('Team Development and Project Knowledge', sections.SKILLS_AND_LEARNING);

            // ✅ FOOTER on every page
            const pageCount = doc.internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(100, 100, 100);
                doc.setDrawColor(150, 150, 150);
                doc.setLineWidth(0.3);
                doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
                doc.text(
                    `Page ${i} of ${pageCount} | BuildWise Construction Management | ${new Date().toLocaleDateString()}`,
                    pageWidth / 2,
                    pageHeight - 8,
                    { align: 'center' }
                );
            }

            doc.save(`${report.projectName}_Accomplishment_Report_${new Date(report.createdAt).toISOString().split('T')[0]}.pdf`);
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
            await axios.delete(`http://47.129.233.194/api/reports/${reportId}`, config);
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
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2">Report Type</label>
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
                                    <><Loader className="w-5 h-5 animate-spin" />Generating with AI...</>
                                ) : (
                                    <><TrendingUp className="w-5 h-5" />Generate Report</>
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
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Reports Yet</h4>
                            <p className="text-gray-600 dark:text-slate-400">Generate your first AI report above!</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {reports.map(report => (
                                <div key={report.reportId} className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl p-5 hover:shadow-lg transition-all">
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <FileText className="w-5 h-5 text-blue-600" />
                                                <h4 className="font-semibold text-gray-900 dark:text-white capitalize">{report.reportType}</h4>
                                            </div>
                                            <div className="text-sm text-gray-500 dark:text-slate-400 space-y-1">
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4 inline" />
                                                    {new Date(report.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => handleViewReport(report)} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors" title="View Report">
                                                <Eye className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDownloadPDF(report)} className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors" title="Download PDF">
                                                <FileDown className="w-5 h-5" />
                                            </button>
                                            <button onClick={() => handleDelete(report.reportId)} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors" title="Delete">
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
                        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
                            <div className="bg-gradient-to-r from-yellow-600 via-yellow-700 to-yellow-900 rounded-t-2xl p-6">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h2 className="text-2xl font-bold text-white mb-1">Accomplishment Report</h2>
                                        <p className="text-yellow-100 text-sm">
                                            {selectedReport.projectName} • Generated: {new Date(selectedReport.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={() => handleDownloadPDF(selectedReport)} className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors" title="Download PDF">
                                            <FileDown className="w-5 h-5" />
                                        </button>
                                        <button onClick={() => setShowModal(false)} className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors">
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 max-h-[80vh] overflow-y-auto bg-white dark:bg-slate-800">
                                {(() => {
                                    const sections = parseAccomplishmentReport(selectedReport.generatedText);
                                    return (
                                        <div className="max-w-4xl">
                                            {sections.HEADER && renderReportHeader(sections.HEADER)}
                                            {sections.EMPLOYEE_INFO && renderInfoSection(sections.EMPLOYEE_INFO)}
                                            {sections.INTRODUCTION && (
                                                <div className="mb-8">
                                                    <h2 className="text-2xl font-bold text-yellow-900 dark:text-yellow-500 mb-4 pb-3 border-b-2 border-yellow-400 dark:border-yellow-700">Introduction</h2>
                                                    <p className="text-gray-700 dark:text-slate-300 leading-relaxed bg-white dark:bg-slate-800 p-6 rounded-lg">{sections.INTRODUCTION.trim()}</p>
                                                </div>
                                            )}
                                            {sections.KEY_ACCOMPLISHMENTS && renderAccomplishmentSection('Key Accomplishments', sections.KEY_ACCOMPLISHMENTS)}
                                            {sections.FINANCIAL_IMPACT && renderAccomplishmentSection('Financial Impact', sections.FINANCIAL_IMPACT)}
                                            {sections.IN_PROGRESS_TASKS && renderAccomplishmentSection('In-Progress Construction Activities', sections.IN_PROGRESS_TASKS)}
                                            {sections.SKILLS_AND_LEARNING && renderAccomplishmentSection('Team Development and Project Knowledge', sections.SKILLS_AND_LEARNING)}
                                            {sections.FOOTER && renderFooter(sections.FOOTER)}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </Layout>
    );
}

export default GenerateReportPage;