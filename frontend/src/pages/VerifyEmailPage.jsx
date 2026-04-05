import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { verifyEmail } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function VerifyEmailPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState('verifying');

  useEffect(() => {
    if (!token) { setStatus('error'); return; }
    verifyEmail(token)
      .then(({ data }) => {
        setUser(data.user);
        setStatus('success');
        setTimeout(() => navigate('/'), 2000);
      })
      .catch(() => setStatus('error'));
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center animate-slide-up p-8">
        {status === 'verifying' && (
          <>
            <div className="text-4xl mb-4 animate-pulse">⏳</div>
            <h2 className="font-display text-xl text-gray-600">Verifying…</h2>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-5xl mb-4">✅</div>
            <h2 className="font-display text-2xl text-black font-bold">Email Verified!</h2>
            <p className="text-gray-500 mt-2">Redirecting you to the gallery…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-5xl mb-4">❌</div>
            <h2 className="font-display text-xl text-black">Verification Failed</h2>
            <p className="text-gray-500 mt-2 mb-6">The link may be invalid or already used.</p>
            <Link to="/register" className="btn-ghost">Try registering again</Link>
          </>
        )}
      </div>
    </div>
  );
}
