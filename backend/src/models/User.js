const { get, all, run, scalar } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

class User {
  static async create({ username, email, password, role = 'user', verificationToken = null }) {
    const id = uuidv4();
    const password_hash = bcrypt.hashSync(password, 10);
    const now = Date.now();
    const isVerified = role === 'admin' ? 1 : 0;
    await run(
      `INSERT INTO users (id,username,email,password_hash,role,is_verified,verification_token,created_at,updated_at)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [id, username, email, password_hash, role, isVerified, verificationToken, now, now]
    );
    return this.findById(id);
  }

  static async findById(id) { return get('SELECT * FROM users WHERE id=?', [id]); }
  static async findByEmail(email) { return get('SELECT * FROM users WHERE email=?', [email]); }
  static async findByUsername(username) { return get('SELECT * FROM users WHERE username=?', [username]); }
  static async findByVerificationToken(token) { return get('SELECT * FROM users WHERE verification_token=?', [token]); }

  static async verify(id) {
    await run('UPDATE users SET is_verified=1, verification_token=NULL, updated_at=? WHERE id=?', [Date.now(), id]);
  }

  static async findAll({ limit = 100, offset = 0 } = {}) {
    return all('SELECT id,username,email,role,is_verified,created_at FROM users ORDER BY created_at DESC LIMIT ? OFFSET ?', [limit, offset]);
  }

  static async count() { return scalar('SELECT COUNT(*) as count FROM users'); }

  static async updateRole(id, role) {
    await run('UPDATE users SET role=?, updated_at=? WHERE id=?', [role, Date.now(), id]);
  }

  static async delete(id) { await run('DELETE FROM users WHERE id=?', [id]); }

  static comparePassword(plain, hash) { return bcrypt.compareSync(plain, hash); }

  static safeUser(user) {
    if (!user) return null;
    const { password_hash, verification_token, ...safe } = user;
    // Convert BigInt/numbers from libsql
    return JSON.parse(JSON.stringify(safe));
  }
}

module.exports = User;
