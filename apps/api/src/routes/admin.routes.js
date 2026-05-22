const router = require('express').Router()
const authenticate = require('../middleware/authenticate')
const requireRole = require('../middleware/requireRole')
const validate = require('../middleware/validate')
const { getUsers, verifyProvider, getAllJobs, getStats, editUser, deleteUser, getAllConversations } = require('../controllers/admin.controller')
const { z } = require('zod')

const verifySchema = z.object({
  verification_status: z.enum(['verified', 'rejected']),
  note: z.string().optional()
})

const editUserSchema = z.object({
  full_name: z.string().min(2).optional(),
  email: z.string().email().optional().or(z.literal('')),
  new_password: z.string().min(8).optional(),
  is_verified: z.boolean().optional()
})

router.use(authenticate, requireRole('admin'))

router.get('/users', getUsers)
router.patch('/users/:id', validate(editUserSchema), editUser)
router.delete('/users/:id', deleteUser)
router.patch('/providers/:id/verify', validate(verifySchema), verifyProvider)
router.get('/jobs', getAllJobs)
router.get('/stats', getStats)
router.get('/conversations', getAllConversations)

module.exports = router
