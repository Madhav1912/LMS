import React from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import DashboardAnalytics from '../components/Analytics/DashboardAnalytics';
import KanbanBoard from '../components/Board/KanbanBoard';
import { CourseProvider } from '../context/CourseContext';

export default function DashboardPage() {
  return (
    <CourseProvider>
      <DashboardLayout>
        <DashboardAnalytics />
        <KanbanBoard />
      </DashboardLayout>
    </CourseProvider>
  );
}

