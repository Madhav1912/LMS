import React from 'react';
import { formatDate } from '../../utils/timeUtils';

function StatusBadge({ status }) {
  const isActive = status === 'active';
  return (
    <span className={`status-badge ${isActive ? 'status-active' : 'status-disabled'}`}>
      {isActive ? 'Active' : 'Disabled'}
    </span>
  );
}

function RoleBadge({ role }) {
  const isAdmin = role === 'admin';
  return (
    <span className={`role-badge ${isAdmin ? 'role-admin' : 'role-user'}`}>
      {isAdmin ? 'Admin' : 'User'}
    </span>
  );
}

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3, 4].map((row) => (
        <tr key={row} className="users-table-skeleton-row">
          <td><div className="skeleton-cell" /></td>
          <td><div className="skeleton-cell" /></td>
          <td><div className="skeleton-cell short" /></td>
          <td><div className="skeleton-cell short" /></td>
          <td><div className="skeleton-cell short" /></td>
          <td><div className="skeleton-cell short" /></td>
        </tr>
      ))}
    </>
  );
}

export default function UsersTable({
  users,
  loading,
  currentUserId,
  onToggleStatus,
  onManageCourses,
  togglingId,
}) {
  return (
    <div className="users-table-wrapper">
      <table className="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Joined</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows />
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={6} className="users-table-empty">
                No users found.
              </td>
            </tr>
          ) : (
            users.map((user) => {
              const isSelf = user.id === currentUserId;
              const isActive = user.status === 'active';
              const isUserRole = user.role === 'user';

              return (
                <tr key={user.id}>
                  <td className="users-table-name">{user.full_name || '—'}</td>
                  <td>{user.email || '—'}</td>
                  <td><RoleBadge role={user.role} /></td>
                  <td><StatusBadge status={user.status} /></td>
                  <td>{formatDate(user.created_at)}</td>
                  <td>
                    <div className="courses-table-actions">
                      {isUserRole && isActive ? (
                        <button
                          type="button"
                          className="users-table-action"
                          onClick={() => onManageCourses(user)}
                        >
                          Courses
                        </button>
                      ) : null}
                      {isSelf ? (
                        <span className="users-table-self">You</span>
                      ) : (
                        <button
                          type="button"
                          className={`users-table-action ${isActive ? 'danger' : 'success'}`}
                          disabled={togglingId === user.id}
                          onClick={() => onToggleStatus(user)}
                        >
                          {togglingId === user.id
                            ? 'Updating…'
                            : isActive
                              ? 'Disable'
                              : 'Enable'}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
