const router = require('express').Router()
const authenticate = require('../middleware/authenticate')
const requireRole = require('../middleware/requireRole')
const { startJob, completeAssignment } = require('../controllers/assignments.controller')

router.patch('/:id/start', authenticate, requireRole('provider'), startJob)
router.patch('/:id/complete', authenticate, requireRole('provider'), completeAssignment)

module.exports = router
