import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../api';

export default function Navbar() {
  const { user, setUser, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    navigate('/');
  };

  const active = (path) =>
    location.pathname === path ? 'text-black font-semibold' : 'text-gray-600 hover:text-black';

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-300">
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 font-display font-bold text-lg text-black">
          FragForge
        </Link>

        {/* Center nav */}
        <div className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link to="/" className={`transition-colors ${active('/')}`}>Gallery</Link>
          <Link to="/playground" className={`transition-colors ${active('/playground')}`}>Playground</Link>
          {user && <Link to="/new" className={`transition-colors ${active('/new')}`}>New Shader</Link>}
          {isAdmin && <Link to="/admin" className={`transition-colors ${active('/admin')}`}>Admin</Link>}
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="flex items-center gap-2 text-sm text-black hover:text-gray-600 transition-colors"
              >
                <span className="w-7 h-7 bg-black text-white border border-black flex items-center justify-center text-xs font-mono font-bold">
                  {user.username[0].toUpperCase()}
                </span>
                <span className="hidden sm:inline font-medium">{user.username}</span>
                <span className="text-xs">▾</span>
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 bg-white border border-gray-300 shadow-sm py-1 animate-fade-in">
                  <Link
                    to={`/user/${user.id}`}
                    className="block px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Shaders
                  </Link>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="block px-4 py-2 text-sm text-black hover:bg-gray-100 transition-colors"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin Panel
                    </Link>
                  )}
                  <div className="border-t border-gray-300 my-1" />
                  <button
                    onClick={() => { handleLogout(); setMenuOpen(false); }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 transition-colors"
                  >
                    Log out
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn-ghost text-xs py-1.5">Log in</Link>
              <Link to="/register" className="btn-primary text-xs py-1.5">Sign up</Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
