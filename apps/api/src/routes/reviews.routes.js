const router = require('express').Router()
const authenticate = require('../middleware/authenticate')
const requireRole = require('../middleware/requireRole')
const validate = require('../middleware/validate')
const { respondToReview, getProviderReviews } = require('../controllers/reviews.controller')
const { z } = require('zod')

const responseSchema = z.object({
  provider_response: z.string().min(1)
})

router.patch('/:id/response', authenticate, requireRole('provider'), validate(responseSchema), respondToReview)
router.get('/providers/:id/reviews', getProviderReviews)

module.exports = router
