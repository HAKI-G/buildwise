import nodemailer from 'nodemailer';

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER, // Your Gmail
    pass: process.env.EMAIL_APP_PASSWORD // Gmail App Password
  }
});

// Generate 6-digit verification code
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Send verification email
export const sendVerificationEmail = async (email, name, code) => {
  const mailOptions = {
    from: `"BuildWise" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Verify Your BuildWise Account',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .code { font-size: 32px; font-weight: bold; color: #667eea; text-align: center; letter-spacing: 5px; margin: 20px 0; padding: 15px; background: white; border-radius: 8px; border: 2px dashed #667eea; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🏗️ Welcome to BuildWise!</h1>
          </div>
          <div class="content">
            <h2>Hi ${name}! 👋</h2>
            <p>Thank you for registering with BuildWise. To complete your registration, please verify your email address.</p>
            
            <p><strong>Your verification code is:</strong></p>
            <div class="code">${code}</div>
            
            <p>This code will expire in <strong>10 minutes</strong>.</p>
            
            <p>If you didn't create an account with BuildWise, please ignore this email.</p>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} BuildWise - Construction Project Management</p>
              <p>This is an automated email, please do not reply.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Verification email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending verification email:', error);
    throw error;
  }
};

// Send welcome email after verification
export const sendWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: `"BuildWise" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Welcome to BuildWise! 🎉',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #667eea; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome to BuildWise!</h1>
          </div>
          <div class="content">
            <h2>Hi ${name}! 👋</h2>
            <p>Your email has been verified successfully! You're now ready to use BuildWise.</p>
            
            <h3>What you can do with BuildWise:</h3>
            <div class="feature">
              <strong>📊 Manage Projects</strong><br>
              Track all your construction projects in one place
            </div>
            <div class="feature">
              <strong>📈 Monitor Progress</strong><br>
              Real-time updates on project milestones and tasks
            </div>
            <div class="feature">
              <strong>💰 Track Expenses</strong><br>
              Keep your budget under control
            </div>
            <div class="feature">
              <strong>👥 Team Collaboration</strong><br>
              Work together with your team seamlessly
            </div>
            
            <p>If you have any questions, feel free to contact our support team!</p>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} BuildWise - Construction Project Management</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent to:', email);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    throw error;
  }
};

// Send support ticket notification
export const sendSupportTicketEmail = async (ticket, isNewTicket = true) => {
  const subject = isNewTicket 
    ? `Support Ticket Created - #${ticket.ticketId}` 
    : `Support Ticket Updated - #${ticket.ticketId}`;

  const statusColor = {
    'Open': '#3B82F6',
    'In Progress': '#F59E0B',
    'Resolved': '#10B981',
    'Closed': '#6B7280'
  };

  const priorityColor = {
    'Low': '#10B981',
    'Medium': '#F59E0B',
    'High': '#EF4444',
    'Critical': '#DC2626'
  };

  const mailOptions = {
    from: `"BuildWise Support" <${process.env.EMAIL_USER}>`,
    to: ticket.email,
    subject: subject,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .label { font-weight: bold; color: #666; }
          .badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; color: white; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎫 ${isNewTicket ? 'Support Ticket Created' : 'Support Ticket Updated'}</h1>
          </div>
          <div class="content">
            <p>Hi ${ticket.name},</p>
            <p>${isNewTicket ? 'Thank you for contacting BuildWise Support. We have received your ticket and will respond as soon as possible.' : 'Your support ticket has been updated.'}</p>
            
            <div class="ticket-info">
              <h3>Ticket Details:</h3>
              <div class="info-row">
                <span class="label">Ticket ID:</span>
                <span><strong>#${ticket.ticketId}</strong></span>
              </div>
              <div class="info-row">
                <span class="label">Subject:</span>
                <span>${ticket.subject}</span>
              </div>
              <div class="info-row">
                <span class="label">Status:</span>
                <span><span class="badge" style="background-color: ${statusColor[ticket.status] || '#6B7280'}">${ticket.status}</span></span>
              </div>
              <div class="info-row">
                <span class="label">Priority:</span>
                <span><span class="badge" style="background-color: ${priorityColor[ticket.priority] || '#6B7280'}">${ticket.priority}</span></span>
              </div>
              <div class="info-row">
                <span class="label">Category:</span>
                <span>${ticket.category}</span>
              </div>
            </div>
            
            ${ticket.adminResponse ? `
              <div style="background: #E0F2FE; padding: 15px; border-radius: 8px; border-left: 4px solid #0EA5E9; margin: 20px 0;">
                <strong>💬 Admin Response:</strong>
                <p style="margin-top: 10px;">${ticket.adminResponse}</p>
              </div>
            ` : ''}
            
            <p><strong>Your Message:</strong></p>
            <div style="background: white; padding: 15px; border-radius: 8px; border: 1px solid #ddd;">
              ${ticket.message}
            </div>
            
            ${ticket.attachment ? `
              <p style="margin-top: 15px;">
                <strong>📎 Attachment:</strong> ${ticket.attachment}
              </p>
            ` : ''}
            
            <p style="margin-top: 20px;">We'll keep you updated on the progress of your ticket.</p>
            
            <div class="footer">
              <p>© ${new Date().getFullYear()} BuildWise - Construction Project Management</p>
              <p>Ticket created on: ${new Date(ticket.createdAt).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Support ticket email sent to: ${ticket.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending support ticket email:', error);
    throw error;
  }
};

// Send admin notification for new ticket
export const sendAdminTicketNotification = async (ticket) => {
  const mailOptions = {
    from: `"BuildWise System" <${process.env.EMAIL_USER}>`,
    to: process.env.ADMIN_EMAIL, // Admin email
    subject: `🆕 New Support Ticket - #${ticket.ticketId}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .ticket-info { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .urgent { background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🆕 New Support Ticket Received</h1>
          </div>
          <div class="content">
            ${ticket.priority === 'High' || ticket.priority === 'Critical' ? `
              <div class="urgent">
                <strong>⚠️ ${ticket.priority} PRIORITY TICKET</strong>
              </div>
            ` : ''}
            
            <div class="ticket-info">
              <h3>Ticket Details:</h3>
              <p><strong>Ticket ID:</strong> #${ticket.ticketId}</p>
              <p><strong>From:</strong> ${ticket.name} (${ticket.email})</p>
              <p><strong>Subject:</strong> ${ticket.subject}</p>
              <p><strong>Category:</strong> ${ticket.category}</p>
              <p><strong>Priority:</strong> ${ticket.priority}</p>
              <p><strong>Message:</strong></p>
              <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; border: 1px solid #ddd;">
                ${ticket.message}
              </div>
            </div>
            
            <p>Please respond to this ticket as soon as possible.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`✅ Admin notification sent for ticket #${ticket.ticketId}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending admin notification:', error);
    // Don't throw - admin notification is not critical
    return false;
  }
};

export default {
  sendVerificationEmail,
  sendWelcomeEmail,
  sendSupportTicketEmail,
  sendAdminTicketNotification,
  generateVerificationCode
};