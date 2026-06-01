import React, { useEffect, useState } from 'react';
import { formatDate } from '../../utils/timeUtils';
import HighlightText from '../Common/HighlightText';

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

function InlineEditCell({
  userId,
  value,
  editingId,
  savingId,
  placeholder,
  highlightQuery,
  onStartEdit,
  onSave,
  onCancel,
}) {
  const isEditing = editingId === userId;
  const isSaving = savingId === userId;
  const [draft, setDraft] = useState(value ?? '');

  useEffect(() => {
    if (isEditing) {
      setDraft(value ?? '');
    }
  }, [isEditing, value]);

  if (isEditing) {
    return (
      <div className="designation-edit-cell">
        <input
          type="text"
          className="designation-edit-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={placeholder}
          disabled={isSaving}
          autoFocus
        />
        <div className="designation-edit-actions">
          <button
            type="button"
            className="users-table-action success"
            disabled={isSaving}
            onClick={() => onSave(userId, draft)}
          >
            {isSaving ? 'Saving…' : 'Save'}
          </button>
          <button
            type="button"
            className="users-table-action"
            disabled={isSaving}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="designation-display-cell">
      <span className="designation-text">
        {value ? (
          <HighlightText text={value} query={highlightQuery} />
        ) : (
          '—'
        )}
      </span>
      <button
        type="button"
        className="users-table-action designation-edit-btn"
        onClick={() => onStartEdit(userId)}
      >
        Edit
      </button>
    </div>
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
  onUpdateDesignation,
  onUpdateDepartment,
  togglingId,
  savingDesignationId,
  editingDesignationId,
  onStartEditDesignation,
  onCancelEditDesignation,
  savingDepartmentId,
  editingDepartmentId,
  onStartEditDepartment,
  onCancelEditDepartment,
  emptyMessage = 'No users found.',
  highlightQuery = '',
}) {
  return (
    <div className="users-table-wrapper">
      <table className="users-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Designation</th>
            <th>Department</th>
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
              <td colSpan={8} className="users-table-empty">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            users.map((user) => {
              const isSelf = user.id === currentUserId;
              const isActive = user.status === 'active';
              const isUserRole = user.role === 'user';

              return (
                <tr key={user.id}>
                  <td className="users-table-name">
                    {user.full_name ? (
                      <HighlightText text={user.full_name} query={highlightQuery} />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    {user.email ? (
                      <HighlightText text={user.email} query={highlightQuery} />
                    ) : (
                      '—'
                    )}
                  </td>
                  <td><RoleBadge role={user.role} /></td>
                  <td className="designation-cell">
                    <InlineEditCell
                      userId={user.id}
                      value={user.designation}
                      editingId={editingDesignationId}
                      savingId={savingDesignationId}
                      placeholder="e.g. Developer, Analyst"
                      highlightQuery={highlightQuery}
                      onStartEdit={onStartEditDesignation}
                      onSave={onUpdateDesignation}
                      onCancel={onCancelEditDesignation}
                    />
                  </td>
                  <td className="designation-cell">
                    <InlineEditCell
                      userId={user.id}
                      value={user.department}
                      editingId={editingDepartmentId}
                      savingId={savingDepartmentId}
                      placeholder="e.g. Engineering, Sales"
                      highlightQuery={highlightQuery}
                      onStartEdit={onStartEditDepartment}
                      onSave={onUpdateDepartment}
                      onCancel={onCancelEditDepartment}
                    />
                  </td>
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
