require('dotenv').config()
const http = require('http')
const app = require('./src/app')
const { initSocket } = require('./src/socket')

const PORT = process.env.PORT || 5000

const server = http.createServer(app)
initSocket(server)

server.listen(PORT, () => {
  console.log(`Fixla API running on port ${PORT} [${process.env.NODE_ENV}]`)
})
