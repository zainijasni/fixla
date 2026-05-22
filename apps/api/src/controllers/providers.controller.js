const pool = require('../config/db')
const { success, error } = require('../utils/response')
const { v4: uuidv4 } = require('uuid')

const getMyProfile = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT pp.*, u.full_name, u.avatar_url FROM provider_profiles pp
       JOIN users u ON pp.user_id = u.id WHERE pp.user_id = $1`,
      [req.user.id]
    )
    if (!rows.length) return error(res, 'NOT_FOUND', 'Profil provider tidak dijumpai', 404)
    return success(res, rows[0])
  } catch (err) {
    next(err)
  }
}

const updateMyProfile = async (req, res, next) => {
  try {
    const fields = []
    const values = []
    let idx = 1
    const allowed = ['business_name', 'bio', 'years_experience', 'base_address', 'base_lat', 'base_lng', 'service_radius_km']
    for (const key of allowed) {
      if (req.body[key] !== undefined) {
        fields.push(`${key} = $${idx++}`)
        values.push(req.body[key])
      }
    }
    if (!fields.length) return error(res, 'VALIDATION_ERROR', 'Tiada field untuk dikemaskini', 422)
    values.push(req.user.id)
    const { rows } = await pool.query(
      `UPDATE provider_profiles SET ${fields.join(', ')}, updated_at = NOW() WHERE user_id = $${idx} RETURNING *`,
      values
    )
    return success(res, { profile: rows[0] })
  } catch (err) {
    next(err)
  }
}

const toggleStatus = async (req, res, next) => {
  try {
    const { is_online } = req.body
    await pool.query('UPDATE provider_profiles SET is_online = $1 WHERE user_id = $2', [is_online, req.user.id])
    return success(res, { is_online })
  } catch (err) {
    next(err)
  }
}

const uploadDocument = async (req, res, next) => {
  try {
    const { doc_type } = req.body
    if (!req.file) return error(res, 'VALIDATION_ERROR', 'File diperlukan', 422)
    const id = uuidv4()
    const { rows: pp } = await pool.query('SELECT id FROM provider_profiles WHERE user_id = $1', [req.user.id])
    if (!pp.length) return error(res, 'NOT_FOUND', 'Provider tidak dijumpai', 404)
    const { rows } = await pool.query(
      `INSERT INTO provider_documents (id, provider_id, doc_type, file_url)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [id, pp[0].id, doc_type, req.file.path]
    )
    return success(res, { document: rows[0] }, 201)
  } catch (err) {
    next(err)
  }
}

const getNearby = async (req, res, next) => {
  try {
    const { lat, lng, radius = 20, category_id, limit = 20, page = 1 } = req.query
    if (!lat || !lng) return error(res, 'VALIDATION_ERROR', 'lat dan lng diperlukan', 422)
    const offset = (page - 1) * limit
    const { rows } = await pool.query(
      `SELECT pp.id, pp.business_name, pp.rating_avg, pp.total_reviews, pp.is_online, pp.is_featured,
              u.avatar_url,
              (6371 * acos(cos(radians($1)) * cos(radians(pp.base_lat)) *
               cos(radians(pp.base_lng) - radians($2)) + sin(radians($1)) * sin(radians(pp.base_lat)))) AS distance_km
       FROM provider_profiles pp
       JOIN users u ON pp.user_id = u.id
       WHERE pp.verification_status = 'verified' AND pp.is_online = true
         AND pp.base_lat IS NOT NULL AND pp.base_lng IS NOT NULL
         AND (6371 * acos(cos(radians($1)) * cos(radians(pp.base_lat)) *
              cos(radians(pp.base_lng) - radians($2)) + sin(radians($1)) * sin(radians(pp.base_lat)))) <= $3
       ORDER BY pp.is_featured DESC, distance_km ASC
       LIMIT $4 OFFSET $5`,
      [lat, lng, radius, limit, offset]
    )
    return success(res, { providers: rows, total: rows.length, page: Number(page) })
  } catch (err) {
    next(err)
  }
}

const getPublicProfile = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT pp.id, pp.business_name, pp.bio, pp.years_experience, pp.rating_avg,
              pp.total_reviews, pp.total_jobs_completed, pp.is_featured, pp.verification_status,
              u.avatar_url
       FROM provider_profiles pp
       JOIN users u ON pp.user_id = u.id WHERE pp.id = $1`,
      [req.params.id]
    )
    if (!rows.length) return error(res, 'NOT_FOUND', 'Provider tidak dijumpai', 404)
    return success(res, rows[0])
  } catch (err) {
    next(err)
  }
}

module.exports = { getMyProfile, updateMyProfile, toggleStatus, uploadDocument, getNearby, getPublicProfile }
