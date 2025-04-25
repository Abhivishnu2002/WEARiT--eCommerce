const nodemailer = require('nodemailer');
const dotenv = require('dotenv');

dotenv.config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth:{
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const sendOTPEmail = async (email, otp) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your OTP for WEARiT Registration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #000000;">WEARiT - Verify Your Email</h2>
          <p>Your OTP code is: <strong style="font-size: 24px;">${otp}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      `
    }
    try {
        const info = await transporter.sendMail(mailOptions);
        return info;
      } catch (error) {
        console.error('Email sending error:', error);
        throw new Error('Failed to send email');
      }
}    

const sendPasswordResetEmail = async (email, otp) => {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Password Reset Request for WEARiT',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #000000;">WEARiT - Password Reset</h2>
          <p>Your password reset code is: <strong style="font-size: 24px;">${otp}</strong></p>
          <p>This code will expire in 10 minutes.</p>
          <p>If you didn't request a password reset, please ignore this email.</p>
        </div>
      `
    };
    try {
      const info = await transporter.sendMail(mailOptions);
      return info;
    } catch (error) {
      console.error('Email sending error:', error);
      throw new Error('Failed to send email');
    }
  };

  module.exports =  {
    sendOTPEmail,
    sendPasswordResetEmail,
  };