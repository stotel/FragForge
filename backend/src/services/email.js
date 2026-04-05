const nodemailer = require('nodemailer');

let transporter = null;
let testAccountInfo = null;

async function initializeEmail() {
  if (transporter) return transporter;

  console.log('\n📧 Initializing email service...');

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    // Use configured SMTP (Gmail, SendGrid, etc.)
    console.log(`✓ Using configured SMTP: ${process.env.SMTP_HOST}`);
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Create free Ethereal test account
    console.log('✓ Creating Ethereal Email test account (SMTP)...');
    testAccountInfo = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: testAccountInfo.smtp.host,
      port: testAccountInfo.smtp.port,
      secure: testAccountInfo.smtp.secure,
      auth: {
        user: testAccountInfo.user,
        pass: testAccountInfo.pass,
      },
    });

    console.log(`✓ Test Email Service Ready:`);
    console.log(`  SMTP User: ${testAccountInfo.user}`);
    console.log(`  SMTP Pass: ${testAccountInfo.pass}`);
    console.log(`  SMTP Host: ${testAccountInfo.smtp.host}:${testAccountInfo.smtp.port}`);
  }

  return transporter;
}

async function sendVerificationEmail(email, username, token) {
  try {
    const transport = await initializeEmail();
    const verifyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${token}`;

    const mailOptions = {
      from: process.env.EMAIL_FROM || '"FragForge" <noreply@fragforge.dev>',
      to: email,
      subject: 'Verify your FragForge account',
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px;border-radius:8px">
          <div style="background:white;padding:40px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
            <h1 style="color:#000;margin:0 0 20px 0;font-size:28px">FragForge</h1>
            <h2 style="color:#333;margin:0 0 20px 0;font-size:20px">Welcome, ${username}!</h2>
            
            <p style="color:#666;font-size:16px;line-height:1.6;margin:0 0 20px 0">
              Thank you for registering at FragForge. Click the button below to verify your email address and start sharing GLSL shaders.
            </p>
            
            <div style="text-align:center;margin:30px 0">
              <a href="${verifyUrl}" style="background:#000;color:#fff;padding:14px 32px;text-decoration:none;border-radius:4px;font-weight:bold;display:inline-block;font-size:16px">
                Verify Email Address
              </a>
            </div>
            
            <p style="color:#999;font-size:13px;margin:30px 0 0 0;border-top:1px solid #eee;padding-top:20px">
              Or copy and paste this link in your browser:
            </p>
            <p style="color:#0066cc;font-size:13px;word-break:break-all;margin:10px 0 0 0">
              ${verifyUrl}
            </p>
            
            <p style="color:#999;font-size:12px;margin:20px 0 0 0">
              This link will expire in 24 hours for security reasons.
            </p>
          </div>
        </div>
      `,
      text: `Welcome to FragForge!\n\nVerify your email:\n${verifyUrl}`,
    };

    const info = await transport.sendMail(mailOptions);

    console.log(`✅ Email sent to ${email}`);
    console.log(`   Message ID: ${info.messageId}`);

    // If using test account, provide preview URL
    if (testAccountInfo) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`\n📧 PREVIEW EMAIL HERE:\n   ${previewUrl}\n`);
      }
    }

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Email send failed to ${email}:`, err.message);
    return { success: false, error: err.message };
  }
}

module.exports = { sendVerificationEmail, initializeEmail };
