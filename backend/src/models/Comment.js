const { get, all, run, scalar } = require('../config/db');
const { v4: uuidv4 } = require('uuid');

class Comment {
  static async create({ shader_id, author_id, content }) {
    const id = uuidv4();
    await run('INSERT INTO comments (id,shader_id,author_id,content,created_at) VALUES (?,?,?,?,?)',
      [id, shader_id, author_id, content, Date.now()]);
    return this.findById(id);
  }

  static async findById(id) {
    return get(`SELECT c.*,u.username as author_name FROM comments c JOIN users u ON c.author_id=u.id WHERE c.id=?`, [id]);
  }

  static async findByShader(shader_id) {
    return all(`SELECT c.*,u.username as author_name FROM comments c JOIN users u ON c.author_id=u.id
                WHERE c.shader_id=? ORDER BY c.created_at ASC`, [shader_id]);
  }

  static async delete(id) { await run('DELETE FROM comments WHERE id=?', [id]); }
  static async count() { return scalar('SELECT COUNT(*) as c FROM comments'); }
}

module.exports = Comment;
