const pool = require('../config/db')
const { success, error } = require('../utils/response')

const respondToReview = async (req, res, next) => {
  try {
    const { rows: pp } = await pool.query('SELECT id FROM provider_profiles WHERE user_id = $1', [req.user.id])
    const { rows } = await pool.query('SELECT * FROM reviews WHERE id = $1 AND provider_id = $2', [req.params.id, pp[0]?.id])
    if (!rows.length) return error(res, 'NOT_FOUND', 'Review tidak dijumpai', 404)
    await pool.query('UPDATE reviews SET provider_response = $1 WHERE id = $2', [req.body.provider_response, req.params.id])
    return success(res, { message: 'Response berjaya disimpan' })
  } catch (err) {
    next(err)
  }
}

const getProviderReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query
    const offset = (page - 1) * limit
    const { rows } = await pool.query(
      `SELECT r.*, u.full_name AS reviewer_name, u.avatar_url AS reviewer_avatar
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.provider_id = $1
       ORDER BY r.created_at DESC LIMIT $2 OFFSET $3`,
      [req.params.id, limit, offset]
    )
    const { rows: stats } = await pool.query(
      'SELECT AVG(rating) AS rating_avg, COUNT(*) AS total FROM reviews WHERE provider_id = $1',
      [req.params.id]
    )
    return success(res, { reviews: rows, rating_avg: stats[0].rating_avg, total: stats[0].total })
  } catch (err) {
    next(err)
  }
}

module.exports = { respondToReview, getProviderReviews }
