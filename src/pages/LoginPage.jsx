import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/dashboard';
  const infoMessage = location.state?.message ?? '';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) throw signInError;

      const userId = data?.user?.id;
      let destination = from;

      if (userId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, status')
          .eq('id', userId)
          .single();

        if (profile?.role === 'admin' && profile?.status === 'active') {
          destination = '/admin';
        } else if (from === '/admin') {
          destination = '/dashboard';
        } else if (!from || from === '/login' || from === '/signup') {
          destination = '/dashboard';
        }
      }

      navigate(destination, { replace: true });
    } catch (err) {
      setError(err?.message ?? 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Sign in</h1>
        <p className="auth-subtitle">Welcome back. Continue to your dashboard.</p>

        <form onSubmit={onSubmit} className="auth-form">
          {infoMessage ? <div className="auth-info">{infoMessage}</div> : null}
          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="auth-field">
            <span>Password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="auth-primary" type="submit" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="auth-footer">
          <span>New here?</span> <Link to="/signup">Create an account</Link>
        </div>
      </div>
    </div>
  );
}

