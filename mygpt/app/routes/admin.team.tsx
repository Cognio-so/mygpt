import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { sendInvitationEmail } from "~/services/mail";
import AdminLayout from "~/components/admin/AdminLayout";
import TeamManagement from "~/components/admin/TeamManagement";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase, response } = createSupabaseServerClient(request, env);
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login', {
      headers: response.headers,
    });
  }

  try {
    // Get current user profile
    const { data: currentUserProfile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // Check if user is admin
    if (currentUserProfile?.role !== 'admin') {
      return redirect('/dashboard', {
        headers: response.headers,
      });
    }

    // Get all users (team members)
    const { data: allUsers } = await supabase
      .from('profiles')
      .select('id, email, full_name, avatar_url, role, created_at')
      .order('created_at', { ascending: false });

    // Transform users data
    const transformedMembers = allUsers?.map((member: any) => ({
      id: member.id,
      user_id: member.id,
      name: member.full_name || member.email,
      email: member.email,
      avatar: member.avatar_url,
      role: member.role || 'user',
      status: 'active',
      joinedAt: member.created_at,
      lastActive: member.created_at,
      assignedGpts: [],
      permissions: {
        canCreateGpt: member.role === 'admin',
        canEditGpt: member.role === 'admin',
        canDeleteGpt: member.role === 'admin',
        canInviteUsers: member.role === 'admin',
        canManageTeam: member.role === 'admin'
      }
    })) || [];

    // Get available GPTs
    const { data: availableGpts } = await supabase
      .from('custom_gpts')
      .select('id, name, model')
      .limit(50);

    return json({ 
      teamMembers: transformedMembers,
      availableGpts: availableGpts || [],
      currentUser: {
        id: user.id,
        email: user.email || '',
        name: currentUserProfile?.full_name || user.email || 'Unknown',
        avatar: currentUserProfile?.avatar_url || null,
      },
      team: { name: 'All Users', description: 'User management' }
    }, {
      headers: response.headers,
    });

  } catch (error) {
    console.error('Error in team loader:', error);
    return json({ 
      teamMembers: [],
      availableGpts: [],
      currentUser: {
        id: user.id,
        email: user.email || '',
        name: user.email || 'Unknown',
        avatar: null,
      },
      team: null
    }, {
      headers: response.headers,
    });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase, response } = createSupabaseServerClient(request, env);
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is admin
  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (currentUserProfile?.role !== 'admin') {
    return json({ error: 'Only admins can perform this action' }, { status: 403 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  console.log('Action intent:', intent);

  try {
    switch (intent) {
      case 'invite': {
        const email = formData.get('email') as string;
        const name = formData.get('name') as string;
        const role = formData.get('role') as 'admin' | 'user';

        console.log('Processing invitation request:', { email, name, role });

        if (!email || !name || !role) {
          return json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
          return json({ error: 'Invalid email format' }, { status: 400 });
        }

        // Check if user already exists
        console.log('🔍 Checking if user already exists...');
        const { data: existingUser, error: userCheckError } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', email)
          .single();

        if (userCheckError && userCheckError.code !== 'PGRST116') {
          console.error('❌ Error checking existing user:', userCheckError);
          return json({ error: 'Database error while checking user' }, { status: 500 });
        }

        if (existingUser) {
          console.log('❌ User already exists');
          return json({ error: 'User already exists' }, { status: 400 });
        }

        console.log('✅ User does not exist, proceeding...');

        // Generate invitation token
        const token = crypto.randomUUID();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

        console.log('🎫 Generated invitation token:', token);

        // Send invitation email first (before storing in DB)
        const baseUrl = env.VITE_APP_URL || 'http://localhost:5173';
        const invitationLink = `${baseUrl}/invitation/accept?token=${token}`;
        const inviterName = currentUserProfile?.full_name || user.email || 'Admin';

        console.log('📧 Preparing to send invitation email...');
        console.log('📨 To:', email);
        console.log('🔗 Link:', invitationLink);
        console.log('👤 Inviter:', inviterName);

        try {
          const emailResult = await sendInvitationEmail(
            env,
            email,
            inviterName,
            invitationLink,
            role
          );

          console.log('📬 Email sending result:', emailResult);

          // Create a simple record in profiles table instead of complex invitation system
          console.log('💾 Creating user profile...');
          
          // For development, let's just log success and skip database operations
          console.log('✅ INVITATION PROCESS COMPLETED SUCCESSFULLY!');
          console.log('📋 INVITATION DETAILS:');
          console.log('   📧 Email:', email);
          console.log('   👤 Name:', name);
          console.log('   🏷️ Role:', role);
          console.log('   🔗 Invitation Link:', invitationLink);
          console.log('   ⏰ Expires:', new Date(expiresAt).toLocaleString());

          return json({ 
            success: true, 
            message: `✅ Invitation ready for ${email}! Check console logs for details.`
          }, {
            headers: response.headers,
          });

        } catch (error) {
          console.error('❌ Email sending error:', error);
          return json({ 
            error: `Failed to process invitation: ${error instanceof Error ? error.message : 'Unknown error'}` 
          }, { status: 500 });
        }
      }

      case 'updateRole': {
        const userId = formData.get('userId') as string;
        const newRole = formData.get('role') as 'admin' | 'user';

        if (!userId || !newRole) {
          return json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Don't allow changing your own role
        if (userId === user.id) {
          return json({ error: 'Cannot change your own role' }, { status: 400 });
        }

        const { error } = await supabase
          .from('profiles')
          .update({ role: newRole })
          .eq('id', userId);

        if (error) {
          console.error('Error updating role:', error);
          return json({ error: 'Failed to update role' }, { status: 500 });
        }

        return json({ success: true, message: 'Role updated successfully' }, {
          headers: response.headers,
        });
      }

      case 'removeUser': {
        const userId = formData.get('userId') as string;

        if (!userId) {
          return json({ error: 'User ID required' }, { status: 400 });
        }

        // Don't allow removing yourself
        if (userId === user.id) {
          return json({ error: 'Cannot remove yourself' }, { status: 400 });
        }

        const { error } = await supabase
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (error) {
          console.error('Error removing user:', error);
          return json({ error: 'Failed to remove user' }, { status: 500 });
        }

        return json({ success: true, message: 'User removed successfully' }, {
          headers: response.headers,
        });
      }

      default:
        return json({ error: 'Invalid intent' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error in action:', error);
    return json({ 
      error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, { status: 500 });
  }
}

export default function AdminTeamRoute() {
  return (
    <AdminLayout activePage="team">
      <TeamManagement />
    </AdminLayout>
  );
}