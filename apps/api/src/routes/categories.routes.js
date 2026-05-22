const router = require('express').Router()
const { getAll, getBySlug } = require('../controllers/categories.controller')

router.get('/', getAll)
router.get('/:slug', getBySlug)

module.exports = router
