const pool = require('../config/db')
const { success, error } = require('../utils/response')
const { v4: uuidv4 } = require('uuid')

const getConversations = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.id, c.job_id, c.last_message_at,
              jr.title AS job_title, jr.status AS job_status,
              CASE WHEN c.customer_id = $1 THEN u2.full_name ELSE u1.full_name END AS other_name,
              CASE WHEN c.customer_id = $1 THEN u2.avatar_url ELSE u1.avatar_url END AS other_avatar,
              (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) AS last_message,
              (SELECT COUNT(*) FROM messages WHERE conversation_id = c.id AND sender_id != $1 AND is_read = false) AS unread_count
       FROM conversations c
       JOIN job_requests jr ON c.job_id = jr.id
       JOIN users u1 ON c.customer_id = u1.id
       JOIN users u2 ON c.provider_user_id = u2.id
       WHERE c.customer_id = $1 OR c.provider_user_id = $1
       ORDER BY c.last_message_at DESC`,
      [req.user.id]
    )
    return success(res, { conversations: rows })
  } catch (err) {
    next(err)
  }
}

const getMessages = async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query
    const offset = (page - 1) * limit
    const { rows } = await pool.query(
      `SELECT * FROM messages WHERE conversation_id = $1
       ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    )
    await pool.query(
      'UPDATE messages SET is_read = true WHERE conversation_id = $1 AND sender_id != $2',
      [req.params.id, req.user.id]
    )
    return success(res, { messages: rows.reverse() })
  } catch (err) {
    next(err)
  }
}

const sendMessage = async (req, res, next) => {
  try {
    const { content, msg_type } = req.body
    const id = uuidv4()
    const { rows } = await pool.query(
      `INSERT INTO messages (id, conversation_id, sender_id, content, msg_type)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [id, req.params.id, req.user.id, content, msg_type]
    )
    await pool.query('UPDATE conversations SET last_message_at = NOW() WHERE id = $1', [req.params.id])
    try {
      const { getIo } = require('../socket')
      const io = getIo()
      if (io) {
        io.to(`conv:${req.params.id}`).emit('new_message', rows[0])
        const { rows: conv } = await pool.query(
          'SELECT customer_id, provider_user_id FROM conversations WHERE id = $1', [req.params.id]
        )
        if (conv.length) {
          const other = conv[0].customer_id === req.user.id
            ? conv[0].provider_user_id
            : conv[0].customer_id
          io.to(`user:${other}`).emit('new_chat_notification', {
            conversation_id: req.params.id,
            content,
            sender_id: req.user.id
          })
        }
      }
    } catch { /* non-critical */ }
    return success(res, { message: rows[0] }, 201)
  } catch (err) {
    next(err)
  }
}

const createConversation = async (req, res, next) => {
  try {
    const { job_id, provider_id } = req.body
    const { rows: existing } = await pool.query(
      'SELECT * FROM conversations WHERE job_id = $1 AND provider_user_id = $2',
      [job_id, provider_id]
    )
    if (existing.length) return success(res, { conversation: existing[0] })
    const id = uuidv4()
    const { rows } = await pool.query(
      'INSERT INTO conversations (id, job_id, customer_id, provider_user_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [id, job_id, req.user.id, provider_id]
    )
    return success(res, { conversation: rows[0] }, 201)
  } catch (err) {
    next(err)
  }
}

// POST /api/conversations/provider-init — provider initiates pre-bid conversation
const initConversationByProvider = async (req, res, next) => {
  try {
    const { job_id } = req.body
    const { rows: pp } = await pool.query('SELECT id FROM provider_profiles WHERE user_id = $1', [req.user.id])
    if (!pp.length) return error(res, 'NOT_FOUND', 'Profil provider tidak dijumpai', 404)
    const { rows: job } = await pool.query(
      "SELECT customer_id FROM job_requests WHERE id = $1 AND status IN ('open','bidding')",
      [job_id]
    )
    if (!job.length) return error(res, 'NOT_FOUND', 'Job tidak dijumpai atau sudah ditutup', 404)
    const { rows: existing } = await pool.query(
      'SELECT * FROM conversations WHERE job_id = $1 AND provider_user_id = $2',
      [job_id, req.user.id]
    )
    if (existing.length) return success(res, { conversation: existing[0] })
    const id = uuidv4()
    const { rows } = await pool.query(
      'INSERT INTO conversations (id, job_id, customer_id, provider_user_id) VALUES ($1,$2,$3,$4) RETURNING *',
      [id, job_id, job[0].customer_id, req.user.id]
    )
    return success(res, { conversation: rows[0] }, 201)
  } catch (err) {
    next(err)
  }
}

module.exports = { getConversations, getMessages, sendMessage, createConversation, initConversationByProvider }
