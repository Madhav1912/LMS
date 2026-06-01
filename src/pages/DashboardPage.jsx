import React from 'react';
import DashboardLayout from '../components/Layout/DashboardLayout';
import { CourseProvider } from '../context/CourseContext';
import UserDashboardContent from './UserDashboardContent';

export default function DashboardPage() {
  return (
    <CourseProvider>
      <DashboardLayout>
        <UserDashboardContent />
      </DashboardLayout>
    </CourseProvider>
  );
}

