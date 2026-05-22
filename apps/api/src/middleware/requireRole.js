const { error } = require('../utils/response')

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return error(res, 'FORBIDDEN', 'Anda tidak dibenarkan', 403)
  }
  next()
}

module.exports = requireRole
