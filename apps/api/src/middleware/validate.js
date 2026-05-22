const { error } = require('../utils/response')

const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    const message = result.error.errors.map((e) => e.message).join(', ')
    return error(res, 'VALIDATION_ERROR', message, 422)
  }
  req.body = result.data
  next()
}

module.exports = validate
