import React, { createContext, useContext, useState, useEffect } from 'react';
import initialCourses from '../data/initialCourses.json';

const CourseContext = createContext();

export function CourseProvider({ children }) {
    const [courses, setCourses] = useState(() => {
        const saved = localStorage.getItem('lms-dashboard-courses-v2');
        if (saved) {
            try {
                return JSON.parse(saved);
            } catch (e) {
                console.error("Failed to parse courses from localStorage");
            }
        }
        return initialCourses;
    });

    useEffect(() => {
        localStorage.setItem('lms-dashboard-courses-v2', JSON.stringify(courses));
    }, [courses]);

    const addCourse = (courseData) => {
        const newCourse = {
            id: 'course-' + Date.now(),
            title: courseData.title,
            description: courseData.description,
            url: courseData.url,
            status: 'todo',
            priority: courseData.priority || 'medium',
            timeTracked: 0,
            currentSessionStart: null,
            startedAt: null,
            completedAt: null
        };
        setCourses(prev => [...prev, newCourse]);
    };

    const deleteCourse = (courseId) => {
        setCourses(prev => prev.filter(c => c.id !== courseId));
    };

    const updateCourseStatus = (courseId, newStatus) => {
        setCourses(prev => prev.map(course => {
            if (course.id !== courseId) return course;
            
            const updated = { ...course };
            
            if (updated.status !== newStatus) {
                if (newStatus === 'in-progress') {
                    updated.currentSessionStart = Date.now();
                    if (!updated.startedAt) updated.startedAt = Date.now();
                    updated.completedAt = null;
                } else if (updated.status === 'in-progress') {
                    if (updated.currentSessionStart) {
                        updated.timeTracked = (updated.timeTracked || 0) + (Date.now() - updated.currentSessionStart);
                        updated.currentSessionStart = null;
                    }
                }
                
                if (newStatus === 'done') {
                    updated.completedAt = Date.now();
                } else if (newStatus === 'todo') {
                    updated.completedAt = null;
                }
            }
            
            updated.status = newStatus;
            return updated;
        }));
    };

    const moveCourse = (courseId, newStatus, targetIndex = -1) => {
        setCourses(prev => {
            const courseIndex = prev.findIndex(t => t.id === courseId);
            if (courseIndex < 0) return prev;
            
            const course = prev[courseIndex];
            const updatedCourses = [...prev];
            
            updatedCourses.splice(courseIndex, 1);
            
            const updatedCourse = { ...course };
            if (updatedCourse.status !== newStatus) {
                if (newStatus === 'in-progress') {
                    updatedCourse.currentSessionStart = Date.now();
                    if (!updatedCourse.startedAt) updatedCourse.startedAt = Date.now();
                    updatedCourse.completedAt = null;
                } else if (updatedCourse.status === 'in-progress') {
                    if (updatedCourse.currentSessionStart) {
                        updatedCourse.timeTracked = (updatedCourse.timeTracked || 0) + (Date.now() - updatedCourse.currentSessionStart);
                        updatedCourse.currentSessionStart = null;
                    }
                }
                if (newStatus === 'done') {
                    updatedCourse.completedAt = Date.now();
                } else if (newStatus === 'todo') {
                    updatedCourse.completedAt = null;
                }
                updatedCourse.status = newStatus;
            }
            
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
                updatedCourses.splice(insertIdx, 0, updatedCourse);
            } else {
                updatedCourses.push(updatedCourse);
            }
            
            return updatedCourses;
        });
    };

    return (
        <CourseContext.Provider value={{ courses, addCourse, deleteCourse, updateCourseStatus, moveCourse }}>
            {children}
        </CourseContext.Provider>
    );
}

export function useCourses() {
    return useContext(CourseContext);
}
