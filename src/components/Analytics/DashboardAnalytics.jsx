import React from 'react';
import { useCourses } from '../../context/CourseContext';
import { BookOpen, Clock, CheckCircle, Activity } from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { formatTime } from '../../utils/timeUtils';
import { computeLiveTimeMs } from '../../utils/enrollmentTimer';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);

export default function DashboardAnalytics() {
    const { courses } = useCourses();

    const totalModules = courses.length;
    const completedCourses = courses.filter(t => t.status === 'done');
    const activeCourses = courses.filter(t => t.status === 'in-progress');
    
    const completedCount = completedCourses.length;
    const activeCount = activeCourses.length;

    // Calculate total hours
    const totalTimeMs = courses.reduce((acc, t) => {
        const dbStatus = t.status === 'in-progress' ? 'in_progress' : t.status === 'done' ? 'completed' : 'assigned';
        return acc + computeLiveTimeMs({
            timeSpentMs: t.timeTracked,
            timerStartedAt: t.timerStartedAt,
            status: dbStatus,
        });
    }, 0);

    const pieData = {
        labels: ['Completed', 'In Progress', 'Available'],
        datasets: [
            {
                data: [
                    completedCount,
                    activeCount,
                    totalModules - completedCount - activeCount
                ],
                backgroundColor: ['#10b981', '#3b82f6', '#94a3b8'],
                borderWidth: 0,
            },
        ],
    };

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: 'bottom',
                labels: {
                    color: 'var(--text-secondary)'
                }
            }
        }
    };

    // Prepare Bar Chart: Time spent per completed course (top 5)
    const sortedCompleted = [...completedCourses].sort((a, b) => (b.timeTracked || 0) - (a.timeTracked || 0)).slice(0, 5);
    const barData = {
        labels: sortedCompleted.map(t => t.title.substring(0, 15) + '...'),
        datasets: [
            {
                label: 'Time Spent (minutes)',
                data: sortedCompleted.map(t => Math.round((t.timeTracked || 0) / 60000)),
                backgroundColor: '#3b82f6',
                borderRadius: 4,
            }
        ]
    };

    const barOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: { color: 'var(--text-secondary)' }
            },
            x: {
                grid: { display: false },
                ticks: { color: 'var(--text-secondary)' }
            }
        }
    };

    return (
        <div className="analytics-section">
            <div className="kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-info">
                        <h3>Total Courses</h3>
                        <div className="kpi-value">{totalModules}</div>
                    </div>
                    <div className="kpi-icon blue">
                        <BookOpen />
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-info">
                        <h3>Total Learning</h3>
                        <div className="kpi-value">{formatTime(totalTimeMs)}</div>
                    </div>
                    <div className="kpi-icon purple">
                        <Clock />
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-info">
                        <h3>Completed</h3>
                        <div className="kpi-value">{completedCount}</div>
                    </div>
                    <div className="kpi-icon green">
                        <CheckCircle />
                    </div>
                </div>
                <div className="kpi-card">
                    <div className="kpi-info">
                        <h3>Active Courses</h3>
                        <div className="kpi-value">{activeCount}</div>
                    </div>
                    <div className="kpi-icon amber">
                        <Activity />
                    </div>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-container">
                    <h3>Course Progress</h3>
                    <div style={{ height: '250px' }}>
                        <Pie data={pieData} options={pieOptions} />
                    </div>
                </div>
                <div className="chart-container">
                    <h3>Top Time Investments</h3>
                    {completedCount > 0 ? (
                        <div style={{ height: '250px' }}>
                            <Bar data={barData} options={barOptions} />
                        </div>
                    ) : (
                        <div style={{ height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                            Complete some courses to see time investments!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
