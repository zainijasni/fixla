const router = require('express').Router()
const authenticate = require('../middleware/authenticate')
const requireRole = require('../middleware/requireRole')
const validate = require('../middleware/validate')
const { upload } = require('../middleware/upload')
const {
  createJob,
  uploadImages,
  getJobs,
  getJob,
  updateJob,
  cancelJob,
  completeJob,
  submitReview,
  getMyAssignments,
  updateJobProgress
} = require('../controllers/jobs.controller')
const { z } = require('zod')

const createJobSchema = z.object({
  category_id: z.string().uuid(),
  subcategory_id: z.string().uuid().optional(),
  title: z.string().min(1),
  description: z.string().min(1),
  location_address: z.string().min(1),
  location_lat: z.number(),
  location_lng: z.number(),
  state: z.string().min(1),
  city: z.string().optional().default(''),
  postcode: z.string().optional().default(''),
  urgency: z.enum(['urgent', 'normal', 'flexible']),
  preferred_date: z.string().optional(),
  preferred_time: z.enum(['morning', 'afternoon', 'evening', 'anytime']).optional(),
  budget_min: z.number().min(0).optional(),
  budget_max: z.number().min(0).optional()
})

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1)
})

router.post('/', authenticate, requireRole('customer'), validate(createJobSchema), createJob)
router.post('/:id/images', authenticate, requireRole('customer'), upload.array('images', 5), uploadImages)
router.get('/my-assignments', authenticate, requireRole('provider'), getMyAssignments)
router.get('/', authenticate, getJobs)
router.get('/:id', authenticate, getJob)
router.patch('/:id/progress', authenticate, requireRole('provider'), updateJobProgress)
router.patch('/:id', authenticate, requireRole('customer'), updateJob)
router.delete('/:id', authenticate, requireRole('customer'), cancelJob)
router.patch('/:id/complete', authenticate, requireRole('customer'), completeJob)
router.post('/:id/reviews', authenticate, requireRole('customer'), validate(reviewSchema), submitReview)

module.exports = router
