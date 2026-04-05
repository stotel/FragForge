import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { login, register } from '../api';
import { useAuth } from '../contexts/AuthContext';

function validateEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

export function LoginPage() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!validateEmail(form.email)) e.email = 'Enter a valid email';
    if (!form.password) e.password = 'Password is required';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({}); setApiError(''); setLoading(true);
    try {
      const { data } = await login(form);
      setUser(data.user);
      navigate('/');
    } catch (err) {
      setApiError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthFormWrap title="Welcome back" subtitle="Sign in to your FragForge account">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Email" error={errors.email}>
          <input type="email" className={`input ${errors.email ? 'border-gray-500' : ''}`}
            placeholder="you@example.com" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Password" error={errors.password}>
          <input type="password" className={`input ${errors.password ? 'border-gray-500' : ''}`}
            placeholder="••••••••" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        </Field>
        {apiError && <p className="text-black text-sm bg-gray-200 border border-gray-400 px-3 py-2">{apiError}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-1 disabled:opacity-50">
          {loading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
      <p className="text-gray-500 text-sm text-center mt-6">
        No account? <Link to="/register" className="text-black hover:underline">Sign up</Link>
      </p>
    </AuthFormWrap>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.username) e.username = 'Username is required';
    else if (!/^[a-zA-Z0-9_]{3,30}$/.test(form.username))
      e.username = '3–30 chars: letters, numbers, underscore';
    if (!form.email) e.email = 'Email is required';
    else if (!validateEmail(form.email)) e.email = 'Enter a valid email address';
    if (!form.password) e.password = 'Password is required';
    else if (form.password.length < 6) e.password = 'At least 6 characters';
    return e;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const e = validate();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({}); setApiError(''); setLoading(true);
    try {
      await register(form);
      setSuccess(true);
    } catch (err) {
      setApiError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) return (
    <AuthFormWrap title="Check your inbox" subtitle="Almost there!">
      <div className="text-center space-y-4">
        <div className="text-5xl">📬</div>
        <p className="text-black leading-relaxed">
          We sent a verification link to <span className="text-black font-mono">{form.email}</span>.
        </p>
        <p className="text-gray-500 text-sm">
          In dev mode the link is also printed to the server console.
        </p>
        <Link to="/login" className="btn-ghost inline-block mt-2">Go to Login</Link>
      </div>
    </AuthFormWrap>
  );

  return (
    <AuthFormWrap title="Create account" subtitle="Join the shader community">
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Field label="Username" error={errors.username}>
          <input className={`input ${errors.username ? 'border-gray-500' : ''}`}
            placeholder="glsl_wizard" value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
        </Field>
        <Field label="Email" error={errors.email}>
          <input type="email" className={`input ${errors.email ? 'border-gray-500' : ''}`}
            placeholder="you@example.com" value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
        </Field>
        <Field label="Password" error={errors.password}>
          <input type="password" className={`input ${errors.password ? 'border-gray-500' : ''}`}
            placeholder="min 6 characters" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
        </Field>
        {apiError && <p className="text-black text-sm bg-gray-200 border border-gray-400 px-3 py-2">{apiError}</p>}
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5 mt-1 disabled:opacity-50">
          {loading ? 'Creating account…' : 'Create Account'}
        </button>
      </form>
      <p className="text-gray-500 text-sm text-center mt-6">
        Already have an account? <Link to="/login" className="text-black hover:underline">Sign in</Link>
      </p>
    </AuthFormWrap>
  );
}

function AuthFormWrap({ title, subtitle, children }) {
  return (
    <div className="min-h-[calc(100vh-56px)] flex items-center justify-center px-4 hero-bg">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 font-display font-bold text-xl mb-6 text-black">
            FragForge
          </Link>
          <h1 className="font-display text-2xl font-bold text-black">{title}</h1>
          <p className="text-gray-500 text-sm mt-1">{subtitle}</p>
        </div>
        <div className="card p-6 border-gray-300 bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <div>
      <label className="block text-xs font-mono text-gray-500 mb-1.5 uppercase tracking-wider">{label}</label>
      {children}
      {error && <p className="text-black text-xs mt-1">{error}</p>}
    </div>
  );
}
