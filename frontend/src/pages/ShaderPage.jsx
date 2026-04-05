import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import ShaderCanvas from '../components/ShaderCanvas';
import { getShader, deleteShader, likeShader, getComments, addComment, deleteComment } from '../api';
import { useAuth } from '../contexts/AuthContext';

function fmtDate(ts) {
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ShaderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [shader, setShader] = useState(null);
  const [liked, setLiked] = useState(false);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState('');
  const [commentError, setCommentError] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Use ref to ensure we only fetch once, preventing double view count in strict mode
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    (async () => {
      try {
        const { data } = await getShader(id);
        setShader(data.shader);
        setLiked(data.shader.liked || false);
        const { data: cd } = await getComments(id);
        setComments(cd.comments);
      } catch {
        setError('Shader not found or has been removed.');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const handleLike = async () => {
    if (!user) return navigate('/login');
    try {
      const { data } = await likeShader(id);
      setLiked(data.liked);
      setShader(s => ({ ...s, likes_count: s.likes_count + (data.liked ? 1 : -1) }));
    } catch {}
  };

  const handleDelete = async () => {
    if (!confirm('Delete this shader permanently?')) return;
    await deleteShader(id);
    navigate('/');
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentError('');
    setSubmittingComment(true);
    try {
      const { data } = await addComment(id, commentText.trim());
      setComments(c => [...c, data.comment]);
      setCommentText('');
    } catch (err) {
      setCommentError(err.response?.data?.error || 'Failed to post comment');
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (cid) => {
    await deleteComment(id, cid);
    setComments(c => c.filter(x => x.id !== cid));
  };

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-12">
      <div className="card h-96 animate-pulse bg-gray-100" />
    </div>
  );
  if (error || !shader) return (
    <div className="max-w-6xl mx-auto px-4 py-24 text-center text-gray-500">
      <div className="text-4xl mb-3">🔍</div>
      <div className="text-gray-600 font-display text-xl">{error || 'Shader not found'}</div>
      <Link to="/" className="btn-ghost mt-6 inline-block">← Back to Gallery</Link>
    </div>
  );

  const isOwner = user?.id === shader.author_id;
  const isAdmin = user?.role === 'admin';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-slide-up bg-white">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6 pb-6 border-b border-gray-300">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={`badge text-xs font-mono
              ${shader.shader_type === 'compute' ? 'bg-gray-200 text-black border border-gray-400' : 'bg-white text-black border border-gray-300'}`}>
              {shader.shader_type}
            </span>
            {!shader.is_active && (
              <span className="badge bg-gray-200 text-black border border-gray-400 text-xs">inactive</span>
            )}
          </div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-black leading-tight">
            {shader.title}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
            <Link to={`/user/${shader.author_id}`} className="hover:text-black transition-colors font-mono">
              @{shader.author_name}
            </Link>
            <span>·</span>
            <span>{fmtDate(shader.created_at)}</span>
            <span>·</span>
            <span>👁 {shader.views}</span>
          </div>
          {shader.description && (
            <p className="text-gray-600 mt-3 max-w-2xl leading-relaxed">{shader.description}</p>
          )}
          {shader.tags?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {shader.tags.map(t => <span key={t} className="tag">{t}</span>)}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleLike} className={`btn ${liked ? 'bg-gray-200 text-black border border-gray-400' : 'btn-ghost'}`}>
            {liked ? '♥' : '♡'} {shader.likes_count}
          </button>
          {(isOwner || isAdmin) && (
            <>
              <Link to={`/shader/${id}/edit`} className="btn-ghost text-sm">Edit</Link>
              <button onClick={handleDelete} className="btn-danger text-sm">Delete</button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Canvas */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono text-gray-500">RENDER OUTPUT</span>
            <button
              onClick={() => setFullscreen(f => !f)}
              className="text-xs text-gray-500 hover:text-black transition-colors font-mono"
            >
              fullscreen
            </button>
          </div>
          <ShaderCanvas
            code={shader.fragment_code || shader.compute_code}
            height={420}
            autoPlay
            className="border border-gray-300"
          />
        </div>

        {/* Code */}
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-gray-500">GLSL SOURCE</span>
          </div>
          <pre className="bg-gray-50 border border-gray-300 p-4 overflow-auto text-xs font-mono text-black leading-relaxed"
            style={{ maxHeight: 420, minHeight: 200 }}>
            <code>{shader.fragment_code || shader.compute_code}</code>
          </pre>
        </div>
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <div className="fixed inset-0 bg-black z-50 flex flex-col" onClick={() => setFullscreen(false)}>
          <button className="absolute top-4 right-4 text-gray-400 hover:text-white font-mono z-10 text-lg">✕</button>
          <ShaderCanvas
            code={shader.fragment_code || shader.compute_code}
            height="100vh"
            autoPlay
          />
        </div>
      )}

      {/* Comments */}
      <div className="mt-12">
        <div className="flex items-center gap-3 mb-6">
          <h2 className="font-display text-xl font-semibold text-black">
            Comments <span className="text-gray-500 font-mono text-sm">({comments.length})</span>
          </h2>
        </div>

        {user ? (
          <form onSubmit={handleComment} className="mb-8">
            <textarea
              className="input resize-none mb-2"
              rows={3}
              placeholder="Leave a comment…"
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              maxLength={1000}
            />
            {commentError && <p className="text-gray-600 text-xs mb-2">{commentError}</p>}
            <div className="flex justify-end">
              <button type="submit" disabled={submittingComment || !commentText.trim()} className="btn-primary text-sm disabled:opacity-50">
                {submittingComment ? 'Posting…' : 'Post Comment'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-gray-500 text-sm mb-8">
            <Link to="/login" className="text-black hover:underline">Sign in</Link> to leave a comment
          </p>
        )}

        {comments.length === 0 ? (
          <p className="text-gray-500 text-sm">No comments yet. Be the first!</p>
        ) : (
          <div className="space-y-4">
            {comments.map(c => (
              <div key={c.id} className="card p-4 flex items-start gap-3 bg-gray-50">
                <div className="w-8 h-8 bg-black text-white border border-black flex items-center justify-center text-xs font-mono shrink-0">
                  {c.author_name[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-black">@{c.author_name}</span>
                    <span className="text-gray-500 text-xs">{fmtDate(c.created_at)}</span>
                  </div>
                  <p className="text-black text-sm leading-relaxed whitespace-pre-wrap">{c.content}</p>
                </div>
                {(user?.id === c.author_id || user?.role === 'admin') && (
                  <button onClick={() => handleDeleteComment(c.id)} className="text-gray-400 hover:text-black text-xs transition-colors shrink-0">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
