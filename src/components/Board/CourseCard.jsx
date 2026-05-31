import React, { useState, useEffect } from 'react';
import { Play, Pause, CheckCircle2, GripVertical } from 'lucide-react';
import { formatTime } from '../../utils/timeUtils';
import { computeLiveTimeMs, isTimerRunning } from '../../utils/enrollmentTimer';
import { useCourses } from '../../context/CourseContext';
import CourseModuleList, { CourseCurriculumToggle } from './CourseModuleList';

export default function CourseCard({ course }) {
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
            {course.title}
          </h3>
        </div>

        {course.description ? <p className="task-desc">{course.description}</p> : null}

        {course.moduleCount > 0 ? (
          <>
            <CourseCurriculumToggle
              expanded={expanded}
              onToggle={() => setExpanded((prev) => !prev)}
              lessonStats={lessonStats}
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
