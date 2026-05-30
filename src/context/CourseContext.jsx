import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  fetchAssignedCourses,
  fetchUserItemProgress,
  mapCourseForDashboard,
  syncEnrollmentStatus,
  upsertItemProgress,
  getCourseLessonStats,
} from '../lib/userCourseService';

const CourseContext = createContext(null);
const PROGRESS_KEY = 'lms-course-progress-v1';

function loadLocalProgress() {
  try {
    const saved = localStorage.getItem(PROGRESS_KEY);
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
}

function saveLocalProgress(progressMap) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progressMap));
}

function getCourseTimeMs(course) {
  if (!course) return 0;
  let total = course.timeTracked || 0;
  if (course.status === 'in-progress' && course.currentSessionStart) {
    total += Date.now() - course.currentSessionStart;
  }
  return total;
}

function applyLocalStatusChange(courses, courseId, newStatus, progressMap) {
  return courses.map((course) => {
    if (course.id !== courseId) return course;

    const updated = { ...course };
    const progress = { ...progressMap[courseId] };

    if (updated.status !== newStatus) {
      if (newStatus === 'in-progress') {
        updated.currentSessionStart = Date.now();
        progress.currentSessionStart = Date.now();
        if (!updated.startedAt) updated.startedAt = Date.now();
        updated.completedAt = null;
      } else if (updated.status === 'in-progress') {
        if (updated.currentSessionStart) {
          const added = Date.now() - updated.currentSessionStart;
          updated.timeTracked = (updated.timeTracked || 0) + added;
          progress.timeTracked = updated.timeTracked;
          progress.currentSessionStart = null;
          updated.currentSessionStart = null;
        }
      }

      if (newStatus === 'done') {
        if (updated.status === 'in-progress' && updated.currentSessionStart) {
          const added = Date.now() - updated.currentSessionStart;
          updated.timeTracked = (updated.timeTracked || 0) + added;
          progress.timeTracked = updated.timeTracked;
          progress.currentSessionStart = null;
          updated.currentSessionStart = null;
        }
        updated.completedAt = Date.now();
      } else if (newStatus === 'todo') {
        updated.completedAt = null;
      }
    }

    updated.status = newStatus;
    progressMap[courseId] = progress;
    updated.timeTracked = progress.timeTracked ?? updated.timeTracked ?? 0;
    updated.currentSessionStart = progress.currentSessionStart ?? null;

    return updated;
  });
}

export function CourseProvider({ children }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadCourses = useCallback(async () => {
    if (!user?.id) {
      setCourses([]);
      setEnrollments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const progressMap = loadLocalProgress();
      const [{ enrollments: userEnrollments, courses: assignedCourses }, itemProgressList] =
        await Promise.all([
          fetchAssignedCourses(user.id),
          fetchUserItemProgress(user.id),
        ]);

      const enrollmentByCourse = Object.fromEntries(
        userEnrollments.map((e) => [e.course_id, e])
      );
      const itemProgressById = Object.fromEntries(
        itemProgressList.map((p) => [p.module_item_id, p])
      );

      setEnrollments(userEnrollments);
      setCourses(
        assignedCourses.map((course) =>
          mapCourseForDashboard(
            course,
            enrollmentByCourse[course.id],
            progressMap[course.id],
            itemProgressById
          )
        )
      );
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to load courses');
      setCourses([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const syncEnrollmentForCourse = async (courseId, newStatus, timeSpentMs) => {
    if (!user?.id) return;

    const enrollment = enrollments.find((e) => e.course_id === courseId);

    try {
      const updatedEnrollment = await syncEnrollmentStatus({
        userId: user.id,
        courseId,
        enrollment,
        kanbanStatus: newStatus,
        timeSpentMs,
      });

      setEnrollments((prev) =>
        prev.map((e) => (e.course_id === courseId ? { ...e, ...updatedEnrollment } : e))
      );

      setCourses((prev) =>
        prev.map((c) => {
          if (c.id !== courseId) return c;
          return {
            ...c,
            enrollmentId: updatedEnrollment.id,
            timeTracked: updatedEnrollment.time_spent_ms ?? c.timeTracked,
            startedAt: updatedEnrollment.started_at
              ? new Date(updatedEnrollment.started_at).getTime()
              : c.startedAt,
            completedAt: updatedEnrollment.completed_at
              ? new Date(updatedEnrollment.completed_at).getTime()
              : c.completedAt,
          };
        })
      );
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to save course progress');
      await loadCourses();
    }
  };

  const updateCourseStatus = (courseId, newStatus) => {
    const progressMap = loadLocalProgress();
    let syncedTime = 0;

    setCourses((prev) => {
      const next = applyLocalStatusChange(prev, courseId, newStatus, progressMap);
      saveLocalProgress(progressMap);
      syncedTime = getCourseTimeMs(next.find((c) => c.id === courseId));
      return next;
    });

    syncEnrollmentForCourse(courseId, newStatus, syncedTime);
  };

  const moveCourse = (courseId, newStatus, targetIndex = -1) => {
    const progressMap = loadLocalProgress();
    let syncedTime = 0;

    setCourses((prev) => {
      const courseIndex = prev.findIndex((t) => t.id === courseId);
      if (courseIndex < 0) return prev;

      let updatedCourses = applyLocalStatusChange(prev, courseId, newStatus, progressMap);
      saveLocalProgress(progressMap);
      syncedTime = getCourseTimeMs(updatedCourses.find((c) => c.id === courseId));

      const movedIndex = updatedCourses.findIndex((c) => c.id === courseId);
      const [course] = updatedCourses.splice(movedIndex, 1);

      if (targetIndex >= 0) {
        let statusCount = 0;
        let insertIdx = updatedCourses.length;
        for (let i = 0; i < updatedCourses.length; i++) {
          if (updatedCourses[i].status === newStatus) {
            if (statusCount === targetIndex) {
              insertIdx = i;
              break;
            }
            statusCount++;
          }
        }
        updatedCourses.splice(insertIdx, 0, course);
      } else {
        updatedCourses.push(course);
      }

      return updatedCourses;
    });

    syncEnrollmentForCourse(courseId, newStatus, syncedTime);
  };

  const markItemComplete = async (courseId, moduleItemId, status) => {
    if (!user?.id) return;

    try {
      await upsertItemProgress({
        userId: user.id,
        moduleItemId,
        status,
      });

      setCourses((prev) =>
        prev.map((course) => {
          if (course.id !== courseId) return course;

          const modules = course.modules.map((mod) => ({
            ...mod,
            items: mod.items.map((item) =>
              item.id === moduleItemId ? { ...item, progressStatus: status } : item
            ),
          }));

          return {
            ...course,
            modules,
            lessonStats: getCourseLessonStats(modules),
          };
        })
      );
    } catch (err) {
      console.error(err);
      setError(err?.message ?? 'Failed to update lesson progress');
      throw err;
    }
  };

  return (
    <CourseContext.Provider
      value={{
        courses,
        loading,
        error,
        refreshCourses: loadCourses,
        updateCourseStatus,
        moveCourse,
        markItemComplete,
      }}
    >
      {children}
    </CourseContext.Provider>
  );
}

export function useCourses() {
  const ctx = useContext(CourseContext);
  if (!ctx) throw new Error('useCourses must be used within CourseProvider');
  return ctx;
}
