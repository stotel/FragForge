import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import ShaderEditor from '../components/ShaderEditor';
import { createShader, updateShader, getShader } from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function ShaderFormPage({ mode = 'new' }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [form, setForm] = useState({
    title: '',
    description: '',
    fragment_code: '',
    shader_type: 'fragment',
    tags: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(mode === 'edit');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (mode === 'edit' && id) {
      getShader(id).then(({ data }) => {
        const s = data.shader;
        if (s.author_id !== user.id && user.role !== 'admin') { navigate('/'); return; }
        setForm({
          title: s.title,
          description: s.description || '',
          fragment_code: s.fragment_code || '',
          shader_type: s.shader_type || 'fragment',
          tags: (s.tags || []).join(', '),
        });
      }).catch(() => navigate('/')).finally(() => setLoading(false));
    }
  }, [user, mode, id, navigate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.title.trim()) return 'Title is required';
    if (form.title.length > 100) return 'Title must be ≤ 100 characters';
    if (!form.fragment_code.trim()) return 'Shader code is required';
    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      };
      const { data } = mode === 'edit'
        ? await updateShader(id, payload)
        : await createShader(payload);
      navigate(`/shader/${data.shader.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save shader');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12"><div className="card h-64 animate-pulse bg-gray-100" /></div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 animate-slide-up bg-white">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-black transition-colors text-sm font-mono">
          ←
        </button>
        <h1 className="font-display text-3xl font-bold text-black">
          {mode === 'edit' ? 'Edit Shader' : 'New Shader'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-mono text-gray-500 mb-1.5 uppercase tracking-wider">Title *</label>
            <input
              className={`input ${!form.title && error ? 'border-gray-500' : ''}`}
              placeholder="My awesome shader"
              value={form.title}
              onChange={e => set('title', e.target.value)}
              maxLength={100}
              required
            />
          </div>

          {/* Shader type */}
          <div>
            <label className="block text-xs font-mono text-gray-500 mb-1.5 uppercase tracking-wider">Type</label>
            <select
              className="input"
              value={form.shader_type}
              onChange={e => set('shader_type', e.target.value)}
            >
              <option value="fragment">Fragment Shader</option>
              <option value="compute">Compute Shader</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-mono text-gray-500 mb-1.5 uppercase tracking-wider">Description</label>
          <textarea
            className="input resize-none"
            rows={2}
            placeholder="What does your shader do?"
            value={form.description}
            onChange={e => set('description', e.target.value)}
            maxLength={500}
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-mono text-gray-500 mb-1.5 uppercase tracking-wider">
            Tags <span className="text-gray-400">(comma separated)</span>
          </label>
          <input
            className="input"
            placeholder="raymarching, fractal, noise…"
            value={form.tags}
            onChange={e => set('tags', e.target.value)}
          />
        </div>

        {/* GLSL Editor */}
        <div>
          <label className="block text-xs font-mono text-gray-500 mb-1.5 uppercase tracking-wider">Shader Code *</label>
          <ShaderEditor
            value={form.fragment_code}
            onChange={v => set('fragment_code', v)}
            shaderType={form.shader_type}
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-gray-100 border border-gray-400 text-black px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Submit */}
        <div className="flex items-center gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary px-8 py-2.5 disabled:opacity-50">
            {saving ? 'Saving…' : mode === 'edit' ? 'Save Changes' : 'Publish Shader'}
          </button>
          <button type="button" onClick={() => navigate(-1)} className="btn-ghost">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
