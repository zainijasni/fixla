const nodemailer = require('nodemailer')

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT) || 587,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
})

const sendEmail = async ({ to, subject, html }) => {
  return transporter.sendMail({
    from: `Fixla <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html
  })
}

module.exports = { sendEmail }
