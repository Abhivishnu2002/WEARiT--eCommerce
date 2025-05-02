const nodemailer = require("nodemailer")
const dotenv = require("dotenv")

dotenv.config()

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Your OTP for WEARiT Email Verification",
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #000000; margin-bottom: 5px;">WEARiT - Verify Your Email</h2>
            <p style="color: #666; font-size: 16px;">Please use the verification code below to complete your email update</p>
          </div>
          
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Your verification code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; margin: 0; color: #000;">${otp}</h1>
          </div>
          
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} WEARiT. All rights reserved.</p>
          </div>
        </div>
      `,
  }
  try {
    const info = await transporter.sendMail(mailOptions)
    return info
  } catch (error) {
    console.error("Email sending error:", error)
    throw new Error("Failed to send email")
  }
}

const sendPasswordResetEmail = async (email, otp) => {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Password Reset Request for WEARiT",
    html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <div style="text-align: center; margin-bottom: 20px;">
            <h2 style="color: #000000; margin-bottom: 5px;">WEARiT - Password Reset</h2>
            <p style="color: #666; font-size: 16px;">Please use the code below to reset your password</p>
          </div>
          
          <div style="background-color: #f8f8f8; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <p style="font-size: 14px; color: #666; margin-bottom: 10px;">Your password reset code is:</p>
            <h1 style="font-size: 32px; letter-spacing: 5px; margin: 0; color: #000;">${otp}</h1>
          </div>
          
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request a password reset, please ignore this email.</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} WEARiT. All rights reserved.</p>
          </div>
        </div>
      `,
  }
  try {
    const info = await transporter.sendMail(mailOptions)
    return info
  } catch (error) {
    console.error("Email sending error:", error)
    throw new Error("Failed to send email")
  }
}

module.exports = {
  sendOTPEmail,
  sendPasswordResetEmail,
}
