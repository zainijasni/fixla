const router = require('express').Router()
const validate = require('../middleware/validate')
const authenticate = require('../middleware/authenticate')
const {
  registerCustomer,
  registerProvider,
  login,
  refresh,
  logout
} = require('../controllers/auth.controller')
const { z } = require('zod')

const registerCustomerSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8)
})

const registerProviderSchema = z.object({
  full_name: z.string().min(2),
  phone: z.string().min(8),
  email: z.string().email().optional().or(z.literal('')),
  password: z.string().min(8),
  business_name: z.string().min(2),
  categories: z.array(z.string()).optional()
})

const loginSchema = z.object({
  phone: z.string().min(8),
  password: z.string().min(1)
})

router.post('/register/customer', validate(registerCustomerSchema), registerCustomer)
router.post('/register/provider', validate(registerProviderSchema), registerProvider)
router.post('/login', validate(loginSchema), login)
router.post('/refresh', authenticate, refresh)
router.post('/logout', authenticate, logout)

module.exports = router
