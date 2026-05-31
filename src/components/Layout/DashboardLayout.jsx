import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

export default function DashboardLayout({ children }) {
    const { user, profile, signOut } = useAuth();
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem('theme') || 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light');
    };

    return (
        <div className="app-container">
            <header className="app-header">
                <div className="header-brand">
                    <svg viewBox="0 0 100 100" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
                        <path d="M 25 35 H 55 V 45 H 40 V 80 H 25 Z" fill="#3b82f6" />
                        <path d="M 40 80 C 55 80, 65 65, 60 45 H 72 C 77 65, 65 85, 40 85 Z" fill="#ef4444" />
                        <circle cx="68" cy="25" r="12" fill="#3b82f6" />
                        <g fill="#ffffff">
                            <circle cx="64" cy="25" r="1.2" />
                            <circle cx="68" cy="25" r="1.5" />
                            <circle cx="72" cy="25" r="1.2" />
                            <circle cx="65" cy="21" r="1" />
                            <circle cx="69" cy="21" r="1.2" />
                            <circle cx="65" cy="29" r="1" />
                            <circle cx="69" cy="29" r="1.2" />
                        </g>
                    </svg>
                    <h1>LMS Dashboard</h1>
                </div>
                <div className="header-actions">
                    {user?.email ? <span className="header-user">{user.email}</span> : null}
                    {profile?.designation ? (
                        <span className="header-designation">{profile.designation}</span>
                    ) : null}
                    <button className="theme-toggle" onClick={toggleTheme} aria-label="Toggle Theme">
                        {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
                    </button>
                    <button
                        className="header-logout"
                        onClick={() => signOut().catch((e) => console.error(e))}
                        type="button"
                    >
                        Sign out
                    </button>
                </div>
            </header>
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
