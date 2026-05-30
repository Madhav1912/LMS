import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from './AuthContext';
import AppLoading from '../components/Layout/AppLoading';

export default function AdminRoute() {
  const { user, isAdmin, loading, profileLoaded } = useAuth();

  if (loading || (user && !profileLoaded)) return <AppLoading />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}
