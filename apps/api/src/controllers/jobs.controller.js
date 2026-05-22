const pool = require('../config/db')
const { success, error } = require('../utils/response')
const { v4: uuidv4 } = require('uuid')

const createJob = async (req, res, next) => {
  try {
    const id = uuidv4()
    const expires = new Date()
    expires.setDate(expires.getDate() + 7)
    const { rows } = await pool.query(
      `INSERT INTO job_requests (id, customer_id, category_id, subcategory_id, title, description,
        location_address, location_lat, location_lng, state, city, postcode, urgency,
        preferred_date, preferred_time, budget_min, budget_max, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
      [id, req.user.id, req.body.category_id, req.body.subcategory_id || null, req.body.title,
        req.body.description, req.body.location_address, req.body.location_lat, req.body.location_lng,
        req.body.state, req.body.city, req.body.postcode, req.body.urgency,
        req.body.preferred_date || null, req.body.preferred_time || null,
        req.body.budget_min || null, req.body.budget_max || null, expires]
    )
    return success(res, { job: rows[0] }, 201)
  } catch (err) {
    next(err)
  }
}

const uploadImages = async (req, res, next) => {
  try {
    if (!req.files || !req.files.length) return error(res, 'VALIDATION_ERROR', 'Gambar diperlukan', 422)
    const images = []
    for (const file of req.files) {
      const id = uuidv4()
      const { rows } = await pool.query(
        'INSERT INTO job_images (id, job_id, image_url) VALUES ($1, $2, $3) RETURNING *',
        [id, req.params.id, file.path]
      )
      images.push(rows[0])
    }
    return success(res, { images }, 201)
  } catch (err) {
    next(err)
  }
}

const getJobs = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10, category_id, state, city, urgency, lat, lng, radius = 20 } = req.query
    const offset = (page - 1) * limit
    let query = `SELECT jr.id, jr.title, jr.urgency, jr.budget_min, jr.budget_max, jr.status,
                   jr.location_address, jr.created_at,
                   sc.name AS category_name,
                   (SELECT COUNT(*) FROM job_bids WHERE job_id = jr.id) AS bids_count
                 FROM job_requests jr
                 LEFT JOIN service_categories sc ON jr.category_id = sc.id
                 WHERE 1=1`
    const values = []
    let idx = 1

    if (req.user.role === 'customer') {
      query += ` AND jr.customer_id = $${idx++}`
      values.push(req.user.id)
    }
    if (req.user.role === 'provider') {
      // Provider hanya nampak job open/bidding dalam radius operasi mereka
      query += ` AND jr.status IN ('open','bidding')`
      const { rows: pp } = await pool.query(
        'SELECT base_lat, base_lng, service_radius_km FROM provider_profiles WHERE user_id = $1',
        [req.user.id]
      )
      if (pp.length && pp[0].base_lat && pp[0].base_lng) {
        const { base_lat, base_lng, service_radius_km } = pp[0]
        const radius = service_radius_km || 30
        query += ` AND (6371 * acos(
          cos(radians(${base_lat})) * cos(radians(jr.location_lat)) *
          cos(radians(jr.location_lng) - radians(${base_lng})) +
          sin(radians(${base_lat})) * sin(radians(jr.location_lat))
        )) <= ${radius}`
      }
    }
    if (status) { query += ` AND jr.status = $${idx++}`; values.push(status) }
    if (category_id) { query += ` AND jr.category_id = $${idx++}`; values.push(category_id) }
    if (state) { query += ` AND jr.state = $${idx++}`; values.push(state) }
    if (city) { query += ` AND jr.city = $${idx++}`; values.push(city) }
    if (urgency) { query += ` AND jr.urgency = $${idx++}`; values.push(urgency) }

    query += ` ORDER BY jr.created_at DESC LIMIT $${idx++} OFFSET $${idx++}`
    values.push(limit, offset)

    const { rows } = await pool.query(query, values)
    return success(res, { jobs: rows, total: rows.length, page: Number(page) })
  } catch (err) {
    next(err)
  }
}

const getJob = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT jr.*, sc.name AS category_name, ss.name AS subcategory_name,
              u.full_name AS customer_name, u.avatar_url AS customer_avatar
       FROM job_requests jr
       LEFT JOIN service_categories sc ON jr.category_id = sc.id
       LEFT JOIN service_subcategories ss ON jr.subcategory_id = ss.id
       LEFT JOIN users u ON jr.customer_id = u.id
       WHERE jr.id = $1`,
      [req.params.id]
    )
    if (!rows.length) return error(res, 'NOT_FOUND', 'Job tidak dijumpai', 404)
    const { rows: images } = await pool.query('SELECT * FROM job_images WHERE job_id = $1', [req.params.id])
    return success(res, { ...rows[0], images })
  } catch (err) {
    next(err)
  }
}

const updateJob = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM job_requests WHERE id = $1 AND customer_id = $2', [req.params.id, req.user.id])
    if (!rows.length) return error(res, 'NOT_FOUND', 'Job tidak dijumpai', 404)
    if (rows[0].status !== 'open') return error(res, 'FORBIDDEN', 'Job tidak boleh dikemaskini', 403)
    const allowed = ['title', 'description', 'urgency', 'budget_min', 'budget_max']
    const fields = []
    const values = []
    let idx = 1
    for (const key of allowed) {
      if (req.body[key] !== undefined) { fields.push(`${key} = $${idx++}`); values.push(req.body[key]) }
    }
    if (!fields.length) return error(res, 'VALIDATION_ERROR', 'Tiada field untuk dikemaskini', 422)
    values.push(req.params.id)
    const { rows: updated } = await pool.query(
      `UPDATE job_requests SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING *`,
      values
    )
    return success(res, { job: updated[0] })
  } catch (err) {
    next(err)
  }
}

const cancelJob = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM job_requests WHERE id = $1 AND customer_id = $2', [req.params.id, req.user.id])
    if (!rows.length) return error(res, 'NOT_FOUND', 'Job tidak dijumpai', 404)
    if (rows[0].status !== 'open') return error(res, 'FORBIDDEN', 'Job tidak boleh dibatalkan', 403)
    await pool.query("UPDATE job_requests SET status = 'cancelled', updated_at = NOW() WHERE id = $1", [req.params.id])
    return success(res, { message: 'Job cancelled' })
  } catch (err) {
    next(err)
  }
}

const completeJob = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM job_requests WHERE id = $1 AND customer_id = $2', [req.params.id, req.user.id])
    if (!rows.length) return error(res, 'NOT_FOUND', 'Job tidak dijumpai', 404)
    await pool.query("UPDATE job_requests SET status = 'completed', updated_at = NOW() WHERE id = $1", [req.params.id])
    return success(res, { status: 'completed' })
  } catch (err) {
    next(err)
  }
}

const submitReview = async (req, res, next) => {
  try {
    const { rating, comment } = req.body
    const { rows: job } = await pool.query(
      "SELECT * FROM job_requests WHERE id = $1 AND customer_id = $2 AND status = 'completed'",
      [req.params.id, req.user.id]
    )
    if (!job.length) return error(res, 'FORBIDDEN', 'Review tidak dibenarkan', 403)
    const { rows: assign } = await pool.query(
      "SELECT provider_id FROM job_assignments WHERE job_id = $1 AND status = 'completed'",
      [req.params.id]
    )
    if (!assign.length) return error(res, 'NOT_FOUND', 'Assignment tidak dijumpai', 404)
    const id = uuidv4()
    const { rows } = await pool.query(
      `INSERT INTO reviews (id, job_id, provider_id, reviewer_id, rating, comment)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, req.params.id, assign[0].provider_id, req.user.id, rating, comment]
    )
    // Update provider rating avg
    await pool.query(
      `UPDATE provider_profiles SET
         rating_avg = (SELECT AVG(rating) FROM reviews WHERE provider_id = $1),
         total_reviews = (SELECT COUNT(*) FROM reviews WHERE provider_id = $1)
       WHERE id = $1`,
      [assign[0].provider_id]
    )
    return success(res, { review: rows[0] }, 201)
  } catch (err) {
    next(err)
  }
}

// GET /api/jobs/my-assignments — active jobs assigned to this technician
const getMyAssignments = async (req, res, next) => {
  try {
    const { rows: pp } = await pool.query('SELECT id FROM provider_profiles WHERE user_id = $1', [req.user.id])
    if (!pp.length) return success(res, { jobs: [] })
    const { rows } = await pool.query(
      `SELECT jr.id, jr.title, jr.status, jr.location_address, jr.location_lat, jr.location_lng,
              jr.state, jr.city, jr.urgency, jr.created_at, jr.updated_at,
              sc.name AS category_name,
              u.full_name AS customer_name, u.phone AS customer_phone,
              ja.agreed_price,
              c.id AS conversation_id
       FROM job_assignments ja
       JOIN job_requests jr ON jr.id = ja.job_id
       LEFT JOIN service_categories sc ON jr.category_id = sc.id
       LEFT JOIN users u ON jr.customer_id = u.id
       LEFT JOIN conversations c ON c.job_id = jr.id AND c.provider_user_id = $2
       WHERE ja.provider_id = $1
         AND jr.status IN ('assigned','otw','in_progress','completed')
       ORDER BY jr.updated_at DESC
       LIMIT 20`,
      [pp[0].id, req.user.id]
    )
    return success(res, { jobs: rows })
  } catch (err) {
    next(err)
  }
}

// PATCH /api/jobs/:id/progress — technician updates job status
const updateJobProgress = async (req, res, next) => {
  try {
    const { status } = req.body
    if (!['otw', 'in_progress', 'completed'].includes(status)) {
      return error(res, 'VALIDATION_ERROR', 'Status tidak sah', 422)
    }
    const { rows: pp } = await pool.query('SELECT id FROM provider_profiles WHERE user_id = $1', [req.user.id])
    if (!pp.length) return error(res, 'NOT_FOUND', 'Profil technician tidak dijumpai', 404)
    // Must be the assigned technician
    const { rows: assign } = await pool.query(
      "SELECT * FROM job_assignments WHERE job_id = $1 AND provider_id = $2",
      [req.params.id, pp[0].id]
    )
    if (!assign.length) return error(res, 'FORBIDDEN', 'Anda bukan technician yang ditetapkan', 403)
    await pool.query(
      "UPDATE job_requests SET status = $1, updated_at = NOW() WHERE id = $2",
      [status, req.params.id]
    )
    // If completed, update assignment record
    if (status === 'completed') {
      await pool.query(
        "UPDATE job_assignments SET status = 'completed', completed_at = NOW() WHERE job_id = $1",
        [req.params.id]
      )
      await pool.query(
        "UPDATE provider_profiles SET total_jobs_completed = total_jobs_completed + 1 WHERE id = $1",
        [pp[0].id]
      )
    }
    // Notify customer of status change via socket
    try {
      const { rows: jobInfo } = await pool.query('SELECT customer_id FROM job_requests WHERE id = $1', [req.params.id])
      if (jobInfo.length) {
        const { getIo } = require('../socket')
        getIo()?.to(`user:${jobInfo[0].customer_id}`).emit('job_status_update', { job_id: req.params.id, status })
      }
    } catch { /* non-critical */ }
    return success(res, { status })
  } catch (err) {
    next(err)
  }
}

module.exports = { createJob, uploadImages, getJobs, getJob, updateJob, cancelJob, completeJob, submitReview, getMyAssignments, updateJobProgress }
