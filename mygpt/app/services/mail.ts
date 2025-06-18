import { createClient } from '@supabase/supabase-js';

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

// Create admin client with service role (bypasses RLS)
const createAdminSupabaseClient = (env: any) => {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    return null;
  }

  console.log('🔧 Creating admin client with URL:', env.SUPABASE_URL);
  console.log('🔑 Service role key exists:', !!env.SUPABASE_SERVICE_ROLE_KEY);

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
};

export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Enhanced invitation system with proper database operations
export const sendInvitationEmailViaSupabase = async (env: any, email: string, role: string = 'user') => {
  try {
    console.log('🚀 Starting Supabase invitation process...');
    console.log('📧 Email:', email);
    console.log('🏷️ Role:', role);

    // Create admin client with service role
    const adminSupabase = createAdminSupabaseClient(env);
    
    if (!adminSupabase) {
      throw new Error('Failed to create admin Supabase client - missing service role key');
    }

    // Try to invite user directly - this will handle both new and existing users
    console.log('📤 Attempting to send invitation...');
    
    const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
      data: {
        role: role,
        invited_at: new Date().toISOString(),
        app_name: 'MyGPT.work',
        full_name: '' // This will be updated later
      },
      redirectTo: `${env.VITE_APP_URL}/auth/callback`
    });

    if (error) {
      console.error('❌ Supabase invitation error:', error);
      
      // Handle specific error cases
      if (error.message.includes('already been registered') || 
          error.message.includes('email_exists') ||
          error.code === 'email_exists') {
        
        console.log('👤 User already exists - attempting to get user info...');
        
        // Try to get existing user info using listUsers with email filter
        try {
          const { data: usersList, error: listError } = await adminSupabase.auth.admin.listUsers({
            page: 1,
            perPage: 1000
          });

          if (listError) {
            console.error('❌ Error listing users:', listError);
            throw listError;
          }

          // Find user by email
          const existingUser = usersList?.users?.find(u => u.email === email);
          
          if (existingUser) {
            console.log('✅ Found existing user:', existingUser.id);
            return {
              success: true,
              id: existingUser.id,
              user: existingUser,
              type: 'existing_user',
              message: 'User already exists - ready to add to team',
              adminClient: adminSupabase // Return admin client for database operations
            };
          }
        } catch (listError) {
          console.error('❌ Error finding existing user:', listError);
        }

        // Fallback for existing user case
        return {
          success: true,
          id: 'existing-user-' + Date.now(),
          user: null,
          type: 'existing_user',
          message: 'User already registered - ready to add to team',
          adminClient: adminSupabase // Return admin client for database operations
        };
      }
      
      // For other errors, throw to be caught by outer catch
      throw error;
    }

    console.log('✅ New invitation sent successfully:', data);
    return { 
      success: true, 
      id: data.user?.id || 'supabase-invite-' + Date.now(),
      user: data.user,
      type: 'new_invitation',
      message: 'Invitation sent successfully',
      adminClient: adminSupabase // Return admin client for database operations
    };

  } catch (error: any) {
    console.error('❌ Supabase invitation process error:', error.message);
    console.log('🔄 Falling back to console logging...');
    
    // Fallback to console log
    return await logEmailToConsole({
      to: email,
      subject: '🎉 You\'re invited to join MyGPT team!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>🎉 Welcome to MyGPT Team!</h2>
          <p>Hi there,</p>
          <p>You've been invited to join our MyGPT team with the role: <strong>${role}</strong></p>
          <p>Please visit <a href="${env.VITE_APP_URL}">MyGPT.work</a> to get started.</p>
          <p>Best regards,<br>MyGPT Team</p>
          <hr>
          <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} MyGPT.work</p>
        </div>
      `,
      from: 'MyGPT Team <noreply@mygpt.work>'
    });
  }
};

// Send notification to existing users
export const sendTeamNotificationViaSupabase = async (env: any, email: string, role: string, teamName: string = 'MyGPT') => {
  console.log('📧 Sending team notification to existing user:', email);
  
  return await logEmailToConsole({
    to: email,
    subject: `🎉 You've been added to ${teamName} team!`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>🎉 Welcome to ${teamName} Team!</h2>
        <p>Hi there,</p>
        <p>Great news! You've been added to our ${teamName} team with the role: <strong>${role}</strong></p>
        <p>You can now access your new team features by logging into <a href="${env.VITE_APP_URL}">MyGPT.work</a></p>
        <div style="background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 20px 0;">
          <p><strong>What's Next?</strong></p>
          <ul>
            <li>Log into your account at MyGPT.work</li>
            <li>Explore your new team permissions</li>
            <li>Start collaborating with your team members</li>
          </ul>
      </div>
        <p>Best regards,<br>MyGPT Team</p>
        <hr>
        <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} MyGPT.work</p>
      </div>
    `,
    from: 'MyGPT Team <noreply@mygpt.work>'
  });
};

// Get user by email using admin client
export const getUserByEmailViaSupabase = async (env: any, email: string) => {
  try {
    const adminSupabase = createAdminSupabaseClient(env);
    
    if (!adminSupabase) {
      throw new Error('Failed to create admin Supabase client');
    }

    console.log('🔍 Searching for user by email:', email);
    
    // List users and find by email
    const { data: usersList, error } = await adminSupabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000
    });

    if (error) {
      console.error('❌ Error listing users:', error);
      throw error;
    }

    // Find user by email
    const user = usersList?.users?.find(u => u.email === email);
    
    if (user) {
      console.log('✅ Found user:', user.id);
      return { user, error: null };
    } else {
      console.log('❌ User not found');
      return { user: null, error: null };
    }

  } catch (error: any) {
    console.error('❌ Error getting user by email:', error);
    return { user: null, error };
  }
};

// Use Supabase Auth for password reset
export const sendPasswordResetViaSupabase = async (supabase: any, env: any, email: string) => {
  try {
    console.log('🚀 Starting Supabase password reset...');
    console.log('📧 For email:', email);

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${env.VITE_APP_URL}/auth/callback?type=recovery`
    });

    if (error) {
      console.error('❌ Supabase password reset error:', error);
      throw error;
    }

    console.log('✅ Password reset sent successfully via Supabase');
    return { 
      success: true, 
      id: 'supabase-reset-' + Date.now()
    };

  } catch (error: any) {
    console.error('❌ Supabase password reset error:', error.message);
    console.log('🔄 Falling back to console logging...');
    
    return await logEmailToConsole({
    to: email,
    subject: 'Reset Your Password - MyGpt.work',
      html: `<p>Password reset requested for ${email}</p>`,
    from: 'MyGPT Team <noreply@mygpt.work>'
  });
  }
};

// Use Supabase Auth for email verification (this is automatic with Supabase)
export const sendVerificationEmailViaSupabase = async (supabase: any, env: any, email: string) => {
  try {
    console.log('🚀 Starting Supabase email verification...');
    console.log('📧 For email:', email);

    // Supabase handles email verification automatically during signup
    // But we can resend verification if needed
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
      options: {
        emailRedirectTo: `${env.VITE_APP_URL}/auth/callback`
      }
    });

    if (error) {
      console.error('❌ Supabase verification error:', error);
      throw error;
    }

    console.log('✅ Verification email resent successfully via Supabase');
    return { 
      success: true, 
      id: 'supabase-verify-' + Date.now()
    };

  } catch (error: any) {
    console.error('❌ Supabase verification error:', error.message);
    console.log('🔄 Falling back to console logging...');
    
    return await logEmailToConsole({
    to: email,
      subject: 'Verify Your Email - MyGpt.work',
      html: `<p>Email verification for ${email}</p>`,
    from: 'MyGPT Team <noreply@mygpt.work>'
  });
  }
};

// Simple team communication (for internal messages, not auth-related)
export const sendTeamMessage = async (env: any, email: string, subject: string, message: string, senderName: string) => {
  console.log('📧 Team message would be sent to:', email);
  console.log('📝 Subject:', subject);
  console.log('💬 Message:', message);
  console.log('👤 From:', senderName);
  
  return await logEmailToConsole({
    to: email,
    subject: `[MyGPT Team] ${subject}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2>${subject}</h2>
        <p>Hi there,</p>
        <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="white-space: pre-wrap;">${message}</p>
        </div>
        <p>Best regards,<br>${senderName}</p>
        <hr>
        <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} MyGPT.work</p>
      </div>
    `,
    from: `${senderName} via MyGPT <noreply@mygpt.work>`
  });
}; 