const pool = require('../config/db')
const bcrypt = require('bcryptjs')
const { success, error } = require('../utils/response')

const getUsers = async (req, res, next) => {
  try {
    const { role, is_verified, page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit
    let query = `
      SELECT u.id, u.full_name, u.phone, u.email, u.role, u.is_verified, u.created_at,
             pp.id AS provider_profile_id, pp.business_name, pp.verification_status
      FROM users u
      LEFT JOIN provider_profiles pp ON pp.user_id = u.id
      WHERE 1=1`
    const values = []
    let idx = 1
    if (role) { query += ` AND u.role = $${idx++}`; values.push(role) }
    if (is_verified !== undefined) { query += ` AND u.is_verified = $${idx++}`; values.push(is_verified === 'true') }
    query += ` ORDER BY u.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`
    values.push(limit, offset)
    const { rows } = await pool.query(query, values)
    return success(res, { users: rows })
  } catch (err) {
    next(err)
  }
}

const verifyProvider = async (req, res, next) => {
  try {
    const { verification_status, note } = req.body
    await pool.query(
      'UPDATE provider_profiles SET verification_status = $1, updated_at = NOW() WHERE id = $2',
      [verification_status, req.params.id]
    )
    if (verification_status === 'verified') {
      await pool.query('UPDATE users SET is_verified = true WHERE id = (SELECT user_id FROM provider_profiles WHERE id = $1)', [req.params.id])
    }
    return success(res, { message: `Provider ${verification_status}` })
  } catch (err) {
    next(err)
  }
}

const getAllJobs = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query
    const offset = (page - 1) * limit
    const { rows } = await pool.query(
      `SELECT jr.*, u.full_name AS customer_name FROM job_requests jr
       JOIN users u ON jr.customer_id = u.id
       ORDER BY jr.created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    return success(res, { jobs: rows })
  } catch (err) {
    next(err)
  }
}

const getStats = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const [users, providers, customers, jobs, completed, open, newUsersToday, newJobsToday] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE role != 'admin'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'provider'"),
      pool.query("SELECT COUNT(*) FROM users WHERE role = 'customer'"),
      pool.query('SELECT COUNT(*) FROM job_requests'),
      pool.query("SELECT COUNT(*) FROM job_requests WHERE status = 'completed'"),
      pool.query("SELECT COUNT(*) FROM job_requests WHERE status = 'open'"),
      pool.query(`SELECT COUNT(*) FROM users WHERE created_at::date = '${today}'`),
      pool.query(`SELECT COUNT(*) FROM job_requests WHERE created_at::date = '${today}'`)
    ])
    return success(res, {
      total_users: Number(users.rows[0].count),
      total_providers: Number(providers.rows[0].count),
      total_customers: Number(customers.rows[0].count),
      total_jobs: Number(jobs.rows[0].count),
      jobs_completed: Number(completed.rows[0].count),
      jobs_open: Number(open.rows[0].count),
      new_users_today: Number(newUsersToday.rows[0].count),
      new_jobs_today: Number(newJobsToday.rows[0].count)
    })
  } catch (err) {
    next(err)
  }
}

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params
    if (id === req.user.id) return error(res, 'FORBIDDEN', 'Tidak boleh padam akaun sendiri', 403)
    await pool.query('DELETE FROM users WHERE id = $1', [id])
    return success(res, { message: 'User berjaya dipadam' })
  } catch (err) {
    next(err)
  }
}

const getAllConversations = async (req, res, next) => {
  try {
    const { page = 1, limit = 30 } = req.query
    const offset = (page - 1) * limit
    const { rows } = await pool.query(
      `SELECT c.id, c.created_at,
              jr.title AS job_title, jr.status AS job_status,
              cu.full_name AS customer_name, cu.phone AS customer_phone,
              pu.full_name AS provider_name, pu.phone AS provider_phone,
              (SELECT COUNT(*) FROM messages m WHERE m.conversation_id = c.id) AS message_count,
              (SELECT m.content FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message,
              (SELECT m.created_at FROM messages m WHERE m.conversation_id = c.id ORDER BY m.created_at DESC LIMIT 1) AS last_message_at
       FROM conversations c
       JOIN job_requests jr ON jr.id = c.job_id
       JOIN users cu ON cu.id = c.customer_id
       JOIN users pu ON pu.id = c.provider_user_id
       ORDER BY COALESCE(last_message_at, c.created_at) DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    )
    return success(res, { conversations: rows })
  } catch (err) {
    next(err)
  }
}

const editUser = async (req, res, next) => {
  try {
    const { full_name, email, new_password, is_verified } = req.body
    const sets = []
    const values = []
    let idx = 1

    if (full_name)              { sets.push(`full_name = $${idx++}`);     values.push(full_name) }
    if (email !== undefined)    { sets.push(`email = $${idx++}`);         values.push(email || null) }
    if (is_verified !== undefined) { sets.push(`is_verified = $${idx++}`); values.push(is_verified) }
    if (new_password) {
      const hash = await bcrypt.hash(new_password, 12)
      sets.push(`password_hash = $${idx++}`)
      values.push(hash)
    }

    if (sets.length === 0) return success(res, { message: 'Nothing to update' })

    sets.push(`updated_at = NOW()`)
    values.push(req.params.id)
    const { rows } = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${idx} RETURNING id, full_name, email, role, is_verified`,
      values
    )
    return success(res, { user: rows[0] })
  } catch (err) {
    next(err)
  }
}

module.exports = { getUsers, verifyProvider, getAllJobs, getStats, editUser, deleteUser, getAllConversations }
