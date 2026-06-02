import React, { useState } from 'react';
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

function LessonRow({ item, busyItemId, onToggleItemComplete }) {
  const [open, setOpen] = useState(false);

  const completedDone  = item.progressStatus === 'completed';
  const icon = item.itemType === 'video' ? <Video size={14} /> : <FileText size={14} />;

  return (
    <li className="course-curriculum-item">
      {/* clickable header row */}
      <div
        className="course-curriculum-item-header"
        role="button"
        tabIndex={0}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="course-curriculum-item-chevron">
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </span>
        <span className="course-curriculum-item-icon">{icon}</span>
        <span className="course-curriculum-item-title-inline">{item.title}</span>
        <ItemStatusBadge status={item.progressStatus} />
      </div>

      {/* collapsible details */}
      {open ? (
        <div className="course-curriculum-item-detail">
          <div className="course-curriculum-item-meta">
            <span>{item.itemType === 'video' ? 'Video' : 'PDF'}</span>
            {item.durationSeconds ? <span>{formatDuration(item.durationSeconds)}</span> : null}
            <span>{item.isRequired ? 'Required' : 'Optional'}</span>
          </div>
          <div className="course-curriculum-item-actions">
            {item.url ? (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="course-curriculum-link"
                title="Open lesson"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={14} />
                <span>Open</span>
              </a>
            ) : null}
            {!completedDone ? (
              <button
                type="button"
                className="course-curriculum-complete-btn"
                disabled={busyItemId === item.id}
                onClick={(e) => { e.stopPropagation(); onToggleItemComplete(item.id, 'completed'); }}
                title="Mark complete"
              >
                <CheckCircle2 size={14} />
                <span>Mark done</span>
              </button>
            ) : (
              <button
                type="button"
                className="course-curriculum-complete-btn done"
                disabled={busyItemId === item.id}
                onClick={(e) => { e.stopPropagation(); onToggleItemComplete(item.id, 'not_started'); }}
                title="Mark not started"
              >
                <CheckCircle2 size={14} />
                <span>Mark undone</span>
              </button>
            )}
          </div>
        </div>
      ) : null}
    </li>
  );
}

function ModuleSection({ mod, onToggleItemComplete, busyItemId }) {
  const [open, setOpen] = useState(false);
  const doneCount = mod.items.filter((i) => i.progressStatus === 'completed').length;

  return (
    <div className="course-curriculum-module">
      <button
        type="button"
        className="course-curriculum-module-header"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="course-curriculum-module-chevron">
          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
        </span>
        <span className="course-curriculum-module-title">
          Module {mod.position}: {mod.title}
        </span>
        <span className="course-curriculum-module-count">
          {doneCount}/{mod.items.length} done
        </span>
      </button>

      {open ? (
        <>
          {mod.description ? (
            <p className="course-curriculum-module-desc">{mod.description}</p>
          ) : null}
          {mod.items.length === 0 ? (
            <p className="course-curriculum-empty">No lessons in this module.</p>
          ) : (
            <ul className="course-curriculum-items">
              {mod.items.map((item) => (
                <LessonRow
                  key={item.id}
                  item={item}
                  busyItemId={busyItemId}
                  onToggleItemComplete={onToggleItemComplete}
                />
              ))}
            </ul>
          )}
        </>
      ) : null}
    </div>
  );
}

export default function CourseModuleList({ modules, onToggleItemComplete, busyItemId }) {
  if (!modules?.length) {
    return <p className="course-curriculum-empty">No modules published for this course yet.</p>;
  }

  return (
    <div className="course-curriculum">
      {modules.map((mod) => (
        <ModuleSection
          key={mod.id}
          mod={mod}
          onToggleItemComplete={onToggleItemComplete}
          busyItemId={busyItemId}
        />
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
