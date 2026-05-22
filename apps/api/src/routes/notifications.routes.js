const router = require('express').Router()
const authenticate = require('../middleware/authenticate')
const { getNotifications, markRead, markAllRead } = require('../controllers/notifications.controller')

router.get('/', authenticate, getNotifications)
router.patch('/:id/read', authenticate, markRead)
router.patch('/read-all', authenticate, markAllRead)

module.exports = router
