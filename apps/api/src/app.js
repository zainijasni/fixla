const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { rateLimiter } = require('./middleware/rateLimiter')

const authRoutes = require('./routes/auth.routes')
const usersRoutes = require('./routes/users.routes')
const providersRoutes = require('./routes/providers.routes')
const categoriesRoutes = require('./routes/categories.routes')
const jobsRoutes = require('./routes/jobs.routes')
const bidsRoutes = require('./routes/bids.routes')
const assignmentsRoutes = require('./routes/assignments.routes')
const reviewsRoutes = require('./routes/reviews.routes')
const conversationsRoutes = require('./routes/conversations.routes')
const notificationsRoutes = require('./routes/notifications.routes')
const adminRoutes = require('./routes/admin.routes')

const app = express()

app.use(helmet())
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
  .split(',')
  .map(s => s.trim())

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true) // server-to-server / curl
    if (allowedOrigins.some(o => origin === o || origin.endsWith('.vercel.app'))) {
      return callback(null, true)
    }
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(rateLimiter)

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/providers', providersRoutes)
app.use('/api/categories', categoriesRoutes)
app.use('/api/jobs', jobsRoutes)
app.use('/api/bids', bidsRoutes)
app.use('/api/assignments', assignmentsRoutes)
app.use('/api/reviews', reviewsRoutes)
app.use('/api/conversations', conversationsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/admin', adminRoutes)

app.get('/health', (req, res) => res.json({ status: 'ok' }))

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack)
  const status = err.status || 500
  res.status(status).json({
    success: false,
    error: {
      code: err.code || 'SERVER_ERROR',
      message: err.message || 'Internal server error'
    }
  })
})

module.exports = app
