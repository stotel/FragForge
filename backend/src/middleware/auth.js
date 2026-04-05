const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SECRET = () => process.env.JWT_SECRET || 'fragforge-dev-secret';

async function authMiddleware(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  if (!token) { req.user = null; return next(); }
  try {
    const decoded = jwt.verify(token, SECRET());
    const user = await User.findById(decoded.id);
    req.user = user ? User.safeUser(user) : null;
  } catch { req.user = null; }
  next();
}

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

function requireVerified(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (!req.user.is_verified) return res.status(403).json({ error: 'Email verification required' });
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
}

function generateToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, SECRET(), { expiresIn: '7d' });
}

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

module.exports = { authMiddleware, requireAuth, requireVerified, requireAdmin, generateToken, COOKIE_OPTIONS };
