const { get, all, run, scalar } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

function parseTags(row) {
  if (!row) return row;
  try { row.tags = JSON.parse(row.tags || '[]'); } catch { row.tags = []; }
  return row;
}

class Shader {
  static async create({ title, description='', fragment_code='', compute_code='', shader_type='fragment', author_id, tags=[] }) {
    const id = uuidv4();
    const now = Date.now();
    await run(
      `INSERT INTO shaders (id,title,description,fragment_code,compute_code,shader_type,author_id,tags,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, title, description, fragment_code, compute_code, shader_type, author_id, JSON.stringify(tags), now, now]
    );
    return this.findById(id);
  }

  static async findById(id) {
    const r = await get(
      `SELECT s.*, u.username as author_name FROM shaders s JOIN users u ON s.author_id=u.id WHERE s.id=?`, [id]
    );
    return r ? parseTags(Object.assign({}, r)) : null;
  }

  static async findAll({ limit=20, offset=0, activeOnly=true, search='', authorId='' } = {}) {
    let q = `SELECT s.id,s.title,s.description,s.fragment_code,s.compute_code,s.shader_type,s.author_id,s.is_active,s.views,s.likes_count,s.tags,
             s.created_at,s.updated_at, u.username as author_name
             FROM shaders s JOIN users u ON s.author_id=u.id WHERE 1=1`;
    const p = [];
    if (activeOnly) q += ' AND s.is_active=1';
    if (search) { q += ' AND (s.title LIKE ? OR s.description LIKE ? OR u.username LIKE ?)'; const w=`%${search}%`; p.push(w,w,w); }
    if (authorId) { q += ' AND s.author_id=?'; p.push(authorId); }
    q += ' ORDER BY s.created_at DESC LIMIT ? OFFSET ?';
    p.push(limit, offset);
    const rows = await all(q, p);
    return rows.map(r => parseTags(Object.assign({}, r)));
  }

  static async count({ activeOnly=true, search='' } = {}) {
    let q = 'SELECT COUNT(*) as c FROM shaders s JOIN users u ON s.author_id=u.id WHERE 1=1';
    const p = [];
    if (activeOnly) q += ' AND s.is_active=1';
    if (search) { q += ' AND (s.title LIKE ? OR s.description LIKE ?)'; p.push(`%${search}%`, `%${search}%`); }
    return scalar(q, p);
  }

  static async update(id, { title, description, fragment_code, compute_code, shader_type, tags }) {
    await run(
      `UPDATE shaders SET title=?,description=?,fragment_code=?,compute_code=?,shader_type=?,tags=?,updated_at=? WHERE id=?`,
      [title, description||'', fragment_code||'', compute_code||'', shader_type||'fragment', JSON.stringify(tags||[]), Date.now(), id]
    );
    return this.findById(id);
  }

  static async setActive(id, isActive) {
    await run('UPDATE shaders SET is_active=?, updated_at=? WHERE id=?', [isActive?1:0, Date.now(), id]);
  }

  static async delete(id) { await run('DELETE FROM shaders WHERE id=?', [id]); }

  static async incrementViews(id) { await run('UPDATE shaders SET views=views+1 WHERE id=?', [id]); }

  static async toggleLike(userId, shaderId) {
    const ex = await get('SELECT 1 FROM likes WHERE user_id=? AND shader_id=?', [userId, shaderId]);
    if (ex) {
      await run('DELETE FROM likes WHERE user_id=? AND shader_id=?', [userId, shaderId]);
      await run('UPDATE shaders SET likes_count=MAX(0,likes_count-1) WHERE id=?', [shaderId]);
      return { liked: false };
    }
    await run('INSERT INTO likes (user_id,shader_id,created_at) VALUES (?,?,?)', [userId, shaderId, Date.now()]);
    await run('UPDATE shaders SET likes_count=likes_count+1 WHERE id=?', [shaderId]);
    return { liked: true };
  }

  static async isLikedBy(userId, shaderId) {
    return !!(await get('SELECT 1 FROM likes WHERE user_id=? AND shader_id=?', [userId, shaderId]));
  }
}

module.exports = Shader;
