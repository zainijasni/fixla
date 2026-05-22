const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const pool = require('../config/db')
const { signToken } = require('../utils/jwt')
const { success, error } = require('../utils/response')

const registerCustomer = async (req, res, next) => {
  try {
    const { full_name, phone, email, password } = req.body
    const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [phone])
    if (existing.rows.length) return error(res, 'VALIDATION_ERROR', 'Phone sudah didaftarkan', 422)
    const hash = await bcrypt.hash(password, 12)
    const id = uuidv4()
    const { rows } = await pool.query(
      `INSERT INTO users (id, full_name, phone, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5, 'customer') RETURNING id, full_name, role`,
      [id, full_name, phone, email || null, hash]
    )
    const token = signToken({ id: rows[0].id, role: rows[0].role })
    return success(res, { token, user: rows[0] }, 201)
  } catch (err) {
    next(err)
  }
}

const registerProvider = async (req, res, next) => {
  try {
    const { full_name, phone, email, password, business_name, categories } = req.body
    const existing = await pool.query('SELECT id FROM users WHERE phone = $1', [phone])
    if (existing.rows.length) return error(res, 'VALIDATION_ERROR', 'Phone sudah didaftarkan', 422)
    const hash = await bcrypt.hash(password, 12)
    const userId = uuidv4()
    const providerId = uuidv4()
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      const { rows } = await client.query(
        `INSERT INTO users (id, full_name, phone, email, password_hash, role)
         VALUES ($1, $2, $3, $4, $5, 'provider') RETURNING id, full_name, role`,
        [userId, full_name, phone, email || null, hash]
      )
      await client.query(
        `INSERT INTO provider_profiles (id, user_id, business_name, verification_status)
         VALUES ($1, $2, $3, 'pending')`,
        [providerId, userId, business_name]
      )
      // Save selected service categories
      if (categories && categories.length > 0) {
        const catRows = await client.query(
          `SELECT id FROM service_categories WHERE slug = ANY($1::text[])`,
          [categories]
        )
        for (const cat of catRows.rows) {
          await client.query(
            `INSERT INTO provider_categories (provider_id, category_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [providerId, cat.id]
          )
        }
      }
      await client.query('COMMIT')
      const token = signToken({ id: rows[0].id, role: rows[0].role })
      return success(res, { token, user: { ...rows[0], verification_status: 'pending' } }, 201)
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }
  } catch (err) {
    next(err)
  }
}

const login = async (req, res, next) => {
  try {
    const { phone, password } = req.body
    // Normalise: strip all non-digits and any leading zeros, then match both formats
    const stripped = phone.replace(/\D/g, '').replace(/^0+/, '')
    const { rows } = await pool.query(
      `SELECT id, full_name, role, password_hash FROM users
       WHERE phone = $1 OR phone = '0' || $1 OR REGEXP_REPLACE(phone, '^0+', '') = $1`,
      [stripped]
    )
    if (!rows.length) return error(res, 'UNAUTHORIZED', 'Phone atau password salah', 401)
    const valid = await bcrypt.compare(password, rows[0].password_hash)
    if (!valid) return error(res, 'UNAUTHORIZED', 'Phone atau password salah', 401)
    const { password_hash, ...user } = rows[0]
    const token = signToken({ id: user.id, role: user.role })
    return success(res, { token, user })
  } catch (err) {
    next(err)
  }
}

const refresh = async (req, res, next) => {
  try {
    const token = signToken({ id: req.user.id, role: req.user.role })
    return success(res, { token })
  } catch (err) {
    next(err)
  }
}

const logout = async (req, res, next) => {
  try {
    return success(res, { message: 'Logged out' })
  } catch (err) {
    next(err)
  }
}

module.exports = { registerCustomer, registerProvider, login, refresh, logout }
