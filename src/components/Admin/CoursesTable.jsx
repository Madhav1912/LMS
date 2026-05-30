import React from 'react';
import { formatDate } from '../../utils/timeUtils';

function CourseStatusBadge({ status }) {
  const className =
    status === 'published'
      ? 'course-status-published'
      : status === 'archived'
        ? 'course-status-archived'
        : 'course-status-draft';

  const label = status.charAt(0).toUpperCase() + status.slice(1);

  return <span className={`status-badge ${className}`}>{label}</span>;
}

function SkeletonRows() {
  return (
    <>
      {[1, 2, 3].map((row) => (
        <tr key={row} className="users-table-skeleton-row">
          <td><div className="skeleton-cell" /></td>
          <td><div className="skeleton-cell" /></td>
          <td><div className="skeleton-cell short" /></td>
          <td><div className="skeleton-cell short" /></td>
          <td><div className="skeleton-cell short" /></td>
        </tr>
      ))}
    </>
  );
}

export default function CoursesTable({
  courses,
  loading,
  updatingId,
  onEdit,
  onStatusChange,
  onDelete,
}) {
  return (
    <div className="users-table-wrapper">
      <table className="users-table">
        <thead>
          <tr>
            <th>Title</th>
            <th>Description</th>
            <th>Modules</th>
            <th>Status</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <SkeletonRows />
          ) : courses.length === 0 ? (
            <tr>
              <td colSpan={6} className="users-table-empty">
                No courses yet. Create your first course to get started.
              </td>
            </tr>
          ) : (
            courses.map((course) => {
              const isUpdating = updatingId === course.id;
              const moduleCount = course.course_modules?.[0]?.count ?? 0;

              return (
                <tr key={course.id}>
                  <td className="users-table-name">{course.title}</td>
                  <td className="courses-table-description">
                    {course.description || '—'}
                  </td>
                  <td>{moduleCount}</td>
                  <td><CourseStatusBadge status={course.status} /></td>
                  <td>{formatDate(course.created_at)}</td>
                  <td>
                    <div className="courses-table-actions">
                      <button
                        type="button"
                        className="users-table-action"
                        disabled={isUpdating}
                        onClick={() => onEdit(course)}
                      >
                        Edit
                      </button>
                      {course.status !== 'published' ? (
                        <button
                          type="button"
                          className="users-table-action success"
                          disabled={isUpdating}
                          onClick={() => onStatusChange(course, 'published')}
                        >
                          Publish
                        </button>
                      ) : null}
                      {course.status !== 'archived' ? (
                        <button
                          type="button"
                          className="users-table-action danger"
                          disabled={isUpdating}
                          onClick={() => onStatusChange(course, 'archived')}
                        >
                          Archive
                        </button>
                      ) : null}
                      <button
                        type="button"
                        className="users-table-action danger"
                        disabled={isUpdating}
                        onClick={() => onDelete(course)}
                      >
                        Delete
                      </button>
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
