const router = require('express').Router()
const authenticate = require('../middleware/authenticate')
const requireRole = require('../middleware/requireRole')
const validate = require('../middleware/validate')
const { getConversations, getMessages, sendMessage, createConversation, initConversationByProvider } = require('../controllers/conversations.controller')
const { z } = require('zod')

const createSchema = z.object({
  job_id: z.string().uuid(),
  provider_id: z.string().uuid()
})

const providerInitSchema = z.object({
  job_id: z.string().uuid()
})

const messageSchema = z.object({
  content: z.string().min(1),
  msg_type: z.enum(['text', 'image']).default('text')
})

router.get('/', authenticate, getConversations)
router.post('/', authenticate, validate(createSchema), createConversation)
router.post('/provider-init', authenticate, requireRole('provider'), validate(providerInitSchema), initConversationByProvider)
router.get('/:id/messages', authenticate, getMessages)
router.post('/:id/messages', authenticate, validate(messageSchema), sendMessage)

module.exports = router
