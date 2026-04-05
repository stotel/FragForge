const { createClient } = require('@libsql/client');
const path = require('path');
const fs = require('fs');

const dataDir = path.join(__dirname, '../../data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = createClient({ url: `file:${path.join(dataDir, 'fragforge.db')}` });

const SCHEMA_STMTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, role TEXT DEFAULT 'user', is_verified INTEGER DEFAULT 0,
    verification_token TEXT, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS shaders (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT DEFAULT '',
    fragment_code TEXT NOT NULL DEFAULT '', compute_code TEXT DEFAULT '',
    shader_type TEXT DEFAULT 'fragment', author_id TEXT NOT NULL,
    is_active INTEGER DEFAULT 1, views INTEGER DEFAULT 0, likes_count INTEGER DEFAULT 0,
    tags TEXT DEFAULT '[]', created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY, shader_id TEXT NOT NULL, author_id TEXT NOT NULL,
    content TEXT NOT NULL, created_at INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS likes (
    user_id TEXT NOT NULL, shader_id TEXT NOT NULL, created_at INTEGER NOT NULL,
    PRIMARY KEY (user_id, shader_id))`,
];

async function initDb() {
  for (const sql of SCHEMA_STMTS) await db.execute(sql);
}

async function get(sql, args = []) {
  const r = await db.execute({ sql, args });
  return r.rows[0] || null;
}

async function all(sql, args = []) {
  const r = await db.execute({ sql, args });
  return r.rows;
}

async function run(sql, args = []) {
  return db.execute({ sql, args });
}

async function scalar(sql, args = []) {
  const row = await get(sql, args);
  return row ? Number(Object.values(row)[0]) : 0;
}

module.exports = { db, initDb, get, all, run, scalar };
