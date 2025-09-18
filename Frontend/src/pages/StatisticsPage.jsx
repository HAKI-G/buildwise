import React from 'react';
import Layout from '../components/Layout';

const ChartCard = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold mb-4">{title}</h3>
        {children}
    </div>
);

function StatisticsPage() {
    return (
        <Layout title="Statistics">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* --- CHART PLACEHOLDERS --- */}
                {/* To create real charts, you would use a library like Chart.js or Recharts */}
                {/* and place the chart components inside these cards. */}
                <ChartCard title="TASK STATUS">
                    <div className="bg-gray-200 h-64 flex items-center justify-center rounded-lg">
                        <p className="text-gray-500">Pie Chart Placeholder</p>
                    </div>
                </ChartCard>
                <ChartCard title="TASK PRIORITY">
                    <div className="bg-gray-200 h-64 flex items-center justify-center rounded-lg">
                        <p className="text-gray-500">Pie Chart Placeholder</p>
                    </div>
                </ChartCard>
                <ChartCard title="PENDING ITEMS">
                    <div className="bg-gray-200 h-64 flex items-center justify-center rounded-lg">
                        <p className="text-gray-500">Bar Chart Placeholder</p>
                    </div>
                </ChartCard>
                <ChartCard title="Budget - JUNE 2022">
                    <div className="bg-gray-200 h-64 flex items-center justify-center rounded-lg">
                        <p className="text-gray-500">Gantt Chart Placeholder</p>
                    </div>
                </ChartCard>
                <div className="lg:col-span-2">
                    <ChartCard title="Task Timeline">
                         <div className="bg-gray-200 h-80 flex items-center justify-center rounded-lg">
                            <p className="text-gray-500">Timeline/Gantt Chart Placeholder</p>
                        </div>
                    </ChartCard>
                </div>
            </div>
        </Layout>
    );
}

export default StatisticsPage;