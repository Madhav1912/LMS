import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

export default function SignupPage() {
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [requestedRole, setRequestedRole] = useState('user'); // 'user' | 'admin'
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName, requested_role: requestedRole },
        },
      });
      if (signUpError) throw signUpError;

      // If email confirmations are enabled, data.session can be null.
      if (data?.session) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/login', {
          replace: true,
          state: { message: 'Check your email to confirm your account, then sign in.' },
        });
      }
    } catch (err) {
      setError(err?.message ?? 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create account</h1>
        <p className="auth-subtitle">Sign up to access your dashboard.</p>

        <form onSubmit={onSubmit} className="auth-form">
          <div className="auth-role-toggle">
            <span className="auth-role-label">Account type</span>
            <div className="auth-segment">
              <button
                type="button"
                className={requestedRole === 'user' ? 'auth-seg-btn active' : 'auth-seg-btn'}
                onClick={() => setRequestedRole('user')}
                disabled={submitting}
              >
                Employee
              </button>
              <button
                type="button"
                className={requestedRole === 'admin' ? 'auth-seg-btn active' : 'auth-seg-btn'}
                onClick={() => setRequestedRole('admin')}
                disabled={submitting}
              >
                Admin
              </button>
            </div>
            <div className="auth-role-hint">
              Admin access is only granted for the first admin account; otherwise an existing admin must promote you.
            </div>
          </div>

          <label className="auth-field">
            <span>Full name</span>
            <input
              type="text"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
          </label>

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
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </label>

          {error ? <div className="auth-error">{error}</div> : null}

          <button className="auth-primary" type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create account'}
          </button>
        </form>

        <div className="auth-footer">
          <span>Already have an account?</span> <Link to="/login">Sign in</Link>
        </div>
      </div>
    </div>
  );
}

