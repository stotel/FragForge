const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const User = require('../../models/User');
const { sendVerificationEmail } = require('../../services/email');
const { requireAuth, generateToken, COOKIE_OPTIONS } = require('../../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) return res.status(400).json({ error: 'Username, email and password are required' });
    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) return res.status(400).json({ error: 'Username: 3–30 chars, letters/numbers/underscore only' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email format' });
    if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

    if (await User.findByEmail(email)) return res.status(409).json({ error: 'Email already registered' });
    if (await User.findByUsername(username)) return res.status(409).json({ error: 'Username already taken' });

    const verificationToken = uuidv4();
    await User.create({ username, email, password, verificationToken });
    await sendVerificationEmail(email, username, verificationToken);
    res.status(201).json({ message: 'Registration successful! Check your email (or server console) for the verification link.' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Registration failed' }); }
});

router.post('/verify', async (req, res) => {
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token required' });
  const user = await User.findByVerificationToken(token);
  if (!user) return res.status(400).json({ error: 'Invalid or expired verification token' });
  await User.verify(user.id);
  const updated = await User.findById(user.id);
  const jwt = generateToken(updated);
  res.cookie('token', jwt, COOKIE_OPTIONS);
  res.json({ message: 'Email verified!', user: User.safeUser(updated) });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
  const user = await User.findByEmail(email);
  if (!user || !User.comparePassword(password, user.password_hash))
    return res.status(401).json({ error: 'Invalid email or password' });
  const token = generateToken(user);
  res.cookie('token', token, COOKIE_OPTIONS);
  res.json({ user: User.safeUser(user) });
});

router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

module.exports = router;
