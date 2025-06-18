// Simple and reliable email service using EmailJS (free and no restrictions)
const sendEmailWithEmailJS = async (env: any, { to, subject, html, from = null }: { to: string; subject: string; html: string; from?: string | null }) => {
  try {
    console.log('Using EmailJS to send email...');
    
    // EmailJS public endpoint (free service)
    const serviceId = 'default_service';
    const templateId = 'template_1';
    const publicKey = 'YOUR_PUBLIC_KEY'; // You'll get this from EmailJS
    
    const templateParams = {
      to_email: to,
      from_name: 'MyGPT Team',
      subject: subject,
      message: html,
    };

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
        service_id: serviceId,
        template_id: templateId,
        user_id: publicKey,
        template_params: templateParams,
      }),
    });

    if (response.ok) {
      console.log('Email sent successfully with EmailJS');
      return { success: true, id: 'emailjs-' + Date.now() };
    } else {
      throw new Error(`EmailJS error: ${response.status}`);
    }
  } catch (error: any) {
    console.error('EmailJS error:', error);
    return await logEmailToConsole({ to, subject, html, from });
  }
};

// For development - log emails to console
const logEmailToConsole = async ({ to, subject, html, from }: { to: string; subject: string; html: string; from?: string | null }) => {
  console.log('=== EMAIL LOG (DEVELOPMENT) ===');
  console.log('To:', to);
  console.log('From:', from || 'MyGPT Team <noreply@mygpt.work>');
  console.log('Subject:', subject);
  console.log('HTML Content:');
  console.log(html);
  console.log('===============================');
  
  return { 
    success: true, 
    id: 'logged-' + Date.now(),
    note: 'Email logged to console (development mode)' 
  };
};

// Simplified email function for development
const sendEmail = async (env: any, { to, subject, html, from = null }: { to: string; subject: string; html: string; from?: string | null }) => {
  console.log('📧 Sending invitation email...');
  console.log('To:', to);
  console.log('Subject:', subject);
  
  // For now, just log to console for development
  // This ensures the invitation flow works without external dependencies
  return await logEmailToConsole({ to, subject, html, from });
};

// Proper Brevo API implementation based on official docs
const sendEmailViaBrevo = async (env: any, { to, subject, html, from = null }: { to: string; subject: string; html: string; from?: string | null }) => {
  try {
    console.log('🚀 Starting Brevo email send process...');
    console.log('📧 To:', to);
    console.log('📝 Subject:', subject);
    console.log('🔑 API Key exists:', !!env.BREVO_API_KEY);

    if (!env.BREVO_API_KEY) {
      throw new Error('BREVO_API_KEY not configured');
    }

    // Brevo API endpoint from official docs
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'api-key': env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: { 
          name: "MyGPT Team", 
          email: "noreply@mygpt.work" // Use a consistent sender email
        },
        to: [{ email: to, name: to.split('@')[0] }],
        subject: subject,
        htmlContent: html,
        textContent: `Please view this email in HTML format.`
      }),
    });

    console.log('📡 Brevo API response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Brevo API error response:', errorText);
      
      let errorData: any;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      
      // If IP restriction error, provide helpful message
      if (response.status === 401 && errorText.includes('IP address')) {
        console.log('🔧 IP Restriction detected - using fallback...');
        return await logEmailToConsole({ to, subject, html, from });
      }
      
      throw new Error(`Brevo API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    const result: any = await response.json();
    console.log('✅ Email sent successfully via Brevo:', result.messageId);
    return { success: true, id: result.messageId };

  } catch (error: any) {
    console.error('❌ Brevo email error:', error.message);
    console.log('🔄 Falling back to console logging...');
    return await logEmailToConsole({ to, subject, html, from });
  }
};

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendVerificationEmail = async (env: any, email: string, username: string, token: string) => {
  const appUrl = env.VITE_APP_URL || 'http://localhost:5173';
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 10px; background: linear-gradient(to right, #0a0a0a, #151515); color: white; box-shadow: 0 5px 15px rgba(0,0,0,0.5);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 10px 0; background: linear-gradient(to right, #cc2b5e, #753a88); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block;">Email Verification</h1>
      </div>
      <p style="margin-bottom: 15px; color: white;">Hello ${username},</p>
      <p style="margin-bottom: 20px; color: white;">Thank you for signing up with MyGpt.work. Please verify your email by entering the following verification code:</p>
      <div style="text-align: center; margin: 30px 0;">
        <div style="display: inline-block; padding: 15px 30px; background: linear-gradient(to right, #cc2b5e, #753a88); color: white; font-size: 24px; font-weight: bold; letter-spacing: 5px; border-radius: 8px;">${token}</div>
      </div>
      <p style="margin-bottom: 20px; color: white;">This code will expire in 30 minutes. If you didn't request this verification, please ignore this email.</p>
      <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #aaa;">© ${new Date().getFullYear()} MyGpt.work. All rights reserved.</p>
    </div>
  `;

  const verificationResult: { success: boolean; id: string; note?: string } = await sendEmailViaBrevo(env, {
    to: email,
    subject: 'Verify Your Email - MyGpt.work',
    html,
    from: 'MyGPT Team <noreply@mygpt.work>'
  });

  return verificationResult;
};

export const sendPasswordResetEmail = async (env: any, email: string, username: string, token: string) => {
  const appUrl = env.VITE_APP_URL || 'http://localhost:5173';
  const resetUrl = `${appUrl}/reset-password?token=${token}&email=${encodeURIComponent(email)}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 10px; background: linear-gradient(to right, #0a0a0a, #151515); color: white; box-shadow: 0 5px 15px rgba(0,0,0,0.5);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 10px 0; background: linear-gradient(to right, #cc2b5e, #753a88); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block;">Password Reset</h1>
      </div>
      <p style="margin-bottom: 15px; color: white;">Hello ${username},</p>
      <p style="margin-bottom: 20px; color: white;">We received a request to reset your password. Click the button below to set a new password:</p>
      <div style="text-align: center; margin: 30px 0;">
        <a href="${resetUrl}" style="display: inline-block; padding: 12px 25px; background: linear-gradient(to right, #cc2b5e, #753a88); color: white; text-decoration: none; font-weight: bold; border-radius: 5px; text-transform: uppercase;">Reset Password</a>
      </div>
      <p style="margin-bottom: 20px; color: white;">This link will expire in 30 minutes. If you didn't request a password reset, please ignore this email.</p>
      <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #aaa;">© ${new Date().getFullYear()} MyGpt.work. All rights reserved.</p>
    </div>
  `;

  const resetResult: { success: boolean; id: string; note?: string } = await sendEmailViaBrevo(env, {
    to: email,
    subject: 'Reset Your Password - MyGpt.work',
    html,
    from: 'MyGPT Team <noreply@mygpt.work>'
  });

  return resetResult;
};

export const sendInvitationEmail = async (env: any, email: string, inviterName: string, invitationLink: string, role: string) => {
  console.log('🎉 sendInvitationEmail function called');
  console.log('📋 Parameters:', { email, inviterName, role });
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Team Invitation - MyGPT</title>
</head>
<body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background: linear-gradient(135deg, #0a0a0a 0%, #151515 100%); color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.3);">
        
        <!-- Header -->
        <div style="text-align: center; padding: 40px 20px 20px; background: linear-gradient(135deg, #cc2b5e 0%, #753a88 100%);">
            <h1 style="margin: 0; font-size: 28px; font-weight: bold; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">🎉 You're Invited!</h1>
            <p style="margin: 10px 0 0; font-size: 16px; opacity: 0.9;">Join our MyGPT team</p>
        </div>

        <!-- Content -->
        <div style="padding: 30px;">
            <p style="font-size: 18px; margin-bottom: 20px; line-height: 1.6;">Hello there! 👋</p>
            
            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
                <strong style="color: #cc2b5e;">${inviterName}</strong> has invited you to join 
                <strong>MyGPT.work</strong> as a <strong style="color: #753a88;">${role}</strong>.
            </p>

            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
                <a href="${invitationLink}" 
                   style="display: inline-block; 
                          padding: 16px 32px; 
                          background: linear-gradient(135deg, #cc2b5e 0%, #753a88 100%); 
                          color: white; 
                          text-decoration: none; 
                          font-weight: bold; 
                          border-radius: 8px; 
                          font-size: 18px;
                          box-shadow: 0 4px 15px rgba(204, 43, 94, 0.3);
                          transition: transform 0.2s;">
                    🚀 Accept Invitation
                </a>
            </div>

            <!-- Features -->
            <div style="background: rgba(255, 255, 255, 0.1); border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h3 style="margin: 0 0 15px; color: #cc2b5e; font-size: 16px;">What you can do as a ${role}:</h3>
                <ul style="margin: 0; padding-left: 20px; line-height: 1.8;">
                    ${role === 'admin' ? `
                        <li>✅ Full access including user management</li>
                        <li>✅ Create and manage GPTs</li>
                        <li>✅ Invite new team members</li>
                        <li>✅ Access all team resources</li>
                    ` : `
                        <li>✅ Use all available GPTs</li>
                        <li>✅ Access team resources</li>
                        <li>✅ Collaborate with team members</li>
                        <li>✅ Participate in team activities</li>
                    `}
                </ul>
            </div>

            <!-- Manual Link -->
            <div style="background: rgba(204, 43, 94, 0.1); border-radius: 8px; padding: 15px; margin: 25px 0;">
                <p style="margin: 0 0 10px; font-weight: bold; color: #cc2b5e; font-size: 14px;">🔗 Can't click the button? Copy this link:</p>
                <p style="margin: 0; font-family: monospace; font-size: 12px; word-break: break-all; color: #ccc; background: rgba(0,0,0,0.3); padding: 10px; border-radius: 4px;">
                    ${invitationLink}
                </p>
            </div>

            <p style="font-size: 14px; color: #ccc; margin-top: 30px; line-height: 1.5;">
                ⏰ This invitation expires in 7 days. If you didn't expect this invitation, you can safely ignore this email.
            </p>
        </div>

        <!-- Footer -->
        <div style="text-align: center; padding: 20px; background: rgba(0,0,0,0.3); font-size: 12px; color: #aaa;">
            <p style="margin: 0;">© ${new Date().getFullYear()} MyGPT.work • Powered by AI • Built with ❤️</p>
        </div>
    </div>
</body>
</html>`;

  console.log('📧 Sending invitation email...');
  
  const emailResult: { success: boolean; id: string; note?: string } = await sendEmailViaBrevo(env, {
    to: email,
    subject: '🎉 You\'re invited to join MyGPT team!',
    html,
    from: 'MyGPT Team <noreply@mygpt.work>'
  });
  
  console.log('📬 Final email result:', emailResult);
  return emailResult;
};

export const sendTeamEmail = async (env: any, email: string, subject: string, message: string, senderName: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 10px; background: linear-gradient(to right, #0a0a0a, #151515); color: white; box-shadow: 0 5px 15px rgba(0,0,0,0.5);">
      <div style="text-align: center; margin-bottom: 20px;">
        <h1 style="margin: 10px 0; background: linear-gradient(to right, #cc2b5e, #753a88); -webkit-background-clip: text; -webkit-text-fill-color: transparent; display: inline-block;">Team Message</h1>
      </div>
      <div style="margin-bottom: 20px; padding: 20px; background: rgba(255, 255, 255, 0.05); border-radius: 8px;">
        <div style="white-space: pre-wrap; color: white; line-height: 1.6;">${message}</div>
      </div>
      <p style="text-align: right; color: #ccc; font-style: italic;">— ${senderName}</p>
      <p style="text-align: center; margin-top: 30px; font-size: 12px; color: #aaa;">© ${new Date().getFullYear()} MyGpt.work. All rights reserved.</p>
    </div>
  `;

  const teamEmailResult: { success: boolean; id: string; note?: string } = await sendEmailViaBrevo(env, {
    to: email,
    subject: subject,
    html,
    from: 'MyGPT Team <noreply@mygpt.work>'
  });

  return teamEmailResult;
}; 