/**
 * One-time script to create an admin account.
 * Usage: node scripts/create-admin.js
 *
 * Run from the apps/api directory.
 */

require('dotenv').config()
const bcrypt = require('bcryptjs')
const { v4: uuidv4 } = require('uuid')
const { Pool } = require('pg')

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// ─── EDIT THESE ──────────────────────────────────────────────
const ADMIN_NAME     = 'Admin Fixla'
const ADMIN_PHONE    = '1234567890'   // no leading 0, no +60
const ADMIN_PASSWORD = 'Admin@1234'
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log('🔧 Creating admin account...\n')

  // Check if phone already exists
  const existing = await pool.query('SELECT id, role FROM users WHERE phone = $1', [ADMIN_PHONE])
  if (existing.rows.length) {
    const u = existing.rows[0]
    if (u.role === 'admin') {
      console.log('✅ Admin account sudah wujud dengan nombor telefon ini.')
    } else {
      console.log(`⚠️  Nombor telefon ini sudah digunakan oleh role: ${u.role}`)
      console.log('   Tukar ADMIN_PHONE dalam script ini dan cuba semula.')
    }
    await pool.end()
    return
  }

  const hash = await bcrypt.hash(ADMIN_PASSWORD, 12)
  const id   = uuidv4()

  await pool.query(
    `INSERT INTO users (id, full_name, phone, role, password_hash, is_verified)
     VALUES ($1, $2, $3, 'admin', $4, true)`,
    [id, ADMIN_NAME, ADMIN_PHONE, hash]
  )

  console.log('✅ Admin berjaya dicipta!\n')
  console.log('  Nombor Telefon :', ADMIN_PHONE)
  console.log('  Kata Laluan    :', ADMIN_PASSWORD)
  console.log('  Role           : admin\n')
  console.log('Login di: http://localhost:3000/login')
  console.log('⚠️  Tukar kata laluan selepas login pertama!\n')

  await pool.end()
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  pool.end()
  process.exit(1)
})
