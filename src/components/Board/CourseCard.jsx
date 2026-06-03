import React, { useState, useEffect } from 'react';
import { Play, Pause, CheckCircle2, GripVertical } from 'lucide-react';
import { formatTime } from '../../utils/timeUtils';
import { computeLiveTimeMs, isTimerRunning } from '../../utils/enrollmentTimer';
import { useCourses } from '../../context/CourseContext';
import CourseModuleList, { CourseCurriculumToggle } from './CourseModuleList';
import HighlightText from '../Common/HighlightText';

function CourseProgressBar({ lessonStats, status }) {
  const { totalLessons, totalCompleted } = lessonStats;

  // Course marked fully done overrides lesson-level counts
  const isDone = status === 'done';
  const pct = isDone
    ? 100
    : totalLessons > 0
    ? Math.round((totalCompleted / totalLessons) * 100)
    : 0;

  // Pick fill colour by progress level
  let fillClass = 'course-progress-fill';
  if (isDone || pct === 100) fillClass += ' fill-done';
  else if (pct >= 50)        fillClass += ' fill-mid';
  else if (pct > 0)          fillClass += ' fill-low';

  // Don't render the bar at all for courses with no lessons
  if (totalLessons === 0 && !isDone) return null;

  return (
    <div className="course-progress-bar-wrap">
      <div className="course-progress-track">
        <div
          className={fillClass}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className={`course-progress-pct ${isDone ? 'pct-done' : ''}`}>
        {isDone ? '✓ Done' : `${pct}%`}
      </span>
    </div>
  );
}

export default function CourseCard({ course, highlightQuery = '' }) {
  const { updateCourseStatus, markItemComplete } = useCourses();
  const [displayTime, setDisplayTime] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [busyItemId, setBusyItemId] = useState(null);

  const isActive = course.status === 'in-progress';
  const timerRunning = isTimerRunning({
    status: isActive ? 'in_progress' : 'assigned',
    timerStartedAt: course.timerStartedAt,
  });
  const lessonStats = course.lessonStats ?? {
    totalLessons: 0,
    totalCompleted: 0,
    requiredTotal: 0,
    requiredCompleted: 0,
  };

  useEffect(() => {
    const calculateTime = () => {
      setDisplayTime(
        computeLiveTimeMs({
          timeSpentMs: course.timeTracked,
          timerStartedAt: course.timerStartedAt,
          status: isActive ? 'in_progress' : 'assigned',
        })
      );
    };

    calculateTime();

    if (timerRunning) {
      const interval = setInterval(calculateTime, 1000);
      return () => clearInterval(interval);
    }

    return undefined;
  }, [course.timeTracked, course.timerStartedAt, isActive, timerRunning]);

  const handleDragStart = (e) => {
    e.dataTransfer.setData('text/plain', course.id);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.classList.add('dragging');
    e.currentTarget.closest('.task-card')?.classList.add('dragging');
  };

  const handleDragEnd = (e) => {
    e.currentTarget.classList.remove('dragging');
    e.currentTarget.closest('.task-card')?.classList.remove('dragging');
  };

  const toggleTimer = () => {
    if (isActive) {
      updateCourseStatus(course.id, 'todo');
    } else {
      updateCourseStatus(course.id, 'in-progress');
    }
  };

  const completeCourse = () => {
    updateCourseStatus(course.id, 'done');
  };

  const handleToggleItemComplete = async (itemId, status) => {
    setBusyItemId(itemId);
    try {
      await markItemComplete(course.id, itemId, status);
    } finally {
      setBusyItemId(null);
    }
  };

  return (
    <div className="task-card" data-id={course.id}>
      <div
        className="task-card-drag-handle"
        draggable
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        title="Drag to move"
      >
        <GripVertical size={16} />
      </div>

      <div className="task-card-body">
        <div className="task-header" style={{ alignItems: 'center' }}>
          <h3 className="task-title" style={{ flex: 1, margin: 0 }}>
            <HighlightText text={course.title} query={highlightQuery} />
          </h3>
        </div>

        {course.description ? (
          <p className="task-desc">
            <HighlightText text={course.description} query={highlightQuery} />
          </p>
        ) : null}

        <CourseProgressBar lessonStats={lessonStats} status={course.status} />

        {course.moduleCount > 0 ? (
          <>
            <CourseCurriculumToggle
              expanded={expanded}
              onToggle={() => setExpanded((prev) => !prev)}
              lessonStats={lessonStats}
              moduleCount={course.moduleCount}
            />
            {expanded ? (
              <CourseModuleList
                modules={course.modules}
                onToggleItemComplete={handleToggleItemComplete}
                busyItemId={busyItemId}
              />
            ) : null}
          </>
        ) : null}

        <div className="task-footer">
          <div className={`timer-badge ${isActive ? 'active' : ''}`}>
            <span className="timer-text">{formatTime(displayTime)}</span>
          </div>

          <div className="task-actions">
            {course.status !== 'done' && (
              <button
                className={`btn-icon ${isActive ? 'pause' : 'play'}`}
                onClick={toggleTimer}
                title={isActive ? 'Pause' : 'Start'}
                type="button"
              >
                {isActive ? <Pause size={16} /> : <Play size={16} />}
              </button>
            )}
            {course.status !== 'done' && (
              <button
                className="btn-icon check"
                onClick={completeCourse}
                title="Complete Course"
                type="button"
              >
                <CheckCircle2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
