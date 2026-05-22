const router = require('express').Router()
const authenticate = require('../middleware/authenticate')
const validate = require('../middleware/validate')
const { getMe, updateMe, changePassword } = require('../controllers/users.controller')
const { z } = require('zod')

const updateSchema = z.object({
  full_name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal('')),
  avatar_url: z.string().url().optional()
})

const passwordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8)
})

router.get('/me', authenticate, getMe)
router.patch('/me', authenticate, validate(updateSchema), updateMe)
router.patch('/me/password', authenticate, validate(passwordSchema), changePassword)

module.exports = router
