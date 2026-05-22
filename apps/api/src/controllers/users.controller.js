const bcrypt = require('bcryptjs')
const pool = require('../config/db')
const { success, error } = require('../utils/response')

const getMe = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, full_name, phone, email, role, avatar_url, is_verified, created_at FROM users WHERE id = $1',
      [req.user.id]
    )
    if (!rows.length) return error(res, 'NOT_FOUND', 'User tidak dijumpai', 404)
    return success(res, { user: rows[0] })
  } catch (err) {
    next(err)
  }
}

const updateMe = async (req, res, next) => {
  try {
    const fields = []
    const values = []
    let idx = 1
    for (const key of ['full_name', 'email', 'avatar_url']) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${idx++}`)
        values.push(req.body[key])
      }
    }
    if (!fields.length) return error(res, 'VALIDATION_ERROR', 'Tiada field untuk dikemaskini', 422)
    values.push(req.user.id)
    const { rows } = await pool.query(
      `UPDATE users SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id, full_name, email, avatar_url`,
      values
    )
    return success(res, { user: rows[0] })
  } catch (err) {
    next(err)
  }
}

const changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id = $1', [req.user.id])
    const valid = await bcrypt.compare(current_password, rows[0].password_hash)
    if (!valid) return error(res, 'UNAUTHORIZED', 'Password semasa tidak betul', 401)
    const hash = await bcrypt.hash(new_password, 12)
    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id])
    return success(res, { message: 'Password berjaya ditukar' })
  } catch (err) {
    next(err)
  }
}

module.exports = { getMe, updateMe, changePassword }
