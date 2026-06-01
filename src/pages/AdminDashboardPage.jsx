import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Users, UserCheck, Shield } from 'lucide-react';
import AdminLayout from '../components/Layout/AdminLayout';
import UsersTable from '../components/Admin/UsersTable';
import UserCourseAssignmentsModal from '../components/Admin/UserCourseAssignmentsModal';
import SearchFilterBar from '../components/Common/SearchFilterBar';
import { useAuth } from '../auth/AuthContext';
import { supabase } from '../lib/supabaseClient';
import {
  filterUsersByDepartment,
  filterUsersBySearch,
  getUniqueDepartments,
} from '../utils/listFilters';

export default function AdminDashboardPage() {
  const { user, refreshProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState(null);
  const [assignmentsUser, setAssignmentsUser] = useState(null);
  const [editingDesignationId, setEditingDesignationId] = useState(null);
  const [savingDesignationId, setSavingDesignationId] = useState(null);
  const [editingDepartmentId, setEditingDepartmentId] = useState(null);
  const [savingDepartmentId, setSavingDepartmentId] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');

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

  const departmentOptions = useMemo(() => {
    const departments = getUniqueDepartments(users);
    const options = [{ value: '', label: 'All departments' }];
    departments.forEach((dept) => {
      options.push({ value: dept, label: dept });
    });
    if (users.some((u) => !u.department?.trim())) {
      options.push({ value: '__none__', label: 'No department' });
    }
    return options;
  }, [users]);

  const filteredUsers = useMemo(() => {
    let result = filterUsersBySearch(users, userSearch);
    result = filterUsersByDepartment(result, departmentFilter);
    return result;
  }, [users, userSearch, departmentFilter]);

  const hasUserFilters = userSearch.trim().length > 0 || departmentFilter.length > 0;

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

  const handleUpdateDepartment = async (userId, departmentValue) => {
    const trimmed = departmentValue.trim();
    setSavingDepartmentId(userId);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ department: trimmed || null })
        .eq('id', userId);

      if (updateError) throw updateError;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, department: trimmed || null } : u))
      );
      setEditingDepartmentId(null);
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to update department');
    } finally {
      setSavingDepartmentId(null);
    }
  };

  const handleUpdateDesignation = async (userId, designationValue) => {
    const trimmed = designationValue.trim();
    setSavingDesignationId(userId);
    setError('');

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ designation: trimmed || null })
        .eq('id', userId);

      if (updateError) throw updateError;

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, designation: trimmed || null } : u))
      );
      setEditingDesignationId(null);

      if (userId === user?.id) {
        await refreshProfile();
      }
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to update designation');
    } finally {
      setSavingDesignationId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="admin-page-header">
          <div>
            <h2>Admin Dashboard</h2>
            <p className="admin-page-subtitle">Manage users, assign courses, and track learning progress.</p>
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

          <SearchFilterBar
            searchValue={userSearch}
            onSearchChange={setUserSearch}
            searchPlaceholder="Search users by name, email, or department…"
            showFilter
            filterLabel="Department"
            filterValue={departmentFilter}
            onFilterChange={setDepartmentFilter}
            filterOptions={departmentOptions}
          />

          {hasUserFilters && !loading ? (
            <p className="search-results-meta">
              Showing {filteredUsers.length} of {users.length} users
            </p>
          ) : null}

          <UsersTable
            users={filteredUsers}
            loading={loading}
            currentUserId={user?.id}
            onToggleStatus={handleToggleStatus}
            onManageCourses={setAssignmentsUser}
            onUpdateDesignation={handleUpdateDesignation}
            onUpdateDepartment={handleUpdateDepartment}
            togglingId={togglingId}
            savingDesignationId={savingDesignationId}
            editingDesignationId={editingDesignationId}
            onStartEditDesignation={setEditingDesignationId}
            onCancelEditDesignation={() => setEditingDesignationId(null)}
            savingDepartmentId={savingDepartmentId}
            editingDepartmentId={editingDepartmentId}
            onStartEditDepartment={setEditingDepartmentId}
            onCancelEditDepartment={() => setEditingDepartmentId(null)}
            emptyMessage={
              hasUserFilters && users.length > 0
                ? 'No users match your search or department filter.'
                : 'No users found.'
            }
            highlightQuery={userSearch}
          />
        </section>
      </div>

      {assignmentsUser ? (
        <UserCourseAssignmentsModal
          user={assignmentsUser}
          adminId={user?.id}
          onClose={() => setAssignmentsUser(null)}
        />
      ) : null}
    </AdminLayout>
  );
}
