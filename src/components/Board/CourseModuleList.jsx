import React from 'react';
import { ChevronDown, ChevronRight, ExternalLink, FileText, Video, CheckCircle2 } from 'lucide-react';

function formatDuration(seconds) {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function ItemStatusBadge({ status }) {
  if (status === 'completed') {
    return <span className="lesson-status lesson-status-done">Done</span>;
  }
  if (status === 'in_progress') {
    return <span className="lesson-status lesson-status-progress">In progress</span>;
  }
  return <span className="lesson-status lesson-status-todo">Not started</span>;
}

export default function CourseModuleList({ modules, onToggleItemComplete, busyItemId }) {
  if (!modules?.length) {
    return <p className="course-curriculum-empty">No modules published for this course yet.</p>;
  }

  return (
    <div className="course-curriculum">
      {modules.map((mod) => (
        <div key={mod.id} className="course-curriculum-module">
          <div className="course-curriculum-module-header">
            <span className="course-curriculum-module-title">
              Module {mod.position}: {mod.title}
            </span>
            <span className="course-curriculum-module-count">
              {mod.items.length} lesson{mod.items.length === 1 ? '' : 's'}
            </span>
          </div>
          {mod.description ? (
            <p className="course-curriculum-module-desc">{mod.description}</p>
          ) : null}
          {mod.items.length === 0 ? (
            <p className="course-curriculum-empty">No lessons in this module.</p>
          ) : (
            <ul className="course-curriculum-items">
              {mod.items.map((item) => (
                <li key={item.id} className="course-curriculum-item">
                  <div className="course-curriculum-item-main">
                    <span className="course-curriculum-item-icon">
                      {item.itemType === 'video' ? <Video size={14} /> : <FileText size={14} />}
                    </span>
                    <div className="course-curriculum-item-info">
                      <span className="course-curriculum-item-title">{item.title}</span>
                      <div className="course-curriculum-item-meta">
                        <span>{item.itemType === 'video' ? 'Video' : 'PDF'}</span>
                        {item.durationSeconds ? (
                          <span>{formatDuration(item.durationSeconds)}</span>
                        ) : null}
                        {item.isRequired ? <span>Required</span> : <span>Optional</span>}
                        <ItemStatusBadge status={item.progressStatus} />
                      </div>
                    </div>
                  </div>
                  <div className="course-curriculum-item-actions">
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="course-curriculum-link"
                        title="Open lesson"
                      >
                        <ExternalLink size={14} />
                      </a>
                    ) : null}
                    {item.progressStatus !== 'completed' ? (
                      <button
                        type="button"
                        className="course-curriculum-complete-btn"
                        disabled={busyItemId === item.id}
                        onClick={() => onToggleItemComplete(item.id, 'completed')}
                        title="Mark complete"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="course-curriculum-complete-btn done"
                        disabled={busyItemId === item.id}
                        onClick={() => onToggleItemComplete(item.id, 'not_started')}
                        title="Mark not started"
                      >
                        <CheckCircle2 size={14} />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}

export function CourseCurriculumToggle({ expanded, onToggle, lessonStats }) {
  return (
    <button type="button" className="course-curriculum-toggle" onClick={onToggle}>
      {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      <span>
        {lessonStats.totalLessons} lesson{lessonStats.totalLessons === 1 ? '' : 's'}
        {lessonStats.requiredTotal > 0
          ? ` · ${lessonStats.requiredCompleted}/${lessonStats.requiredTotal} required done`
          : ''}
      </span>
    </button>
  );
}
