const { Server } = require('socket.io')
const { verifyToken } = require('../utils/jwt')

let io

const initSocket = (server) => {
  const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:3000')
    .split(',')
    .map(s => s.trim())

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true)
        if (allowedOrigins.some(o => origin === o || origin.endsWith('.vercel.app'))) {
          return callback(null, true)
        }
        callback(new Error('Not allowed by CORS'))
      },
      credentials: true
    }
  })

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token
    if (!token) return next(new Error('Unauthorized'))
    try {
      socket.user = verifyToken(token)
      next()
    } catch {
      next(new Error('Unauthorized'))
    }
  })

  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.user.id}`)
    socket.join(`user:${socket.user.id}`)

    socket.on('join_conversation', ({ conversation_id }) => {
      socket.join(`conv:${conversation_id}`)
    })

    socket.on('send_message', async ({ conversation_id, content, msg_type }) => {
      const msg = { conversation_id, sender_id: socket.user.id, content, msg_type, created_at: new Date() }
      io.to(`conv:${conversation_id}`).emit('new_message', msg)
      // Notify the other participant even if they're not in the conv room
      try {
        const pool = require('../config/db')
        const { rows } = await pool.query(
          'SELECT customer_id, provider_user_id FROM conversations WHERE id = $1', [conversation_id]
        )
        if (rows.length) {
          const other = rows[0].customer_id === socket.user.id
            ? rows[0].provider_user_id
            : rows[0].customer_id
          io.to(`user:${other}`).emit('new_chat_notification', { conversation_id, content, sender_id: socket.user.id })
        }
      } catch { /* non-critical */ }
    })

    socket.on('typing', ({ conversation_id }) => {
      socket.to(`conv:${conversation_id}`).emit('user_typing', { conversation_id, user_id: socket.user.id })
    })

    socket.on('stop_typing', ({ conversation_id }) => {
      socket.to(`conv:${conversation_id}`).emit('user_stop_typing', { conversation_id, user_id: socket.user.id })
    })

    socket.on('disconnect', () => {
      console.log(`Socket disconnected: ${socket.user.id}`)
    })
  })

  return io
}

const getIo = () => io

module.exports = { initSocket, getIo }
