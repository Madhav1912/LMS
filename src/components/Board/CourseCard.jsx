import React, { useState, useEffect } from 'react';
import { Play, Pause, CheckCircle2, ExternalLink, Trash2 } from 'lucide-react';
import { formatTime } from '../../utils/timeUtils';
import { useCourses } from '../../context/CourseContext';

export default function CourseCard({ course }) {
    const { updateCourseStatus, deleteCourse } = useCourses();
    const [displayTime, setDisplayTime] = useState(0);

    const isActive = course.status === 'in-progress';

    useEffect(() => {
        let interval;
        const calculateTime = () => {
            let total = course.timeTracked || 0;
            if (isActive && course.currentSessionStart) {
                total += (Date.now() - course.currentSessionStart);
            }
            setDisplayTime(total);
        };

        calculateTime();

        if (isActive) {
            interval = setInterval(calculateTime, 1000);
        }

        return () => clearInterval(interval);
    }, [course.timeTracked, course.currentSessionStart, isActive]);

    const handleDragStart = (e) => {
        e.dataTransfer.setData('text/plain', course.id);
        e.dataTransfer.effectAllowed = 'move';
        setTimeout(() => {
            e.target.classList.add('dragging');
        }, 0);
    };

    const handleDragEnd = (e) => {
        e.target.classList.remove('dragging');
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

    return (
        <div 
            className="task-card"
            draggable
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            data-id={course.id}
        >
            <div className="task-header" style={{ alignItems: 'center' }}>
                <h3 className="task-title" style={{ flex: 1, margin: 0 }}>{course.title}</h3>
                <button className="btn-icon" style={{ color: 'var(--danger)', opacity: 0.7 }} onClick={() => deleteCourse(course.id)} title="Delete Course">
                    <Trash2 size={16} />
                </button>
            </div>
            
            {course.description && <p className="task-desc">{course.description}</p>}
            
            {course.url && (
                <a href={course.url} target="_blank" rel="noopener noreferrer" className="course-link" style={{ 
                    display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem', 
                    fontWeight: 600, color: 'var(--accent)', textDecoration: 'none', marginBottom: '8px', 
                    marginLeft: '8px', padding: '4px 8px', background: 'rgba(37, 99, 235, 0.1)', borderRadius: '6px'
                }}>
                    Open Material <ExternalLink size={14} />
                </a>
            )}
            
            <div className="task-footer">
                <div className={`timer-badge ${isActive ? 'active' : ''}`}>
                    <span className="timer-text">{formatTime(displayTime)}</span>
                </div>
                
                <div className="task-actions">
                    {course.status !== 'done' && (
                        <button className={`btn-icon ${isActive ? 'pause' : 'play'}`} onClick={toggleTimer} title={isActive ? "Pause" : "Start"}>
                            {isActive ? <Pause size={16} /> : <Play size={16} />}
                        </button>
                    )}
                    {course.status !== 'done' && (
                        <button className="btn-icon check" onClick={completeCourse} title="Complete Course">
                            <CheckCircle2 size={16} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
