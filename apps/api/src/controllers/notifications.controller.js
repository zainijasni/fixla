const pool = require('../config/db')
const { success } = require('../utils/response')

const getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, is_read } = req.query
    const offset = (page - 1) * limit
    let query = 'SELECT * FROM notifications WHERE user_id = $1'
    const values = [req.user.id]
    let idx = 2
    if (is_read !== undefined) { query += ` AND is_read = $${idx++}`; values.push(is_read === 'true') }
    query += ` ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx++}`
    values.push(limit, offset)
    const { rows } = await pool.query(query, values)
    const { rows: cnt } = await pool.query('SELECT COUNT(*) FROM notifications WHERE user_id = $1 AND is_read = false', [req.user.id])
    return success(res, { notifications: rows, unread_count: Number(cnt[0].count) })
  } catch (err) {
    next(err)
  }
}

const markRead = async (req, res, next) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2', [req.params.id, req.user.id])
    return success(res, { message: 'Marked as read' })
  } catch (err) {
    next(err)
  }
}

const markAllRead = async (req, res, next) => {
  try {
    await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id])
    return success(res, { message: 'All marked as read' })
  } catch (err) {
    next(err)
  }
}

module.exports = { getNotifications, markRead, markAllRead }
