const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Shader = require('../../models/Shader');
const Comment = require('../../models/Comment');
const { scalar } = require('../../config/db');
const { requireAdmin } = require('../../middleware/auth');
const { broadcast } = require('../../events');

router.use(requireAdmin);

router.get('/stats', async (req, res) => {
  const [userCount, shaderCount, activeShaderCount, commentCount, verifiedUserCount] = await Promise.all([
    User.count(),
    scalar('SELECT COUNT(*) as c FROM shaders'),
    scalar('SELECT COUNT(*) as c FROM shaders WHERE is_active=1'),
    Comment.count(),
    scalar('SELECT COUNT(*) as c FROM users WHERE is_verified=1'),
  ]);
  res.json({ userCount, shaderCount, activeShaderCount, commentCount, verifiedUserCount });
});

router.get('/users', async (req, res) => {
  res.json({ users: await User.findAll({ limit: 200 }) });
});

router.patch('/users/:id/role', async (req, res) => {
  const { role } = req.body;
  if (!['user','admin'].includes(role)) return res.status(400).json({ error: 'Invalid role' });
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot change your own role' });
  await User.updateRole(req.params.id, role);
  res.json({ message: 'Role updated' });
});

router.delete('/users/:id', async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete yourself' });
  await User.delete(req.params.id);
  res.json({ message: 'User deleted' });
});

router.get('/shaders', async (req, res) => {
  res.json({ shaders: await Shader.findAll({ activeOnly: false, limit: 200 }) });
});

router.patch('/shaders/:id/active', async (req, res) => {
  const shader = await Shader.findById(req.params.id);
  if (!shader) return res.status(404).json({ error: 'Shader not found' });
  const { is_active } = req.body;
  await Shader.setActive(req.params.id, is_active);
  broadcast({ type: is_active ? 'shader_activated' : 'shader_deactivated', id: req.params.id });
  if (is_active) broadcast({ type: 'shader_created', shader: await Shader.findById(req.params.id) });
  res.json({ message: `Shader ${is_active ? 'activated' : 'deactivated'}` });
});

router.delete('/shaders/:id', async (req, res) => {
  const shader = await Shader.findById(req.params.id);
  if (!shader) return res.status(404).json({ error: 'Shader not found' });
  await Shader.delete(req.params.id);
  broadcast({ type: 'shader_deleted', id: req.params.id });
  res.json({ message: 'Shader deleted' });
});

module.exports = router;
