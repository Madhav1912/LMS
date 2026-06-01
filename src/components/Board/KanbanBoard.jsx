import React from 'react';
import { useCourses } from '../../context/CourseContext';
import CourseCard from './CourseCard';

export default function KanbanBoard({
  courses: coursesProp,
  searchActive = false,
  totalCourses = 0,
  highlightQuery = '',
}) {
  const { courses: contextCourses, loading, error, refreshCourses, moveCourse } = useCourses();
  const courses = coursesProp ?? contextCourses;
  const allCoursesCount = totalCourses || contextCourses.length;

  const columns = [
    { id: 'todo', title: 'Available Courses' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'done', title: 'Completed' },
  ];

  const getDragAfterElement = (container, y) => {
    const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];

    return draggableElements.reduce(
      (closest, child, index) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child, index };
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).index;
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e) => {
    const currentTarget = e.currentTarget;
    if (!currentTarget.contains(e.relatedTarget)) {
      currentTarget.classList.remove('drag-over');
    }
  };

  const handleDrop = (e, status) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    const courseId = e.dataTransfer.getData('text/plain');
    if (!courseId) return;

    const taskList = e.currentTarget.querySelector('.task-list');
    const afterIndex = getDragAfterElement(taskList, e.clientY);

    moveCourse(courseId, status, afterIndex !== undefined ? afterIndex : -1);
  };

  if (loading) {
    return (
      <div className="kanban-board-container">
        <div className="dashboard-loading">Loading courses…</div>
      </div>
    );
  }

  return (
    <div className="kanban-board-container">
      {error ? (
        <div className="admin-error dashboard-error">
          {error}
          <button type="button" className="admin-refresh-btn" onClick={refreshCourses}>
            Retry
          </button>
        </div>
      ) : null}

      <div className="kanban-board">
        {columns.map((col) => {
          const colCourses = courses.filter((c) => c.status === col.id);
          return (
            <div
              key={col.id}
              className="kanban-column"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              <div className="kanban-column-header">
                <h2>
                  {col.title} <span className="task-count">{colCourses.length}</span>
                </h2>
              </div>
              <div className="task-list">
                {colCourses.length === 0 && col.id === 'todo' ? (
                  <div className="kanban-empty">
                    {allCoursesCount === 0
                      ? 'No courses assigned yet. Your admin will assign courses for you.'
                      : searchActive
                        ? 'No matching courses in this column.'
                        : 'Drag a course here or start one from Available.'}
                  </div>
                ) : null}
                {colCourses.map((course) => (
                  <CourseCard key={course.id} course={course} highlightQuery={highlightQuery} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
