import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus } from 'lucide-react';
import AdminLayout from '../components/Layout/AdminLayout';
import CourseModuleEditor from '../components/Admin/CourseModuleEditor';
import { useAuth } from '../auth/AuthContext';
import {
  createCourse,
  createModule,
  createModuleItem,
  deleteModule,
  deleteModuleItem,
  fetchCourseWithContent,
  getNextItemPosition,
  getNextModulePosition,
  updateCourse,
  updateModule,
  updateModuleItem,
} from '../lib/courseService';

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export default function AdminCourseEditorPage() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNew = courseId === 'new';

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [busyModuleId, setBusyModuleId] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('draft');
  const [course, setCourse] = useState(null);
  const [expandedModuleId, setExpandedModuleId] = useState(null);
  const [newModuleTitle, setNewModuleTitle] = useState('');

  const loadCourse = useCallback(async () => {
    if (isNew) return;
    setLoading(true);
    setError('');
    try {
      const data = await fetchCourseWithContent(courseId);
      setCourse(data);
      setTitle(data.title);
      setDescription(data.description ?? '');
      setStatus(data.status);
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to load course');
    } finally {
      setLoading(false);
    }
  }, [courseId, isNew]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  useEffect(() => {
    if (course?.course_modules?.length && !expandedModuleId) {
      setExpandedModuleId(course.course_modules[0].id);
    }
  }, [course, expandedModuleId]);

  const showSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(''), 3000);
  };

  const handleSaveCourse = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Course title is required.');
      return;
    }
    if (!user?.id) return;

    setSaving(true);
    setError('');

    try {
      if (isNew) {
        const created = await createCourse({
          title: title.trim(),
          description: description.trim() || null,
          status,
          createdBy: user.id,
        });
        navigate(`/admin/courses/${created.id}`, { replace: true });
      } else {
        await updateCourse(courseId, {
          title: title.trim(),
          description: description.trim() || null,
          status,
        });
        await loadCourse();
        showSuccess('Course saved.');
      }
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const handleAddModule = async (e) => {
    e.preventDefault();
    if (!newModuleTitle.trim() || isNew) return;

    setBusyModuleId('new');
    setError('');

    try {
      const position = await getNextModulePosition(courseId);
      const mod = await createModule({
        courseId,
        title: newModuleTitle.trim(),
        description: null,
        position,
      });
      setNewModuleTitle('');
      await loadCourse();
      setExpandedModuleId(mod.id);
      showSuccess('Module added.');
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to add module');
    } finally {
      setBusyModuleId(null);
    }
  };

  const handleUpdateModule = async (moduleId, payload) => {
    setBusyModuleId(moduleId);
    setError('');
    try {
      await updateModule(moduleId, payload);
      await loadCourse();
      showSuccess('Module updated.');
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to update module');
    } finally {
      setBusyModuleId(null);
    }
  };

  const handleDeleteModule = async (moduleId) => {
    if (!window.confirm('Delete this module and all its items?')) return;
    setBusyModuleId(moduleId);
    setError('');
    try {
      await deleteModule(moduleId);
      if (expandedModuleId === moduleId) setExpandedModuleId(null);
      await loadCourse();
      showSuccess('Module deleted.');
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to delete module');
    } finally {
      setBusyModuleId(null);
    }
  };

  const handleAddItem = async (moduleId, payload) => {
    setBusyModuleId(moduleId);
    setError('');
    try {
      const position = await getNextItemPosition(moduleId);
      await createModuleItem({
        moduleId,
        ...payload,
        userId: user.id,
        position,
      });
      await loadCourse();
      showSuccess('Item added.');
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to add item');
    } finally {
      setBusyModuleId(null);
    }
  };

  const handleUpdateItem = async (itemId, assetId, payload) => {
    setBusyModuleId('item');
    setError('');
    try {
      await updateModuleItem({
        itemId,
        assetId,
        ...payload,
        userId: user.id,
      });
      await loadCourse();
      showSuccess('Item updated.');
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to update item');
    } finally {
      setBusyModuleId(null);
    }
  };

  const handleDeleteItem = async (itemId) => {
    if (!window.confirm('Delete this lesson item?')) return;
    setBusyModuleId('item');
    setError('');
    try {
      await deleteModuleItem(itemId);
      await loadCourse();
      showSuccess('Item deleted.');
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to delete item');
    } finally {
      setBusyModuleId(null);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="course-editor-loading">Loading course…</div>
      </AdminLayout>
    );
  }

  const modules = course?.course_modules ?? [];

  return (
    <AdminLayout>
      <div className="admin-page">
        <div className="admin-page-header admin-page-header-row">
          <div>
            <Link to="/admin/courses" className="admin-back-link">
              <ArrowLeft size={16} /> Back to courses
            </Link>
            <h2>{isNew ? 'Create Course' : 'Edit Course'}</h2>
            <p className="admin-page-subtitle">
              {isNew
                ? 'Save course details first, then add modules and lessons.'
                : 'Manage course content, modules, and lesson items.'}
            </p>
          </div>
        </div>

        {error ? <div className="admin-error">{error}</div> : null}
        {success ? <div className="admin-success">{success}</div> : null}

        <section className="admin-section course-editor-section">
          <h3>Course details</h3>
          <form onSubmit={handleSaveCourse} className="course-details-form">
            <label className="auth-field">
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Course title"
                required
              />
            </label>
            <label className="auth-field">
              <span>Description</span>
              <textarea
                className="admin-textarea"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What learners will gain from this course…"
              />
            </label>
            <label className="auth-field">
              <span>Status</span>
              <select
                className="admin-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="admin-primary-btn" disabled={saving}>
              {saving ? 'Saving…' : isNew ? 'Create course' : 'Save course'}
            </button>
          </form>
        </section>

        {!isNew ? (
          <section className="admin-section course-editor-section">
            <div className="admin-section-header">
              <h3>Modules & lessons</h3>
              <span className="course-module-count">
                {modules.length} module{modules.length === 1 ? '' : 's'}
              </span>
            </div>

            {modules.length === 0 ? (
              <p className="course-empty-hint">
                No modules yet. Add your first module below to start building content.
              </p>
            ) : (
              <div className="course-modules-list">
                {modules.map((mod) => (
                  <CourseModuleEditor
                    key={mod.id}
                    module={mod}
                    expanded={expandedModuleId === mod.id}
                    onToggle={() =>
                      setExpandedModuleId((prev) => (prev === mod.id ? null : mod.id))
                    }
                    onUpdateModule={handleUpdateModule}
                    onDeleteModule={handleDeleteModule}
                    onAddItem={handleAddItem}
                    onUpdateItem={handleUpdateItem}
                    onDeleteItem={handleDeleteItem}
                    busy={Boolean(busyModuleId)}
                  />
                ))}
              </div>
            )}

            <form className="course-add-module-form" onSubmit={handleAddModule}>
              <h4>Add module</h4>
              <div className="course-add-module-row">
                <input
                  type="text"
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  placeholder="Module title, e.g. Getting Started"
                  disabled={Boolean(busyModuleId)}
                />
                <button
                  type="submit"
                  className="admin-primary-btn"
                  disabled={Boolean(busyModuleId) || !newModuleTitle.trim()}
                >
                  <Plus size={16} /> Add module
                </button>
              </div>
            </form>
          </section>
        ) : null}
      </div>
    </AdminLayout>
  );
}
