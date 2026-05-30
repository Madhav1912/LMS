import React, { useCallback, useEffect, useState } from 'react';
import { X } from 'lucide-react';
import {
  assignCourseToUser,
  fetchPublishedCoursesForAssign,
  fetchUserCourseProgress,
  unassignCourse,
} from '../../lib/adminEnrollmentService';
import { formatTime } from '../../utils/timeUtils';

function ProgressBar({ percent }) {
  const value = Math.min(100, Math.max(0, Number(percent) || 0));
  return (
    <div className="admin-progress-bar">
      <div className="admin-progress-fill" style={{ width: `${value}%` }} />
      <span className="admin-progress-label">{value}%</span>
    </div>
  );
}

export default function UserCourseAssignmentsModal({ user, adminId, onClose }) {
  const [assignments, setAssignments] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError('');
    try {
      const [progress, courses] = await Promise.all([
        fetchUserCourseProgress(user.id),
        fetchPublishedCoursesForAssign(),
      ]);
      setAssignments(progress);
      const assignedIds = new Set(progress.map((a) => a.course_id));
      setAvailableCourses(courses.filter((c) => !assignedIds.has(c.id)));
      setSelectedCourseId('');
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to load assignments');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!selectedCourseId || !adminId) return;

    setSubmitting(true);
    setError('');
    try {
      await assignCourseToUser({
        userId: user.id,
        courseId: selectedCourseId,
        assignedBy: adminId,
      });
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to assign course');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnassign = async (enrollmentId, courseTitle) => {
    if (!window.confirm(`Remove "${courseTitle}" from this user?`)) return;

    setSubmitting(true);
    setError('');
    try {
      await unassignCourse(enrollmentId);
      await loadData();
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to remove assignment');
    } finally {
      setSubmitting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div
        className="admin-modal admin-modal-wide"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="admin-modal-header">
          <div>
            <h3>Course assignments</h3>
            <p className="admin-modal-subtitle">
              {user.full_name || user.email} · {user.email}
            </p>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <div className="admin-modal-body">
          {error ? <div className="admin-error">{error}</div> : null}

          <form className="admin-assign-form" onSubmit={handleAssign}>
            <select
              className="admin-select"
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              disabled={submitting || loading || availableCourses.length === 0}
            >
              <option value="">
                {availableCourses.length === 0
                  ? 'No published courses available to assign'
                  : 'Select a course to assign…'}
              </option>
              {availableCourses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="admin-primary-btn"
              disabled={submitting || !selectedCourseId}
            >
              Assign course
            </button>
          </form>

          {loading ? (
            <div className="course-editor-loading">Loading assignments…</div>
          ) : assignments.length === 0 ? (
            <p className="course-empty-hint">No courses assigned yet.</p>
          ) : (
            <div className="users-table-wrapper">
              <table className="users-table">
                <thead>
                  <tr>
                    <th>Course</th>
                    <th>Status</th>
                    <th>Completion</th>
                    <th>Time spent</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {assignments.map((row) => (
                    <tr key={row.enrollment_id}>
                      <td className="users-table-name">{row.course_title}</td>
                      <td>
                        <span className={`status-badge course-status-${row.enrollment_status === 'completed' ? 'published' : row.enrollment_status === 'in_progress' ? 'draft' : 'archived'}`}>
                          {row.enrollment_status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <ProgressBar percent={row.completion_percent} />
                        <span className="admin-progress-detail">
                          {row.required_items_completed}/{row.required_items_total} lessons
                        </span>
                      </td>
                      <td>{formatTime(row.time_spent_ms ?? 0)}</td>
                      <td>
                        <button
                          type="button"
                          className="users-table-action danger"
                          disabled={submitting}
                          onClick={() => handleUnassign(row.enrollment_id, row.course_title)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
