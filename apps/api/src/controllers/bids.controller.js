const pool = require('../config/db')
const { success, error } = require('../utils/response')
const { v4: uuidv4 } = require('uuid')
const { getIo } = require('../socket')

const placeBid = async (req, res, next) => {
  try {
    const { proposed_price, estimated_duration, message } = req.body
    const jobId = req.params.jobId
    const { rows: job } = await pool.query(
      "SELECT * FROM job_requests WHERE id = $1 AND status IN ('open','bidding')",
      [jobId]
    )
    if (!job.length) return error(res, 'NOT_FOUND', 'Job tidak dijumpai atau sudah ditutup', 404)
    const { rows: pp } = await pool.query('SELECT id FROM provider_profiles WHERE user_id = $1', [req.user.id])
    if (!pp.length) return error(res, 'NOT_FOUND', 'Provider profile tidak dijumpai', 404)
    const existing = await pool.query(
      "SELECT id FROM job_bids WHERE job_id = $1 AND provider_id = $2",
      [jobId, pp[0].id]
    )
    if (existing.rows.length) return error(res, 'VALIDATION_ERROR', 'Anda sudah bid untuk job ini', 422)
    const id = uuidv4()
    const { rows } = await pool.query(
      `INSERT INTO job_bids (id, job_id, provider_id, proposed_price, estimated_duration, message)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, jobId, pp[0].id, proposed_price, estimated_duration || null, message || null]
    )
    await pool.query("UPDATE job_requests SET status = 'bidding' WHERE id = $1 AND status = 'open'", [jobId])
    return success(res, { bid: rows[0] }, 201)
  } catch (err) {
    next(err)
  }
}

const getJobBids = async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      `SELECT jb.*, pp.business_name, pp.rating_avg, pp.total_reviews,
              u.full_name, u.avatar_url
       FROM job_bids jb
       JOIN provider_profiles pp ON jb.provider_id = pp.id
       JOIN users u ON pp.user_id = u.id
       WHERE jb.job_id = $1
       ORDER BY jb.created_at ASC`,
      [req.params.jobId]
    )
    return success(res, { bids: rows })
  } catch (err) {
    next(err)
  }
}

const acceptBid = async (req, res, next) => {
  try {
    const { rows: bid } = await pool.query(
      "SELECT * FROM job_bids WHERE id = $1 AND status = 'pending'",
      [req.params.id]
    )
    if (!bid.length) return error(res, 'NOT_FOUND', 'Bid tidak dijumpai', 404)
    const { rows: job } = await pool.query(
      'SELECT * FROM job_requests WHERE id = $1 AND customer_id = $2',
      [bid[0].job_id, req.user.id]
    )
    if (!job.length) return error(res, 'FORBIDDEN', 'Tidak dibenarkan', 403)
    const client = await pool.connect()
    let assignment
    let rejectedProviderIds = []
    try {
      await client.query('BEGIN')
      await client.query("UPDATE job_bids SET status = 'accepted' WHERE id = $1", [req.params.id])
      const { rows: rejectedBids } = await client.query(
        "UPDATE job_bids SET status = 'rejected' WHERE job_id = $1 AND id != $2 AND status = 'pending' RETURNING provider_id",
        [bid[0].job_id, req.params.id]
      )
      rejectedProviderIds = rejectedBids.map(r => r.provider_id)
      await client.query("UPDATE job_requests SET status = 'assigned' WHERE id = $1", [bid[0].job_id])
      const id = uuidv4()
      const { rows } = await client.query(
        `INSERT INTO job_assignments (id, job_id, provider_id, bid_id, agreed_price)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [id, bid[0].job_id, bid[0].provider_id, req.params.id, bid[0].proposed_price]
      )
      await client.query('COMMIT')
      assignment = rows[0]
    } catch (e) {
      await client.query('ROLLBACK')
      throw e
    } finally {
      client.release()
    }

    // Auto-create conversation (non-critical, separate from transaction)
    let conversationId = null
    try {
      const { rows: providerUser } = await pool.query(
        'SELECT user_id FROM provider_profiles WHERE id = $1',
        [bid[0].provider_id]
      )
      if (providerUser.length) {
        const provUserid = providerUser[0].user_id
        const { rows: existingConv } = await pool.query(
          'SELECT id FROM conversations WHERE job_id = $1 AND provider_user_id = $2',
          [bid[0].job_id, provUserid]
        )
        if (existingConv.length) {
          conversationId = existingConv[0].id
        } else {
          const convId = uuidv4()
          await pool.query(
            'INSERT INTO conversations (id, job_id, customer_id, provider_user_id) VALUES ($1,$2,$3,$4)',
            [convId, bid[0].job_id, req.user.id, provUserid]
          )
          conversationId = convId
        }
      }
    } catch { /* conversation creation is non-critical */ }

    // Notify accepted provider and auto-rejected providers via socket
    try {
      const { rows: jobInfo } = await pool.query('SELECT title FROM job_requests WHERE id = $1', [bid[0].job_id])
      const jobTitle = jobInfo[0]?.title || 'Job'
      const io = getIo()

      // Accepted provider
      const { rows: provUser } = await pool.query(
        'SELECT user_id FROM provider_profiles WHERE id = $1', [bid[0].provider_id]
      )
      if (provUser.length) {
        io?.to(`user:${provUser[0].user_id}`).emit('bid_accepted', {
          job_id: bid[0].job_id,
          job_title: jobTitle,
          agreed_price: bid[0].proposed_price,
          conversation_id: conversationId
        })
      }

      // Auto-rejected providers
      if (rejectedProviderIds.length && io) {
        const placeholders = rejectedProviderIds.map((_, i) => `$${i + 1}`).join(',')
        const { rows: rejUsers } = await pool.query(
          `SELECT user_id FROM provider_profiles WHERE id IN (${placeholders})`,
          rejectedProviderIds
        )
        for (const u of rejUsers) {
          io.to(`user:${u.user_id}`).emit('bid_rejected', {
            job_id: bid[0].job_id,
            job_title: jobTitle
          })
        }
      }
    } catch { /* non-critical */ }

    return success(res, { assignment, conversation_id: conversationId })
  } catch (err) {
    next(err)
  }
}

const rejectBid = async (req, res, next) => {
  try {
    const { rows: bid } = await pool.query('SELECT * FROM job_bids WHERE id = $1', [req.params.id])
    if (!bid.length) return error(res, 'NOT_FOUND', 'Bid tidak dijumpai', 404)
    const { rows: job } = await pool.query(
      'SELECT * FROM job_requests WHERE id = $1 AND customer_id = $2',
      [bid[0].job_id, req.user.id]
    )
    if (!job.length) return error(res, 'FORBIDDEN', 'Tidak dibenarkan', 403)
    await pool.query("UPDATE job_bids SET status = 'rejected' WHERE id = $1", [req.params.id])
    return success(res, { message: 'Bid rejected' })
  } catch (err) {
    next(err)
  }
}

const withdrawBid = async (req, res, next) => {
  try {
    const { rows: pp } = await pool.query('SELECT id FROM provider_profiles WHERE user_id = $1', [req.user.id])
    if (!pp.length) return error(res, 'NOT_FOUND', 'Provider tidak dijumpai', 404)
    const { rows: bid } = await pool.query(
      'SELECT * FROM job_bids WHERE id = $1 AND provider_id = $2',
      [req.params.id, pp[0].id]
    )
    if (!bid.length) return error(res, 'NOT_FOUND', 'Bid tidak dijumpai', 404)
    await pool.query('DELETE FROM job_bids WHERE id = $1', [req.params.id])
    return success(res, { message: 'Bid withdrawn' })
  } catch (err) {
    next(err)
  }
}

module.exports = { placeBid, getJobBids, acceptBid, rejectBid, withdrawBid }
