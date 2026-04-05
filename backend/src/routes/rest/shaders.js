const express = require('express');
const router = express.Router();
const Shader = require('../../models/Shader');
const Comment = require('../../models/Comment');
const { requireVerified, requireAdmin } = require('../../middleware/auth');
const { broadcast } = require('../../events');

router.get('/', async (req, res) => {
  const { search='', page=1, limit=12 } = req.query;
  const lim = Math.min(parseInt(limit)||12, 50);
  const off = ((parseInt(page)||1)-1)*lim;
  const [shaders, total] = await Promise.all([
    Shader.findAll({ search, limit: lim, offset: off, activeOnly: true }),
    Shader.count({ activeOnly: true, search }),
  ]);
  res.json({ shaders, total, page: parseInt(page), pages: Math.ceil(total/lim) });
});

router.get('/:id', async (req, res) => {
  const shader = await Shader.findById(req.params.id);
  if (!shader) return res.status(404).json({ error: 'Shader not found' });
  const isOwner = req.user?.id === shader.author_id;
  const isAdmin = req.user?.role === 'admin';
  if (!shader.is_active && !isOwner && !isAdmin) return res.status(404).json({ error: 'Shader not found' });
  await Shader.incrementViews(req.params.id);
  const liked = req.user ? await Shader.isLikedBy(req.user.id, shader.id) : false;
  res.json({ shader: { ...shader, liked } });
});

router.post('/', requireVerified, async (req, res) => {
  const { title, description, fragment_code, compute_code, shader_type, tags } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  if (!fragment_code?.trim()) return res.status(400).json({ error: 'Shader code is required' });
  if (title.length > 100) return res.status(400).json({ error: 'Title too long (max 100 chars)' });
  const shader = await Shader.create({
    title: title.trim(), description: (description||'').trim().slice(0,500),
    fragment_code: fragment_code.trim(), compute_code: (compute_code||'').trim(),
    shader_type: shader_type||'fragment', author_id: req.user.id,
    tags: Array.isArray(tags) ? tags.slice(0,10).map(t=>String(t).trim()) : [],
  });
  broadcast({ type: 'shader_created', shader });
  res.status(201).json({ shader });
});

router.put('/:id', requireVerified, async (req, res) => {
  const shader = await Shader.findById(req.params.id);
  if (!shader) return res.status(404).json({ error: 'Shader not found' });
  if (shader.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const { title, description, fragment_code, compute_code, shader_type, tags } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'Title is required' });
  const updated = await Shader.update(shader.id, {
    title: title.trim(), description: (description||'').trim().slice(0,500),
    fragment_code: (fragment_code||'').trim(), compute_code: (compute_code||'').trim(),
    shader_type: shader_type||shader.shader_type,
    tags: Array.isArray(tags) ? tags.slice(0,10) : shader.tags,
  });
  res.json({ shader: updated });
});

router.delete('/:id', requireVerified, async (req, res) => {
  const shader = await Shader.findById(req.params.id);
  if (!shader) return res.status(404).json({ error: 'Shader not found' });
  if (shader.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  await Shader.delete(req.params.id);
  broadcast({ type: 'shader_deleted', id: req.params.id });
  res.json({ message: 'Shader deleted' });
});

router.patch('/:id/active', requireAdmin, async (req, res) => {
  const shader = await Shader.findById(req.params.id);
  if (!shader) return res.status(404).json({ error: 'Shader not found' });
  const { is_active } = req.body;
  await Shader.setActive(req.params.id, is_active);
  broadcast({ type: is_active ? 'shader_activated' : 'shader_deactivated', id: req.params.id });
  if (is_active) broadcast({ type: 'shader_created', shader: await Shader.findById(req.params.id) });
  res.json({ message: `Shader ${is_active ? 'activated' : 'deactivated'}` });
});

router.post('/:id/like', requireVerified, async (req, res) => {
  const shader = await Shader.findById(req.params.id);
  if (!shader || !shader.is_active) return res.status(404).json({ error: 'Shader not found' });
  res.json(await Shader.toggleLike(req.user.id, req.params.id));
});

router.get('/:id/comments', async (req, res) => {
  res.json({ comments: await Comment.findByShader(req.params.id) });
});

router.post('/:id/comments', requireVerified, async (req, res) => {
  const { content } = req.body;
  if (!content?.trim()) return res.status(400).json({ error: 'Comment content required' });
  if (content.length > 1000) return res.status(400).json({ error: 'Comment too long (max 1000 chars)' });
  const shader = await Shader.findById(req.params.id);
  if (!shader || !shader.is_active) return res.status(404).json({ error: 'Shader not found' });
  const comment = await Comment.create({ shader_id: req.params.id, author_id: req.user.id, content: content.trim() });
  res.status(201).json({ comment });
});

router.delete('/:shaderId/comments/:commentId', requireVerified, async (req, res) => {
  const comment = await Comment.findById(req.params.commentId);
  if (!comment) return res.status(404).json({ error: 'Comment not found' });
  if (comment.author_id !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  await Comment.delete(req.params.commentId);
  res.json({ message: 'Comment deleted' });
});

module.exports = router;
