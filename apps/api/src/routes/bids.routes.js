const router = require('express').Router()
const authenticate = require('../middleware/authenticate')
const requireRole = require('../middleware/requireRole')
const validate = require('../middleware/validate')
const { placeBid, getJobBids, acceptBid, rejectBid, withdrawBid } = require('../controllers/bids.controller')
const { z } = require('zod')

const bidSchema = z.object({
  proposed_price: z.number().min(1),
  estimated_duration: z.string().optional(),
  message: z.string().optional()
})

// POST   /api/bids/jobs/:jobId     → provider bid on a job
// GET    /api/bids/jobs/:jobId     → customer get all bids for a job
// PATCH  /api/bids/:id/accept      → customer accept a bid
// PATCH  /api/bids/:id/reject      → customer reject a bid
// DELETE /api/bids/:id             → provider withdraw bid

router.post('/jobs/:jobId', authenticate, requireRole('provider'), validate(bidSchema), placeBid)
router.get('/jobs/:jobId', authenticate, getJobBids)
router.patch('/:id/accept', authenticate, requireRole('customer'), acceptBid)
router.patch('/:id/reject', authenticate, requireRole('customer'), rejectBid)
router.delete('/:id', authenticate, requireRole('provider'), withdrawBid)

module.exports = router
