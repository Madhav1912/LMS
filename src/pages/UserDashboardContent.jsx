import React, { useMemo, useState } from 'react';
import DashboardAnalytics from '../components/Analytics/DashboardAnalytics';
import KanbanBoard from '../components/Board/KanbanBoard';
import SearchFilterBar from '../components/Common/SearchFilterBar';
import { useCourses } from '../context/CourseContext';
import { filterCoursesBySearch } from '../utils/listFilters';

export default function UserDashboardContent() {
  const { courses } = useCourses();
  const [courseSearch, setCourseSearch] = useState('');

  const filteredCourses = useMemo(
    () => filterCoursesBySearch(courses, courseSearch),
    [courses, courseSearch]
  );

  const hasSearch = courseSearch.trim().length > 0;
  const noMatches = hasSearch && filteredCourses.length === 0 && courses.length > 0;

  return (
    <>
      <DashboardAnalytics courses={filteredCourses} />

      <section className="learning-track-section" aria-labelledby="learning-track-heading">
        <div className="learning-track-header">
          <h2 id="learning-track-heading">Learning Track</h2>
          <p className="learning-track-subtitle">
            Search, start, and track your assigned courses.
          </p>
        </div>

        <SearchFilterBar
          searchValue={courseSearch}
          onSearchChange={setCourseSearch}
          searchPlaceholder="Search courses by title or description…"
        />

        {noMatches ? (
          <div className="search-no-results">
            No courses match &ldquo;{courseSearch.trim()}&rdquo;. Try a different search term.
          </div>
        ) : null}

        <KanbanBoard
          courses={filteredCourses}
          searchActive={hasSearch}
          totalCourses={courses.length}
          highlightQuery={courseSearch}
        />
      </section>
    </>
  );
}
