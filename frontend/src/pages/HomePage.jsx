import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ShaderCard from '../components/ShaderCard';
import { getShaders } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function HomePage() {
  const { user } = useAuth();
  const [shaders, setShaders] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const searchTimer = useRef(null);
  const esRef = useRef(null);

  const fetchShaders = useCallback(async (q = search, p = 1) => {
    setLoading(true);
    try {
      const { data } = await getShaders({ search: q, page: p, limit: 12 });
      setShaders(data.shaders);
      setTotal(data.total);
      setPage(data.page);
      setPages(data.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchShaders('', 1); }, []);

  // SSE — auto-refresh when new shaders are posted by anyone
  useEffect(() => {
    const es = new EventSource('/api/events');
    esRef.current = es;

    es.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.type === 'shader_created' && page === 1 && !search) {
        setShaders(prev => {
          if (prev.find(s => s.id === data.shader.id)) return prev;
          return [data.shader, ...prev.slice(0, 11)];
        });
        setTotal(t => t + 1);
      }
      if (data.type === 'shader_deleted' || data.type === 'shader_deactivated') {
        setShaders(prev => prev.filter(s => s.id !== data.id));
        setTotal(t => Math.max(0, t - 1));
      }
    };
    return () => es.close();
  }, [page, search]);

  const handleSearch = (e) => {
    const val = e.target.value;
    setSearch(val);
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchShaders(val, 1), 350);
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="text-center mb-14 animate-slide-up border-b border-gray-300 pb-12">
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-4 tracking-tight text-black">
            FragForge
          </h1>
          <p className="text-gray-600 text-lg md:text-xl font-body max-w-xl mx-auto leading-relaxed">
            Funny
          </p>
          {!user && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <Link to="/register" className="btn-primary px-6 py-2.5 text-sm font-semibold">
                Start Creating
              </Link>
              <Link to="/playground" className="btn-ghost px-6 py-2.5 text-sm">
                Try Playground
              </Link>
            </div>
          )}
          {user && (
            <Link to="/new" className="inline-block mt-8 btn-primary px-8 py-2.5 text-sm font-semibold">
              + New Shader
            </Link>
          )}
        </div>

        {/* Search + count */}
        <div className="flex items-center gap-4 mb-8">
          <div className="relative flex-1 max-w-sm">
            <input
              className="input"
              placeholder="Search shaders, authors…"
              value={search}
              onChange={handleSearch}
            />
          </div>
          <span className="text-gray-500 text-sm font-mono hidden sm:block">
            {loading ? '…' : `${total} shader${total !== 1 ? 's' : ''}`}
          </span>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="card h-72 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : shaders.length === 0 ? (
          <div className="text-center py-24 text-gray-500">
            <div className="font-display text-lg text-gray-600">No shaders found</div>
            {search && <div className="text-sm mt-1">Try a different search term</div>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {shaders.map(s => <ShaderCard key={s.id} shader={s} />)}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-10">
            <button
              onClick={() => { const p = page - 1; setPage(p); fetchShaders(search, p); }}
              disabled={page <= 1}
              className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Prev
            </button>
            {Array.from({ length: Math.min(pages, 7) }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => { setPage(p); fetchShaders(search, p); }}
                className={`w-8 h-8 text-xs font-mono transition-colors
                  ${p === page ? 'bg-black text-white font-bold' : 'text-gray-500 hover:text-black hover:bg-gray-200'}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => { const p = page + 1; setPage(p); fetchShaders(search, p); }}
              disabled={page >= pages}
              className="btn-ghost text-xs disabled:opacity-30 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
