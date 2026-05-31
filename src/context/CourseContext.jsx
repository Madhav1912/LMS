import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  applyEnrollmentToCourse,
  checkpointEnrollmentTimer,
  fetchAssignedCourses,
  fetchUserItemProgress,
  getCourseLessonStats,
  mapCourseForDashboard,
  syncEnrollmentStatus,
  upsertItemProgress,
} from '../lib/userCourseService';

const CourseContext = createContext(null);
const CHECKPOINT_INTERVAL_MS = 30000;

export function CourseProvider({ children }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const enrollmentsRef = useRef(enrollments);

  useEffect(() => {
    enrollmentsRef.current = enrollments;
  }, [enrollments]);

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
          mapCourseForDashboard(course, enrollmentByCourse[course.id], itemProgressById)
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

  const applyEnrollmentUpdate = useCallback((courseId, enrollment) => {
    setEnrollments((prev) =>
      prev.map((e) => (e.course_id === courseId ? { ...e, ...enrollment } : e))
    );
    setCourses((prev) =>
      prev.map((c) => (c.id === courseId ? applyEnrollmentToCourse(c, enrollment) : c))
    );
  }, []);

  const syncEnrollmentForCourse = useCallback(
    async (courseId, newStatus) => {
      if (!user?.id) return;

      const enrollment = enrollmentsRef.current.find((e) => e.course_id === courseId);
      if (!enrollment?.id) return;

      try {
        const updatedEnrollment = await syncEnrollmentStatus({
          enrollment,
          kanbanStatus: newStatus,
        });
        applyEnrollmentUpdate(courseId, updatedEnrollment);
      } catch (err) {
        console.error(err);
        setError(err?.message ?? 'Failed to save course progress');
        await loadCourses();
      }
    },
    [user?.id, applyEnrollmentUpdate, loadCourses]
  );

  const updateCourseStatus = useCallback(
    (courseId, newStatus) => {
      setCourses((prev) =>
        prev.map((c) => (c.id === courseId ? { ...c, status: newStatus } : c))
      );
      syncEnrollmentForCourse(courseId, newStatus);
    },
    [syncEnrollmentForCourse]
  );

  const moveCourse = useCallback(
    (courseId, newStatus, targetIndex = -1) => {
      setCourses((prev) => {
        const courseIndex = prev.findIndex((t) => t.id === courseId);
        if (courseIndex < 0) return prev;

        let updatedCourses = prev.map((c) =>
          c.id === courseId ? { ...c, status: newStatus } : c
        );

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

      syncEnrollmentForCourse(courseId, newStatus);
    },
    [syncEnrollmentForCourse]
  );

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

  const runCheckpoints = useCallback(async () => {
    const active = enrollmentsRef.current.filter((e) => e.status === 'in_progress');
    if (!active.length) return;

    await Promise.all(
      active.map(async (enrollment) => {
        try {
          const updated = await checkpointEnrollmentTimer(enrollment.id);
          if (updated) {
            applyEnrollmentUpdate(enrollment.course_id, updated);
          }
        } catch (err) {
          console.error('Timer checkpoint failed:', err);
        }
      })
    );
  }, [applyEnrollmentUpdate]);

  useEffect(() => {
    if (!user?.id) return undefined;

    const intervalId = setInterval(runCheckpoints, CHECKPOINT_INTERVAL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        runCheckpoints();
      }
    };

    const onPageHide = () => {
      runCheckpoints();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    window.addEventListener('pagehide', onPageHide);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('pagehide', onPageHide);
    };
  }, [user?.id, runCheckpoints]);

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
