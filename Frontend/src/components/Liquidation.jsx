import React, { useRef } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Liquidation = ({ 
    expenses = [], 
    categories = [],
    projectName = "Construction Project",
    projectLocation = ""
}) => {
    const reportRef = useRef(null);

    // Calculate total expenses
    const totalExpenses = expenses.reduce((sum, expense) => 
        sum + parseFloat(expense.amount || 0), 0
    );

    // Group expenses by category
    const groupedExpenses = expenses.reduce((acc, expense) => {
        const category = expense.category || 'Others';
        if (!acc[category]) {
            acc[category] = [];
        }
        acc[category].push(expense);
        return acc;
    }, {});

    // Calculate category total
    const getCategoryTotal = (category) => {
        return (groupedExpenses[category] || []).reduce(
            (sum, exp) => sum + parseFloat(exp.amount || 0), 0
        );
    };

    // Print function with proper handling
    const printLiquidation = () => {
        // Store original display styles
        const body = document.body;
        const originalStyle = body.style.cssText;
        
        // Hide sidebar and header
        const layout = document.querySelector('[class*="layout"]');
        const sidebar = document.querySelector('[class*="sidebar"]');
        const header = document.querySelector('[class*="header"]');
        
        // Set print mode
        body.style.margin = '0';
        body.style.padding = '0';
        body.style.backgroundColor = 'white';
        body.style.color = 'black';
        
        if (layout) layout.style.display = 'none';
        if (sidebar) sidebar.style.display = 'none';
        if (header) header.style.display = 'none';
        
        // Trigger print
        setTimeout(() => {
            window.print();
            
            // Restore original styles after print dialog closes
            setTimeout(() => {
                body.style.cssText = originalStyle;
                if (layout) layout.style.display = '';
                if (sidebar) sidebar.style.display = '';
                if (header) header.style.display = '';
            }, 100);
        }, 100);
    };

    // Download as PDF
    const downloadPDF = async () => {
        if (!reportRef.current) return;

        try {
            // Create canvas from HTML
            const canvas = await html2canvas(reportRef.current, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            });

            // Calculate PDF dimensions
            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 210; // A4 width in mm
            const pageHeight = 295; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;
            let position = 0;

            // Add image to PDF
            pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Add additional pages if needed
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            // Download PDF
            const filename = `Liquidation_Report_${projectName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
            pdf.save(filename);
        } catch (error) {
            console.error('Error generating PDF:', error);
            alert('Failed to generate PDF. Please try again.');
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm">
            {/* Action Buttons */}
            <div className="flex gap-4 mb-6 no-print">
                <button
                    onClick={downloadPDF}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition flex items-center gap-2"
                >
                    📥 Download PDF
                </button>
            </div>

            {/* Header */}
            <div 
                ref={reportRef}
                className="bg-white text-gray-900 p-8"
            >
            <div className="text-center mb-8 border-b-2 border-gray-800 dark:border-slate-300 pb-4">
                <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                    CONSTRUCTION PROJECT LIQUIDATION REPORT
                </h1>
                <h2 className="text-xl font-semibold text-gray-700 dark:text-slate-300 mb-2">
                    {projectName}
                </h2>
                {projectLocation && (
                    <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">
                        Project Location: {projectLocation}
                    </p>
                )}
                <p className="text-sm text-gray-600 dark:text-slate-400">
                    Date of Submission: {new Date().toLocaleDateString('en-US', { 
                        month: 'long', 
                        day: 'numeric', 
                        year: 'numeric' 
                    })}
                </p>
                <p className="text-sm text-gray-600 dark:text-slate-400">
                    Total Amount: ₱{totalExpenses.toLocaleString(undefined, { 
                        minimumFractionDigits: 2 
                    })}
                </p>
            </div>

            {expenses.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-slate-400">
                    <p className="text-lg mb-2">No expenses to liquidate yet.</p>
                    <p className="text-sm">Add expenses to generate the liquidation report.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Summary Table */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                            EXPENSE SUMMARY
                        </h3>
                        <table className="w-full border-collapse border-2 border-gray-400 dark:border-slate-600">
                            <thead>
                                <tr className="bg-gray-200 dark:bg-slate-700">
                                    <th className="border border-gray-400 dark:border-slate-600 px-4 py-3 text-left text-sm font-bold text-gray-900 dark:text-white">
                                        Category
                                    </th>
                                    <th className="border border-gray-400 dark:border-slate-600 px-4 py-3 text-right text-sm font-bold text-gray-900 dark:text-white">
                                        Total Amount
                                    </th>
                                    <th className="border border-gray-400 dark:border-slate-600 px-4 py-3 text-right text-sm font-bold text-gray-900 dark:text-white">
                                        Percentage
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {categories.map((category, idx) => {
                                    const categoryExpenses = groupedExpenses[category];
                                    if (!categoryExpenses || categoryExpenses.length === 0) return null;
                                    
                                    const categoryTotal = getCategoryTotal(category);
                                    const percentage = (categoryTotal / totalExpenses) * 100;

                                    return (
                                        <tr key={category} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                            <td className="border border-gray-400 dark:border-slate-600 px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                                                {String.fromCharCode(65 + idx)}. {category}
                                            </td>
                                            <td className="border border-gray-400 dark:border-slate-600 px-4 py-2 text-sm text-right font-semibold text-gray-900 dark:text-white">
                                                ₱ {categoryTotal.toLocaleString(undefined, { 
                                                    minimumFractionDigits: 2, 
                                                    maximumFractionDigits: 2 
                                                })}
                                            </td>
                                            <td className="border border-gray-400 dark:border-slate-600 px-4 py-2 text-sm text-right text-gray-700 dark:text-slate-300">
                                                {percentage.toFixed(1)}%
                                            </td>
                                        </tr>
                                    );
                                })}
                                <tr className="bg-yellow-100 dark:bg-yellow-900/30 font-bold">
                                    <td className="border border-gray-400 dark:border-slate-600 px-4 py-3 text-sm text-gray-900 dark:text-white">
                                        TOTAL
                                    </td>
                                    <td className="border border-gray-400 dark:border-slate-600 px-4 py-3 text-base text-right text-blue-600 dark:text-blue-400">
                                        ₱ {totalExpenses.toLocaleString(undefined, { 
                                            minimumFractionDigits: 2, 
                                            maximumFractionDigits: 2 
                                        })}
                                    </td>
                                    <td className="border border-gray-400 dark:border-slate-600 px-4 py-3 text-sm text-right text-gray-900 dark:text-white">
                                        100%
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Detailed Breakdown by Category */}
                    <div className="mb-8">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">
                            DETAILED EXPENSE BREAKDOWN
                        </h3>
                        
                        {categories.map((category, catIndex) => {
                            const categoryExpenses = groupedExpenses[category];
                            if (!categoryExpenses || categoryExpenses.length === 0) return null;

                            return (
                                <div key={category} className="mb-6 break-inside-avoid">
                                    {/* Category Header */}
                                    <div className="bg-gray-200 dark:bg-slate-700 px-4 py-2 mb-2">
                                        <h4 className="font-bold text-sm text-gray-900 dark:text-white">
                                            {String.fromCharCode(65 + catIndex)}. {category}
                                        </h4>
                                    </div>
                                    
                                    {/* Category Table */}
                                    <table className="w-full border-collapse border border-gray-400 dark:border-slate-600 mb-4">
                                        <thead>
                                            <tr className="bg-gray-100 dark:bg-slate-800">
                                                <th className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-slate-300">
                                                    Date
                                                </th>
                                                <th className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-slate-300">
                                                    Particulars
                                                </th>
                                                <th className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-right text-xs font-semibold text-gray-700 dark:text-slate-300">
                                                    Amount
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {categoryExpenses.map((expense, idx) => {
                                                // Parse description to show individual items
                                                const descriptionLines = expense.description ? expense.description.split('\n').filter(line => line.trim()) : [];
                                                
                                                return (
                                                    <React.Fragment key={idx}>
                                                        {descriptionLines.length > 0 ? (
                                                            descriptionLines.map((item, lineIdx) => (
                                                                <tr key={`${idx}-${lineIdx}`} className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                                    <td className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-xs text-gray-900 dark:text-white">
                                                        {lineIdx === 0 && (
                                                            expense.date ? new Date(expense.date).toLocaleDateString('en-US', { 
                                                                month: 'short', 
                                                                day: 'numeric',
                                                                year: 'numeric'
                                                            }) : 'N/A'
                                                        )}
                                                    </td>
                                                    <td className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-sm text-gray-900 dark:text-white">
                                                        {item}
                                                    </td>
                                                    <td className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-sm text-right font-medium text-gray-900 dark:text-white">
                                                        {lineIdx === 0 && (
                                                            `₱ ${parseFloat(expense.amount).toLocaleString(undefined, { 
                                                                minimumFractionDigits: 2, 
                                                                maximumFractionDigits: 2 
                                                            })}`
                                                        )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr className="hover:bg-gray-50 dark:hover:bg-slate-700/50">
                                                <td className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-xs text-gray-900 dark:text-white">
                                                    {expense.date ? new Date(expense.date).toLocaleDateString('en-US', { 
                                                        month: 'short', 
                                                        day: 'numeric',
                                                        year: 'numeric'
                                                    }) : 'N/A'}
                                                </td>
                                                <td className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-sm text-gray-900 dark:text-white">
                                                    {expense.description}
                                                </td>
                                                <td className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-sm text-right font-medium text-gray-900 dark:text-white">
                                                    ₱ {parseFloat(expense.amount).toLocaleString(undefined, { 
                                                        minimumFractionDigits: 2, 
                                                        maximumFractionDigits: 2 
                                                    })}
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                                            {/* Subtotal Row */}
                                            <tr className="bg-gray-100 dark:bg-slate-800 font-bold">
                                                <td colSpan="2" className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-sm text-right text-gray-900 dark:text-white">
                                                    Sub Total:
                                                </td>
                                                <td className="border border-gray-400 dark:border-slate-600 px-3 py-2 text-sm text-right text-blue-600 dark:text-blue-400">
                                                    ₱ {getCategoryTotal(category).toLocaleString(undefined, { 
                                                        minimumFractionDigits: 2, 
                                                        maximumFractionDigits: 2 
                                                    })}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}
                    </div>

                    {/* Grand Total */}
                    <div className="mt-8 border-t-4 border-gray-900 dark:border-slate-300 pt-4 break-inside-avoid">
                        <table className="w-full">
                            <tbody>
                                <tr className="bg-yellow-100 dark:bg-yellow-900/30">
                                    <td className="px-4 py-4 text-right text-lg font-bold text-gray-900 dark:text-white">
                                        GRAND TOTAL:
                                    </td>
                                    <td className="px-4 py-4 text-right text-2xl font-bold text-blue-600 dark:text-blue-400" style={{ width: '220px' }}>
                                        ₱ {totalExpenses.toLocaleString(undefined, { 
                                            minimumFractionDigits: 2, 
                                            maximumFractionDigits: 2 
                                        })}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    {/* Signature Section */}
                    <div className="mt-16 grid grid-cols-2 gap-8 break-inside-avoid">
                        <div className="text-center">
                            <div className="border-t-2 border-gray-800 dark:border-slate-300 pt-2 mt-16">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Prepared by</p>
                                <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">Project Manager</p>
                            </div>
                        </div>
                        <div className="text-center">
                            <div className="border-t-2 border-gray-800 dark:border-slate-300 pt-2 mt-16">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Approved by</p>
                                <p className="text-xs text-gray-600 dark:text-slate-400 mt-1">Vice President</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            </div>

            {/* Print Styles */}
            <style jsx>{`
                @media print {
                    * {
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    
                    body, html {
                        margin: 0 !important;
                        padding: 0 !important;
                        width: 100% !important;
                        height: 100% !important;
                    }
                    
                    .no-print {
                        display: none !important;
                    }
                    
                    [class*="sidebar"],
                    [class*="Sidebar"],
                    [class*="layout"],
                    [class*="Layout"],
                    [class*="header"],
                    [class*="Header"],
                    [class*="nav"],
                    [class*="Nav"] {
                        display: none !important;
                    }
                    
                    .break-inside-avoid {
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                    
                    table {
                        border-collapse: collapse;
                    }
                    
                    tr {
                        page-break-inside: avoid;
                    }
                }
            `}</style>
        </div>
    );
};

export default Liquidation;