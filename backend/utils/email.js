/**
 * Email Utility using Nodemailer
 */

const nodemailer = require('nodemailer');

let transporter;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });
  }
  return transporter;
};

// ─── Email templates ──────────────────────────────────────────────────────────
const templates = {
  welcome: (data) => ({
    subject: 'Welcome to TurfHub! 🏟️',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #22c55e;">Welcome to TurfHub, ${data.name}!</h1>
        <p>Your account has been created as a <strong>${data.role}</strong>.</p>
        <p>Start exploring amazing turfs near you and book your next game!</p>
        <a href="${process.env.FRONTEND_URL}" style="background:#22c55e;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">Explore Turfs</a>
        <p style="color: #666; margin-top: 20px;">The TurfHub Team</p>
      </div>
    `
  }),

  bookingConfirmation: (data) => ({
    subject: 'Booking Request Sent - TurfHub 🏟️',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #22c55e;">Booking Request Sent!</h1>
        <p>Hi ${data.name},</p>
        <p>Your booking request has been received. Here are the details:</p>
        <table style="width:100%; border-collapse: collapse;">
          <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Turf</strong></td><td style="padding:8px; border:1px solid #ddd;">${data.turf}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Sport</strong></td><td style="padding:8px; border:1px solid #ddd;">${data.sport}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Date</strong></td><td style="padding:8px; border:1px solid #ddd;">${data.date}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Time</strong></td><td style="padding:8px; border:1px solid #ddd;">${data.startTime} - ${data.endTime}</td></tr>
          <tr><td style="padding:8px; border:1px solid #ddd;"><strong>Amount</strong></td><td style="padding:8px; border:1px solid #ddd;">₹${data.amount}</td></tr>
        </table>
        <p style="color: #f59e0b;">Awaiting owner confirmation...</p>
      </div>
    `
  }),

  bookingAccepted: (data) => ({
    subject: '✅ Booking Confirmed - TurfHub',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #22c55e;">Booking Confirmed! 🎉</h1>
        <p>Hi ${data.name}, your booking at <strong>${data.turf}</strong> for <strong>${data.sport}</strong> has been confirmed!</p>
        <p>Get ready to play! 🏃</p>
      </div>
    `
  }),

  resetPassword: (data) => ({
    subject: 'Reset Your TurfHub Password',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h1 style="color: #22c55e;">Password Reset Request</h1>
        <p>Hi ${data.name}, click below to reset your password (valid for 30 minutes):</p>
        <a href="${data.resetUrl}" style="background:#22c55e;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;margin:16px 0;">Reset Password</a>
        <p style="color:#666;">If you didn't request this, ignore this email.</p>
      </div>
    `
  })
};

// ─── Send email function ──────────────────────────────────────────────────────
exports.sendEmail = async ({ to, subject, template, data, html }) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('📧 Email skipped (no credentials configured):', { to, subject });
      return;
    }

    const transport = getTransporter();
    const templateContent = template && templates[template] ? templates[template](data) : null;

    await transport.sendMail({
      from: process.env.EMAIL_FROM || 'TurfHub <noreply@turfhub.com>',
      to,
      subject: templateContent?.subject || subject,
      html: templateContent?.html || html
    });

    console.log(`📧 Email sent to: ${to}`);
  } catch (error) {
    console.error('📧 Email error:', error.message);
    throw error;
  }
};
