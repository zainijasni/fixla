const pool = require('../config/db')
const { success, error } = require('../utils/response')

const startJob = async (req, res, next) => {
  try {
    const { rows: pp } = await pool.query('SELECT id FROM provider_profiles WHERE user_id = $1', [req.user.id])
    const { rows } = await pool.query(
      "SELECT * FROM job_assignments WHERE id = $1 AND provider_id = $2 AND status = 'assigned'",
      [req.params.id, pp[0]?.id]
    )
    if (!rows.length) return error(res, 'NOT_FOUND', 'Assignment tidak dijumpai', 404)
    const now = new Date()
    await pool.query("UPDATE job_assignments SET status = 'in_progress', started_at = $1 WHERE id = $2", [now, req.params.id])
    await pool.query("UPDATE job_requests SET status = 'in_progress' WHERE id = $1", [rows[0].job_id])
    return success(res, { status: 'in_progress', started_at: now })
  } catch (err) {
    next(err)
  }
}

const completeAssignment = async (req, res, next) => {
  try {
    const { rows: pp } = await pool.query('SELECT id FROM provider_profiles WHERE user_id = $1', [req.user.id])
    const { rows } = await pool.query(
      "SELECT * FROM job_assignments WHERE id = $1 AND provider_id = $2 AND status = 'in_progress'",
      [req.params.id, pp[0]?.id]
    )
    if (!rows.length) return error(res, 'NOT_FOUND', 'Assignment tidak dijumpai', 404)
    const now = new Date()
    await pool.query("UPDATE job_assignments SET status = 'completed', completed_at = $1 WHERE id = $2", [now, req.params.id])
    await pool.query('UPDATE provider_profiles SET total_jobs_completed = total_jobs_completed + 1 WHERE id = $1', [pp[0].id])
    return success(res, { status: 'completed', completed_at: now })
  } catch (err) {
    next(err)
  }
}

module.exports = { startJob, completeAssignment }
