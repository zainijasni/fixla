const router = require('express').Router()
const authenticate = require('../middleware/authenticate')
const requireRole = require('../middleware/requireRole')
const validate = require('../middleware/validate')
const { upload } = require('../middleware/upload')
const {
  getMyProfile,
  updateMyProfile,
  toggleStatus,
  uploadDocument,
  getNearby,
  getPublicProfile
} = require('../controllers/providers.controller')
const { z } = require('zod')

const profileSchema = z.object({
  business_name: z.string().min(2).optional(),
  bio: z.string().optional(),
  years_experience: z.number().int().min(0).optional(),
  base_address: z.string().optional(),
  base_lat: z.number().optional(),
  base_lng: z.number().optional(),
  service_radius_km: z.number().min(1).max(100).optional()
})

const statusSchema = z.object({
  is_online: z.boolean()
})

router.get('/me', authenticate, requireRole('provider'), getMyProfile)
router.patch('/me', authenticate, requireRole('provider'), validate(profileSchema), updateMyProfile)
router.get('/profile', authenticate, requireRole('provider'), getMyProfile)
router.patch('/profile', authenticate, requireRole('provider'), validate(profileSchema), updateMyProfile)
router.patch('/status', authenticate, requireRole('provider'), validate(statusSchema), toggleStatus)
router.post('/documents', authenticate, requireRole('provider'), upload.single('file'), uploadDocument)
router.get('/nearby', getNearby)
router.get('/:id', getPublicProfile)

module.exports = router
