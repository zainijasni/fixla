const pool = require('../config/db')
const { success, error } = require('../utils/response')

const getAll = async (req, res, next) => {
  try {
    const { rows: cats } = await pool.query('SELECT * FROM service_categories ORDER BY name')
    const { rows: subs } = await pool.query('SELECT * FROM service_subcategories ORDER BY name')
    const categories = cats.map((c) => ({
      ...c,
      subcategories: subs.filter((s) => s.category_id === c.id)
    }))
    return success(res, { categories })
  } catch (err) {
    next(err)
  }
}

const getBySlug = async (req, res, next) => {
  try {
    const { rows } = await pool.query('SELECT * FROM service_categories WHERE slug = $1', [req.params.slug])
    if (!rows.length) return error(res, 'NOT_FOUND', 'Kategori tidak dijumpai', 404)
    const { rows: subs } = await pool.query('SELECT * FROM service_subcategories WHERE category_id = $1', [rows[0].id])
    return success(res, { ...rows[0], subcategories: subs })
  } catch (err) {
    next(err)
  }
}

module.exports = { getAll, getBySlug }
