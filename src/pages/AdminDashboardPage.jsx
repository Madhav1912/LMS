import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, UserCheck, Shield } from 'lucide-react';
import AdminLayout from '../components/Layout/AdminLayout';
import UsersTable from '../components/Admin/UsersTable';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);

  const loadUsers = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const { data, error: rpcError } = await supabase.rpc('admin_get_users');
      if (rpcError) throw rpcError;
      setUsers(data ?? []);
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to load users');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (window.location.hash === '#users') {
      document.getElementById('users')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.status === 'active').length;
    const admins = users.filter((u) => u.role === 'admin').length;
    return { total, active, admins };
  }, [users]);

  const handleToggleStatus = async (targetUser) => {
    const nextStatus = targetUser.status === 'active' ? 'disabled' : 'active';
    setTogglingId(targetUser.id);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ status: nextStatus })
        .eq('id', targetUser.id);

      if (updateError) throw updateError;

      setUsers((prev) =>
        prev.map((u) => (u.id === targetUser.id ? { ...u, status: nextStatus } : u))
      );
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to update user status');
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h2>Admin Dashboard</h2>
            <p className="admin-page-subtitle">Manage users and monitor account activity.</p>
          </div>
        </div>

        <section className="admin-section" id="overview">
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-info">
                <h3>Total Users</h3>
                <div className="kpi-value">{loading ? '—' : stats.total}</div>
              </div>
              <div className="kpi-icon blue">
                <Users />
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-info">
                <h3>Active Users</h3>
                <div className="kpi-value">{loading ? '—' : stats.active}</div>
              </div>
              <div className="kpi-icon green">
                <UserCheck />
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-info">
                <h3>Admins</h3>
                <div className="kpi-value">{loading ? '—' : stats.admins}</div>
              </div>
              <div className="kpi-icon purple">
                <Shield />
              </div>
            </div>
          </div>
        </section>

        <section className="admin-section" id="users">
          <div className="admin-section-header">
            <h3>Users</h3>
            <button type="button" className="admin-refresh-btn" onClick={loadUsers} disabled={loading}>
              Refresh
            </button>
          </div>

          {error ? <div className="admin-error">{error}</div> : null}

          <UsersTable
            users={users}
            loading={loading}
            currentUserId={user?.id}
            onToggleStatus={handleToggleStatus}
            togglingId={togglingId}
          />
        </section>
      </div>
    </AdminLayout>
  );
}
