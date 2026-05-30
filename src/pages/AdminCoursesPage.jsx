import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, FileEdit, Globe } from 'lucide-react';
import AdminLayout from '../components/Layout/AdminLayout';
import CoursesTable from '../components/Admin/CoursesTable';
import { deleteCourse, fetchCoursesList, updateCourse } from '../lib/courseService';

export default function AdminCoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const loadCourses = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const data = await fetchCoursesList();
      setCourses(data ?? []);
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to load courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const stats = useMemo(() => {
    const total = courses.length;
    const published = courses.filter((c) => c.status === 'published').length;
    const drafts = courses.filter((c) => c.status === 'draft').length;
    return { total, published, drafts };
  }, [courses]);

  const handleEdit = (course) => {
    navigate(`/admin/courses/${course.id}`);
  };

  const handleStatusChange = async (course, nextStatus) => {
    setUpdatingId(course.id);
    setError('');

    try {
      const data = await updateCourse(course.id, {
        title: course.title,
        description: course.description,
        status: nextStatus,
      });

      setCourses((prev) => prev.map((c) => (c.id === course.id ? { ...c, ...data } : c)));
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to update course status');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async (course) => {
    const confirmed = window.confirm(
      `Delete "${course.title}" and all modules/items? This cannot be undone.`
    );
    if (!confirmed) return;

    setUpdatingId(course.id);
    setError('');

    try {
      await deleteCourse(course.id);
      setCourses((prev) => prev.filter((c) => c.id !== course.id));
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to delete course');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="admin-page-header admin-page-header-row">
          <div>
            <h2>Courses</h2>
            <p className="admin-page-subtitle">Create and manage LMS courses with modules and lessons.</p>
          </div>
          <button
            type="button"
            className="admin-primary-btn"
            onClick={() => navigate('/admin/courses/new')}
          >
            + Create Course
          </button>
        </div>

        <section className="admin-section">
          <div className="kpi-grid">
            <div className="kpi-card">
              <div className="kpi-info">
                <h3>Total Courses</h3>
                <div className="kpi-value">{loading ? '—' : stats.total}</div>
              </div>
              <div className="kpi-icon blue">
                <BookOpen />
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-info">
                <h3>Published</h3>
                <div className="kpi-value">{loading ? '—' : stats.published}</div>
              </div>
              <div className="kpi-icon green">
                <Globe />
              </div>
            </div>
            <div className="kpi-card">
              <div className="kpi-info">
                <h3>Drafts</h3>
                <div className="kpi-value">{loading ? '—' : stats.drafts}</div>
              </div>
              <div className="kpi-icon amber">
                <FileEdit />
              </div>
            </div>
          </div>
        </section>

        <section className="admin-section">
          <div className="admin-section-header">
            <h3>All Courses</h3>
            <button
              type="button"
              className="admin-refresh-btn"
              onClick={loadCourses}
              disabled={loading}
            >
              Refresh
            </button>
          </div>

          {error ? <div className="admin-error">{error}</div> : null}

          <CoursesTable
            courses={courses}
            loading={loading}
            updatingId={updatingId}
            onEdit={handleEdit}
            onStatusChange={handleStatusChange}
            onDelete={handleDelete}
          />
        </section>
      </div>
    </AdminLayout>
  );
}
