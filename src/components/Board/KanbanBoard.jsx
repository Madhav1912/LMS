import React, { useState } from 'react';
import { useCourses } from '../../context/CourseContext';
import CourseCard from './CourseCard';

export default function KanbanBoard() {
    const { courses, moveCourse, addCourse } = useCourses();
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // Modal state
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [url, setUrl] = useState('');

    const columns = [
        { id: 'todo', title: 'Available Courses' },
        { id: 'in-progress', title: 'In Progress' },
        { id: 'done', title: 'Completed' }
    ];

    const getDragAfterElement = (container, y) => {
        const draggableElements = [...container.querySelectorAll('.task-card:not(.dragging)')];
        
        return draggableElements.reduce((closest, child, index) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child, index };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).index;
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        const currentTarget = e.currentTarget;
        currentTarget.classList.add('drag-over');
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

    const handleAddCourse = (e) => {
        e.preventDefault();
        if (!title) return;
        addCourse({ title, description, url });
        setTitle('');
        setDescription('');
        setUrl('');
        setIsModalOpen(false);
    };

    return (
        <div className="kanban-board-container">
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    style={{
                        background: 'var(--primary)', color: '#fff', padding: '10px 16px',
                        border: 'none', borderRadius: 'var(--radius-sm)', cursor: 'pointer',
                        fontWeight: 600, fontSize: '0.875rem'
                    }}
                >
                    + Add Course
                </button>
            </div>
            
            <div className="kanban-board">
                {columns.map(col => {
                    const colCourses = courses.filter(c => c.status === col.id);
                    return (
                        <div 
                            key={col.id} 
                            className="kanban-column"
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            <div className="kanban-column-header">
                                <h2>{col.title} <span className="task-count">{colCourses.length}</span></h2>
                            </div>
                            <div className="task-list">
                                {colCourses.length === 0 && col.id === 'todo' && (
                                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '2rem' }}>
                                        Ready to start a new course? Click "Add Course".
                                    </div>
                                )}
                                {colCourses.map(course => (
                                    <CourseCard key={course.id} course={course} />
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Simple Modal */}
            {isModalOpen && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100
                }}>
                    <div style={{
                        background: 'var(--bg-card)', padding: '2rem', borderRadius: 'var(--radius-md)',
                        width: '100%', maxWidth: '400px', boxShadow: 'var(--shadow-lg)'
                    }}>
                        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Add New Course</h2>
                        <form onSubmit={handleAddCourse} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Title *</label>
                                <input required value={title} onChange={e => setTitle(e.target.value)} style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Description</label>
                                <textarea value={description} onChange={e => setDescription(e.target.value)} rows="3" style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500 }}>Course URL</label>
                                <input type="url" value={url} onChange={e => setUrl(e.target.value)} placeholder="https://..." style={{ width: '100%', padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg-main)', color: 'var(--text-primary)' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setIsModalOpen(false)} style={{ background: 'transparent', color: 'var(--text-secondary)', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Cancel</button>
                                <button type="submit" style={{ background: 'var(--primary)', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 'var(--radius-sm)', cursor: 'pointer', fontWeight: 500 }}>Save Course</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
