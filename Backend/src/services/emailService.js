import nodemailer from 'nodemailer';
import crypto from 'crypto';

// ✅ Don't check at import time - wait for runtime
console.log('\n📧 ========== EMAIL SERVICE INITIALIZATION ==========');

// ✅ Create transporter lazily - it will use env vars when called
let transporter = null;

const getTransporter = () => {
    if (!transporter) {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
            throw new Error('Email service not configured. Please set EMAIL_USER and EMAIL_PASSWORD in .env file');
        }
        
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        
        console.log('✅ Email transporter created successfully');
        console.log('   EMAIL_USER:', process.env.EMAIL_USER);
        console.log('   EMAIL_PASSWORD: ✅ SET (Length: ' + process.env.EMAIL_PASSWORD.length + ')');
        console.log('====================================================\n');
    }
    return transporter;
};

// Generate 6-digit verification code
export const generateVerificationCode = () => {
    return crypto.randomInt(100000, 999999).toString();
};

// ✅ 1. FORGOT PASSWORD - Send verification email
export const sendVerificationEmail = async (email, code) => {
    const trans = getTransporter();
    
    const mailOptions = {
        from: `"BuildWise Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Verification Code',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .container {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 10px;
                        padding: 30px;
                        text-align: center;
                    }
                    .content {
                        background: white;
                        border-radius: 8px;
                        padding: 30px;
                        margin-top: 20px;
                    }
                    .code {
                        font-size: 36px;
                        font-weight: bold;
                        color: #667eea;
                        letter-spacing: 8px;
                        margin: 20px 0;
                        padding: 15px;
                        background: #f3f4f6;
                        border-radius: 8px;
                        display: inline-block;
                    }
                    .warning {
                        color: #dc2626;
                        font-size: 14px;
                        margin-top: 20px;
                    }
                    .footer {
                        color: white;
                        font-size: 12px;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 style="color: white; margin: 0;">🔐 BuildWise</h1>
                    <p style="color: white; font-size: 18px;">Password Reset Request</p>
                    
                    <div class="content">
                        <h2>Verification Code</h2>
                        <p>You requested to reset your password. Use the code below to continue:</p>
                        
                        <div class="code">${code}</div>
                        
                        <p>This code will expire in <strong>10 minutes</strong>.</p>
                        
                        <div class="warning">
                            ⚠️ If you didn't request this, please ignore this email and your password will remain unchanged.
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p>© 2024 BuildWise. All rights reserved.</p>
                        <p>This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        const info = await trans.sendMail(mailOptions);
        console.log('✅ Password reset email sent to:', email);
        console.log('Message ID:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error sending password reset email:', error);
        throw error;
    }
};

// ✅ 2. FORGOT PASSWORD - Password reset success notification
export const sendPasswordResetSuccessEmail = async (email, name) => {
    const trans = getTransporter();
    
    const mailOptions = {
        from: `"BuildWise Support" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Successfully Reset',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .container {
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        border-radius: 10px;
                        padding: 30px;
                        text-align: center;
                    }
                    .content {
                        background: white;
                        border-radius: 8px;
                        padding: 30px;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 style="color: white; margin: 0;">✅ Password Reset Successful</h1>
                    
                    <div class="content">
                        <h2>Hi ${name}!</h2>
                        <p>Your password has been successfully reset.</p>
                        <p>You can now log in with your new password.</p>
                        <p>If you didn't make this change, please contact support immediately.</p>
                    </div>
                    
                    <div style="color: white; font-size: 12px; margin-top: 20px;">
                        <p>© 2024 BuildWise. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        const info = await trans.sendMail(mailOptions);
        console.log('✅ Password reset success email sent to:', email);
        return true;
    } catch (error) {
        console.error('❌ Error sending success email:', error);
        return false;
    }
};

// ✅ 3. REGISTRATION - Send registration verification email
export const sendRegistrationVerificationEmail = async (email, name, code) => {
    const trans = getTransporter();
    
    const mailOptions = {
        from: `"BuildWise" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🏗️ Welcome to BuildWise - Verify Your Email',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .container {
                        background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
                        border-radius: 10px;
                        padding: 30px;
                        text-align: center;
                    }
                    .content {
                        background: white;
                        border-radius: 8px;
                        padding: 30px;
                        margin-top: 20px;
                    }
                    .code {
                        font-size: 42px;
                        font-weight: bold;
                        color: #3b82f6;
                        letter-spacing: 10px;
                        margin: 25px 0;
                        padding: 20px;
                        background: #eff6ff;
                        border-radius: 10px;
                        display: inline-block;
                        border: 2px solid #3b82f6;
                    }
                    .welcome {
                        font-size: 24px;
                        color: #1f2937;
                        margin-bottom: 15px;
                    }
                    .warning-box {
                        background: #fef3c7;
                        border-left: 4px solid #f59e0b;
                        padding: 15px;
                        margin-top: 20px;
                        text-align: left;
                        border-radius: 5px;
                    }
                    .footer {
                        color: white;
                        font-size: 12px;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 style="color: white; margin: 0; font-size: 32px;">🏗️ BuildWise</h1>
                    <p style="color: white; font-size: 18px; margin-top: 10px;">Project Management System</p>
                    
                    <div class="content">
                        <div class="welcome">Welcome, ${name}! 👋</div>
                        <p style="font-size: 16px; color: #4b5563;">Thank you for registering with BuildWise.</p>
                        <p style="font-size: 16px; color: #4b5563;">To complete your registration, please verify your email address using the code below:</p>
                        
                        <div class="code">${code}</div>
                        
                        <p style="font-size: 14px; color: #6b7280; margin-top: 20px;">
                            This code will expire in <strong>10 minutes</strong>.
                        </p>
                        
                        <div class="warning-box">
                            <p style="margin: 0; font-size: 13px; color: #92400e;">
                                <strong>⚠️ Security Tip:</strong> Never share this code with anyone. BuildWise will never ask for your verification code via phone or email.
                            </p>
                        </div>
                    </div>
                    
                    <div class="footer">
                        <p style="margin: 5px 0;">© 2024 BuildWise. All rights reserved.</p>
                        <p style="margin: 5px 0;">This is an automated message, please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        const info = await trans.sendMail(mailOptions);
        console.log(`✅ Registration verification email sent to: ${email}`);
        console.log('Message ID:', info.messageId);
        return true;
    } catch (error) {
        console.error('❌ Error sending registration email:', error);
        throw error;
    }
};

// ✅ 4. REGISTRATION - Send welcome email after successful registration
export const sendWelcomeEmail = async (email, name) => {
    const trans = getTransporter();
    
    const mailOptions = {
        from: `"BuildWise" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🎉 Welcome to BuildWise!',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .container {
                        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
                        border-radius: 10px;
                        padding: 30px;
                        text-align: center;
                    }
                    .content {
                        background: white;
                        border-radius: 8px;
                        padding: 30px;
                        margin-top: 20px;
                    }
                    .button {
                        display: inline-block;
                        padding: 12px 30px;
                        background: #3b82f6;
                        color: white;
                        text-decoration: none;
                        border-radius: 8px;
                        font-weight: bold;
                        margin-top: 20px;
                    }
                    .feature-box {
                        background: #eff6ff;
                        padding: 20px;
                        border-radius: 8px;
                        margin: 20px 0;
                    }
                    .feature-list {
                        text-align: left;
                        color: #1f2937;
                        margin: 10px 0;
                        padding-left: 20px;
                    }
                    .feature-list li {
                        margin: 8px 0;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 style="color: white; margin: 0;">🎉 Welcome to BuildWise!</h1>
                    
                    <div class="content">
                        <h2 style="color: #1f2937;">Hi ${name}!</h2>
                        <p style="font-size: 16px; color: #4b5563;">Your account has been successfully created and verified.</p>
                        <p style="font-size: 16px; color: #4b5563;">You can now start managing your construction projects with BuildWise!</p>
                        
                        <div class="feature-box">
                            <h3 style="margin-top: 0; color: #1e40af;">🚀 Getting Started</h3>
                            <ul class="feature-list">
                                <li><strong>Create Projects:</strong> Set up your first construction project</li>
                                <li><strong>Invite Team:</strong> Add team members and assign roles</li>
                                <li><strong>Track Progress:</strong> Monitor project milestones and tasks</li>
                                <li><strong>Manage Budget:</strong> Keep track of expenses and finances</li>
                                <li><strong>Generate Reports:</strong> Create detailed project reports</li>
                            </ul>
                        </div>
                        
                        <p style="font-size: 14px; color: #6b7280;">Ready to get started?</p>
                        
                        <a href="http://localhost:5173/dashboard" class="button">Go to Dashboard</a>
                        
                        <p style="font-size: 12px; color: #9ca3af; margin-top: 30px;">
                            Need help? Check out our <a href="#" style="color: #3b82f6;">documentation</a> or 
                            <a href="#" style="color: #3b82f6;">contact support</a>.
                        </p>
                    </div>
                    
                    <div style="color: white; font-size: 12px; margin-top: 20px;">
                        <p style="margin: 5px 0;">© 2024 BuildWise. All rights reserved.</p>
                        <p style="margin: 5px 0;">Building the future, one project at a time.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        const info = await trans.sendMail(mailOptions);
        console.log(`✅ Welcome email sent to: ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
        return false;
    }
};

// ✅ 5. 2FA - Send 2FA setup confirmation email
export const send2FAEnabledEmail = async (email, name) => {
    const trans = getTransporter();
    
    const mailOptions = {
        from: `"BuildWise Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '🔐 Two-Factor Authentication Enabled',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .container {
                        background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%);
                        border-radius: 10px;
                        padding: 30px;
                        text-align: center;
                    }
                    .content {
                        background: white;
                        border-radius: 8px;
                        padding: 30px;
                        margin-top: 20px;
                    }
                    .icon-box {
                        width: 80px;
                        height: 80px;
                        background: #eff6ff;
                        border-radius: 50%;
                        margin: 0 auto 20px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 40px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 style="color: white; margin: 0;">🔐 BuildWise Security</h1>
                    
                    <div class="content">
                        <div class="icon-box">🛡️</div>
                        <h2 style="color: #1f2937;">Hi ${name}!</h2>
                        <p style="font-size: 16px; color: #4b5563;">
                            Two-factor authentication has been successfully enabled on your BuildWise account.
                        </p>
                        <p style="font-size: 16px; color: #4b5563;">
                            Your account is now more secure! You'll need to enter a code from your authenticator app each time you log in.
                        </p>
                        
                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 20px; text-align: left; border-radius: 5px;">
                            <p style="margin: 0; font-size: 13px; color: #92400e;">
                                <strong>⚠️ Important:</strong> If you didn't enable 2FA, please contact support immediately.
                            </p>
                        </div>
                    </div>
                    
                    <div style="color: white; font-size: 12px; margin-top: 20px;">
                        <p>© 2024 BuildWise. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        const info = await trans.sendMail(mailOptions);
        console.log(`✅ 2FA enabled email sent to: ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending 2FA email:', error);
        return false;
    }
};

// ✅ 6. 2FA - Send 2FA disabled notification email
export const send2FADisabledEmail = async (email, name) => {
    const trans = getTransporter();
    
    const mailOptions = {
        from: `"BuildWise Security" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: '⚠️ Two-Factor Authentication Disabled',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        line-height: 1.6;
                        color: #333;
                        max-width: 600px;
                        margin: 0 auto;
                        padding: 20px;
                    }
                    .container {
                        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
                        border-radius: 10px;
                        padding: 30px;
                        text-align: center;
                    }
                    .content {
                        background: white;
                        border-radius: 8px;
                        padding: 30px;
                        margin-top: 20px;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1 style="color: white; margin: 0;">⚠️ BuildWise Security</h1>
                    
                    <div class="content">
                        <h2 style="color: #1f2937;">Hi ${name}!</h2>
                        <p style="font-size: 16px; color: #4b5563;">
                            Two-factor authentication has been disabled on your BuildWise account.
                        </p>
                        <p style="font-size: 16px; color: #dc2626; font-weight: bold;">
                            Your account security has been reduced.
                        </p>
                        
                        <div style="background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin-top: 20px; text-align: left; border-radius: 5px;">
                            <p style="margin: 0; font-size: 13px; color: #7f1d1d;">
                                <strong>⚠️ Important:</strong> If you didn't disable 2FA, please secure your account immediately and contact support.
                            </p>
                        </div>
                    </div>
                    
                    <div style="color: white; font-size: 12px; margin-top: 20px;">
                        <p>© 2024 BuildWise. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        const info = await trans.sendMail(mailOptions);
        console.log(`✅ 2FA disabled email sent to: ${email}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending 2FA disabled email:', error);
        return false;
    }
};

// ✅ 7. NEW - MILESTONE COMPLETION - Send notification email
export const sendMilestoneCompletionEmail = async (projectManagerEmail, projectManagerName, projectName, milestoneName, completionDate) => {
  const trans = getTransporter();
  
  const formattedDate = new Date(completionDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const mailOptions = {
    from: `"BuildWise Notifications" <${process.env.EMAIL_USER}>`,
    to: projectManagerEmail,
    subject: `✅ Milestone Completed: ${milestoneName}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); overflow: hidden; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: #ffffff; padding: 40px 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
          .header p { margin: 10px 0 0 0; font-size: 16px; opacity: 0.95; }
          .content { padding: 40px 30px; }
          .milestone-box { background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 20px; border-radius: 8px; margin: 25px 0; }
          .milestone-box h2 { margin: 0 0 10px 0; color: #065f46; font-size: 22px; }
          .info-row { display: flex; justify-content: space-between; margin: 15px 0; padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
          .info-label { font-weight: 600; color: #6b7280; }
          .info-value { color: #111827; font-weight: 500; }
          .success-icon { font-size: 48px; text-align: center; margin: 20px 0; }
          .cta-button { display: inline-block; background-color: #10b981; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; margin: 25px 0; transition: background-color 0.3s; }
          .cta-button:hover { background-color: #059669; }
          .footer { background-color: #f9fafb; padding: 25px 30px; text-align: center; color: #6b7280; font-size: 14px; }
          .footer p { margin: 5px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Milestone Completed!</h1>
            <p>Great progress on your project</p>
          </div>
          
          <div class="content">
            <p style="font-size: 16px; color: #374151; margin-bottom: 10px;">
              Hi <strong>${projectManagerName}</strong>,
            </p>
            
            <div class="success-icon">✅</div>
            
            <p style="font-size: 16px; color: #374151; line-height: 1.6;">
              Congratulations! A milestone has been successfully completed in your project.
            </p>
            
            <div class="milestone-box">
              <h2>${milestoneName}</h2>
              
              <div class="info-row">
                <span class="info-label">📋 Project:</span>
                <span class="info-value">${projectName}</span>
              </div>
              
              <div class="info-row">
                <span class="info-label">✅ Status:</span>
                <span class="info-value" style="color: #10b981;">Completed</span>
              </div>
              
              <div class="info-row" style="border-bottom: none;">
                <span class="info-label">🕐 Completed On:</span>
                <span class="info-value">${formattedDate}</span>
              </div>
            </div>
            
            <p style="font-size: 15px; color: #6b7280; line-height: 1.6; margin: 25px 0;">
              Keep up the excellent work! Your project is moving forward successfully. 
              Check your dashboard for updated project statistics and next milestones.
            </p>
            
            <center>
              <a href="http://localhost:3000/dashboard" class="cta-button">
                View Dashboard
              </a>
            </center>
          </div>
          
          <div class="footer">
            <p>© 2025 BuildWise. All rights reserved.</p>
            <p style="margin-top: 10px;">Building the future, one milestone at a time.</p>
          </div>
        </div>
      </body>
      </html>
    `
  };

  try {
    const info = await trans.sendMail(mailOptions);
    console.log('✅ Milestone completion email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending milestone completion email:', error);
    throw error;
  }
};

// Export all functions
export default {
    generateVerificationCode,
    sendVerificationEmail,
    sendPasswordResetSuccessEmail,
    sendRegistrationVerificationEmail,
    sendWelcomeEmail,
    send2FAEnabledEmail,
    send2FADisabledEmail,
    sendMilestoneCompletionEmail  // ✅ ADDED THIS LINE
};
