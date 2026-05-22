const { verifyToken } = require('../utils/jwt')
const { error } = require('../utils/response')

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return error(res, 'UNAUTHORIZED', 'Token tidak sah atau expired', 401)
  }
  const token = authHeader.split(' ')[1]
  try {
    const decoded = verifyToken(token)
    req.user = decoded
    next()
  } catch {
    return error(res, 'UNAUTHORIZED', 'Token tidak sah atau expired', 401)
  }
}

module.exports = authenticate
