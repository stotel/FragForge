import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getAdminStats, getAdminUsers, getAdminShaders,
  setUserRole, deleteUser,
  adminSetShaderActive, adminDeleteShader
} from '../../api';
import { useAuth } from '../../contexts/AuthContext';

function StatCard({ label, value, accent }) {
  return (
    <div className="card p-5 text-center bg-white">
      <div className={`font-display text-4xl font-extrabold ${accent ? 'text-black' : 'text-gray-600'}`}>
        {value ?? '—'}
      </div>
      <div className="text-gray-500 text-xs font-mono mt-1">{label}</div>
    </div>
  );
}

export default function AdminPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [shaders, setShaders] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate('/');
  }, [authLoading, isAdmin, navigate]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoadingData(true);
    Promise.all([getAdminStats(), getAdminUsers(), getAdminShaders()])
      .then(([s, u, sh]) => {
        setStats(s.data);
        setUsers(u.data.users);
        setShaders(sh.data.shaders);
      })
      .finally(() => setLoadingData(false));
  }, [isAdmin]);

  const handleRoleChange = async (uid, role) => {
    await setUserRole(uid, role);
    setUsers(us => us.map(u => u.id === uid ? { ...u, role } : u));
  };

  const handleDeleteUser = async (uid, uname) => {
    if (!confirm(`Delete user @${uname}?`)) return;
    await deleteUser(uid);
    setUsers(us => us.filter(u => u.id !== uid));
  };

  const handleToggleShader = async (id, current) => {
    await adminSetShaderActive(id, !current);
    setShaders(ss => ss.map(s => s.id === id ? { ...s, is_active: !current } : s));
  };

  const handleDeleteShader = async (id, title) => {
    if (!confirm(`Delete shader "${title}"?`)) return;
    await adminDeleteShader(id);
    setShaders(ss => ss.filter(s => s.id !== id));
  };

  if (authLoading) return null;

  const TAB = (name, label) => (
    <button
      onClick={() => setTab(name)}
      className={`px-4 py-2 text-sm font-mono transition-colors
        ${tab === name ? 'bg-gray-200 text-black border border-black' : 'text-gray-500 hover:text-black'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 py-10 animate-slide-up bg-white">
      <div className="flex items-center gap-3 mb-8">
        <span className="text-2xl">⚙</span>
        <h1 className="font-display text-3xl font-bold text-black">Admin Panel</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {TAB('overview', 'Overview')}
        {TAB('shaders', `Shaders (${shaders.length})`)}
        {TAB('users', `Users (${users.length})`)}
      </div>

      {loadingData ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="card h-24 animate-pulse bg-gray-100" />)}
        </div>
      ) : (
        <>
          {/* Overview */}
          {tab === 'overview' && stats && (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <StatCard label="TOTAL USERS" value={stats.userCount} />
              <StatCard label="VERIFIED" value={stats.verifiedUserCount} accent />
              <StatCard label="ALL SHADERS" value={stats.shaderCount} />
              <StatCard label="ACTIVE" value={stats.activeShaderCount} accent />
              <StatCard label="COMMENTS" value={stats.commentCount} />
            </div>
          )}

          {/* Shaders */}
          {tab === 'shaders' && (
            <div className="card overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left px-4 py-3 text-xs font-mono text-gray-500">TITLE</th>
                    <th className="text-left px-4 py-3 text-xs font-mono text-gray-500 hidden md:table-cell">AUTHOR</th>
                    <th className="text-left px-4 py-3 text-xs font-mono text-gray-500 hidden sm:table-cell">TYPE</th>
                    <th className="text-center px-4 py-3 text-xs font-mono text-gray-500">STATUS</th>
                    <th className="text-right px-4 py-3 text-xs font-mono text-gray-500">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {shaders.map(s => (
                    <tr key={s.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <a href={`/shader/${s.id}`} className="text-black hover:text-gray-600 transition-colors truncate max-w-xs block" target="_blank">
                          {s.title}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden md:table-cell">@{s.author_name}</td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className={`badge text-xs ${s.shader_type === 'compute' ? 'bg-gray-200 text-black border-gray-400' : 'bg-white text-black border-gray-300'}`}>
                          {s.shader_type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleToggleShader(s.id, s.is_active)}
                          className={`badge cursor-pointer transition-colors ${s.is_active
                            ? 'bg-white text-black border border-black hover:bg-gray-200'
                            : 'bg-gray-200 text-black border border-gray-400 hover:bg-white hover:border-black'
                          }`}
                        >
                          {s.is_active ? 'active' : 'inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleDeleteShader(s.id, s.title)}
                          className="text-gray-500 hover:text-black text-xs transition-colors font-mono"
                        >
                          delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Users */}
          {tab === 'users' && (
            <div className="card overflow-hidden bg-white">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="text-left px-4 py-3 text-xs font-mono text-gray-500">USERNAME</th>
                    <th className="text-left px-4 py-3 text-xs font-mono text-gray-500 hidden md:table-cell">EMAIL</th>
                    <th className="text-center px-4 py-3 text-xs font-mono text-gray-500 hidden sm:table-cell">VERIFIED</th>
                    <th className="text-center px-4 py-3 text-xs font-mono text-gray-500">ROLE</th>
                    <th className="text-right px-4 py-3 text-xs font-mono text-gray-500">ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-sm text-black">@{u.username}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs hidden md:table-cell">{u.email}</td>
                      <td className="px-4 py-3 text-center hidden sm:table-cell">
                        <span className={u.is_verified ? 'text-black text-sm' : 'text-gray-400 text-sm'}>
                          {u.is_verified ? '✓' : '○'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {u.id !== user?.id ? (
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            className="bg-white border border-gray-300 text-xs rounded px-2 py-1 font-mono text-black focus:outline-none focus:border-black"
                          >
                            <option value="user">user</option>
                            <option value="admin">admin</option>
                          </select>
                        ) : (
                          <span className="badge bg-gray-200 text-black border border-gray-400 text-xs">you</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.username)}
                            className="text-gray-500 hover:text-black text-xs transition-colors font-mono"
                          >
                            delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
