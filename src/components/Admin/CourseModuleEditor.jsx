import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Plus, Trash2, Video, FileText } from 'lucide-react';
import { getAssetUrl } from '../../lib/courseService';

const EMPTY_ITEM = {
  title: '',
  item_type: 'video',
  url: '',
  duration_seconds: '',
  is_required: true,
};

export default function CourseModuleEditor({
  module,
  expanded,
  onToggle,
  onUpdateModule,
  onDeleteModule,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  busy,
}) {
  const [editTitle, setEditTitle] = useState(module.title);
  const [editDescription, setEditDescription] = useState(module.description ?? '');
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [editingItemId, setEditingItemId] = useState(null);
  const [editItem, setEditItem] = useState(EMPTY_ITEM);

  useEffect(() => {
    setEditTitle(module.title);
    setEditDescription(module.description ?? '');
  }, [module.id, module.title, module.description]);

  const handleSaveModule = async () => {
    if (!editTitle.trim()) return;
    await onUpdateModule(module.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || null,
    });
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!newItem.title.trim() || !newItem.url.trim()) return;
    await onAddItem(module.id, {
      title: newItem.title.trim(),
      item_type: newItem.item_type,
      url: newItem.url.trim(),
      duration_seconds: newItem.duration_seconds ? Number(newItem.duration_seconds) : null,
      is_required: newItem.is_required,
    });
    setNewItem(EMPTY_ITEM);
  };

  const startEditItem = (item) => {
    setEditingItemId(item.id);
    setEditItem({
      title: item.title,
      item_type: item.item_type,
      url: getAssetUrl(item.assets),
      duration_seconds: item.duration_seconds ?? '',
      is_required: item.is_required,
    });
  };

  const handleSaveItem = async (itemId, assetId) => {
    if (!editItem.title.trim() || !editItem.url.trim()) return;
    await onUpdateItem(itemId, assetId, {
      title: editItem.title.trim(),
      item_type: editItem.item_type,
      url: editItem.url.trim(),
      duration_seconds: editItem.duration_seconds ? Number(editItem.duration_seconds) : null,
      is_required: editItem.is_required,
    });
    setEditingItemId(null);
  };

  const items = module.module_items ?? [];

  return (
    <div className="course-module-card">
      <div className="course-module-header">
        <button type="button" className="course-module-toggle" onClick={onToggle}>
          {expanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>
        <div className="course-module-header-main">
          <strong>{module.title}</strong>
          <span className="course-module-meta">
            {items.length} item{items.length === 1 ? '' : 's'} · Module {module.position}
          </span>
        </div>
        <button
          type="button"
          className="users-table-action danger"
          disabled={busy}
          onClick={() => onDeleteModule(module.id)}
        >
          <Trash2 size={14} />
        </button>
      </div>

      {expanded ? (
        <div className="course-module-body">
          <div className="course-module-fields">
            <label className="auth-field">
              <span>Module title</span>
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                disabled={busy}
              />
            </label>
            <label className="auth-field">
              <span>Description</span>
              <textarea
                className="admin-textarea"
                rows={2}
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={busy}
              />
            </label>
            <button
              type="button"
              className="admin-secondary-btn"
              disabled={busy || !editTitle.trim()}
              onClick={handleSaveModule}
            >
              Save module
            </button>
          </div>

          <div className="course-items-section">
            <h4>Lesson items</h4>
            {items.length === 0 ? (
              <p className="course-empty-hint">No items yet. Add a video or PDF below.</p>
            ) : (
              <ul className="course-items-list">
                {items.map((item) => (
                  <li key={item.id} className="course-item-row">
                    {editingItemId === item.id ? (
                      <div className="course-item-form">
                        <ItemFields item={editItem} onChange={setEditItem} disabled={busy} />
                        <div className="course-item-form-actions">
                          <button
                            type="button"
                            className="admin-secondary-btn"
                            disabled={busy}
                            onClick={() => setEditingItemId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="admin-primary-btn"
                            disabled={busy}
                            onClick={() => handleSaveItem(item.id, item.asset_id)}
                          >
                            Save item
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="course-item-info">
                          <span className="course-item-icon">
                            {item.item_type === 'video' ? <Video size={16} /> : <FileText size={16} />}
                          </span>
                          <div>
                            <div className="course-item-title">{item.title}</div>
                            <a
                              href={getAssetUrl(item.assets)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="course-item-url"
                            >
                              {getAssetUrl(item.assets)}
                            </a>
                          </div>
                        </div>
                        <div className="courses-table-actions">
                          <button
                            type="button"
                            className="users-table-action"
                            disabled={busy}
                            onClick={() => startEditItem(item)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="users-table-action danger"
                            disabled={busy}
                            onClick={() => onDeleteItem(item.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}

            <form className="course-add-item-form" onSubmit={handleAddItem}>
              <h5>Add lesson item</h5>
              <ItemFields item={newItem} onChange={setNewItem} disabled={busy} />
              <button type="submit" className="admin-primary-btn" disabled={busy}>
                <Plus size={16} /> Add item
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ItemFields({ item, onChange, disabled }) {
  return (
    <div className="course-item-fields">
      <label className="auth-field">
        <span>Title</span>
        <input
          type="text"
          value={item.title}
          onChange={(e) => onChange({ ...item, title: e.target.value })}
          placeholder="Lesson title"
          disabled={disabled}
          required
        />
      </label>
      <label className="auth-field">
        <span>Type</span>
        <select
          className="admin-select"
          value={item.item_type}
          onChange={(e) => onChange({ ...item, item_type: e.target.value })}
          disabled={disabled}
        >
          <option value="video">Video</option>
          <option value="pdf">PDF</option>
        </select>
      </label>
      <label className="auth-field">
        <span>URL</span>
        <input
          type="text"
          value={item.url}
          onChange={(e) => onChange({ ...item, url: e.target.value })}
          placeholder="https://youtube.com/... or PDF link"
          disabled={disabled}
          required
        />
      </label>
      <label className="auth-field">
        <span>Duration (seconds, optional)</span>
        <input
          type="number"
          min="0"
          value={item.duration_seconds}
          onChange={(e) => onChange({ ...item, duration_seconds: e.target.value })}
          disabled={disabled}
        />
      </label>
      <label className="course-checkbox-field">
        <input
          type="checkbox"
          checked={item.is_required}
          onChange={(e) => onChange({ ...item, is_required: e.target.checked })}
          disabled={disabled}
        />
        <span>Required for completion</span>
      </label>
    </div>
  );
}
