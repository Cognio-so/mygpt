import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { sendInvitationEmailViaSupabase, sendTeamNotificationViaSupabase } from "~/services/mail";
import AdminLayout from "~/components/admin/AdminLayout";
import TeamManagement from "~/components/admin/TeamManagement";
import { createClient } from '@supabase/supabase-js';
import type { UserPermissions } from "~/lib/database.types";

// Create admin client helper
const createAdminSupabaseClient = (env: any) => {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
    return null;
  }

  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false
    }
  });
};

// Default permissions for new users
const getDefaultPermissions = (role: 'admin' | 'user'): UserPermissions => {
  if (role === 'admin') {
    return {
      canCreateGpt: true,
      canEditGpt: true,
      canDeleteGpt: true,
      canInviteUsers: true,
      canManageTeam: true
    };
  }
  return {
    canCreateGpt: false,
    canEditGpt: false,
    canDeleteGpt: false,
    canInviteUsers: false,
    canManageTeam: false
  };
};

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
    // Get current user profile first
    const { data: currentUserProfile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error loading current user profile:', profileError);
    }

    // Check if user is admin
    if (currentUserProfile?.role !== 'admin') {
      return redirect('/dashboard', {
        headers: response.headers,
      });
    }

    console.log('✅ Current user is admin:', user.id, currentUserProfile.full_name);

    // Create admin client to bypass RLS for reading team members
    const adminClient = createAdminSupabaseClient(env);
    
    if (!adminClient) {
      console.error('❌ Failed to create admin client');
      throw new Error('Failed to create admin client');
    }

    // Use admin client to get ALL users except current admin
    console.log('🔍 Loading team members using admin client, excluding current admin:', user.id);
    
    const { data: allUsers, error: usersError } = await adminClient
      .from('profiles')
      .select('id, email, full_name, avatar_url, role, assigned_gpts, permissions, created_at, updated_at')
      .neq('id', user.id) // Exclude current admin user
      .order('created_at', { ascending: false });

    if (usersError) {
      console.error('❌ Error loading users with admin client:', usersError);
      throw new Error('Failed to load team members');
    }

    console.log('✅ Admin client query succeeded, loaded team members:', allUsers?.length || 0);
    console.log('📋 Users loaded:', allUsers?.map(u => ({ id: u.id, email: u.email, name: u.full_name })));

    // Transform users data with proper status detection
    const transformedMembers = allUsers?.map((member: any) => {
      console.log('🔄 Transforming member:', member.email, member.full_name);
      
      // Determine status based on recent activity
      const lastUpdate = new Date(member.updated_at || member.created_at);
      const daysSinceUpdate = (Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24);
      let status = 'active';
      
      if (daysSinceUpdate > 30) {
        status = 'inactive';
      } else if (daysSinceUpdate > 7) {
        status = 'pending';
      }

      // Parse permissions
      let permissions: UserPermissions;
      try {
        permissions = member.permissions ? JSON.parse(member.permissions) : getDefaultPermissions(member.role);
      } catch {
        permissions = getDefaultPermissions(member.role);
      }

      return {
      id: member.id,
      user_id: member.id,
        name: member.full_name || member.email?.split('@')[0] || 'Unknown User',
      email: member.email,
      avatar: member.avatar_url,
      role: member.role || 'user',
        status: status,
      joinedAt: member.created_at,
        lastActive: member.updated_at || member.created_at,
        assignedGpts: member.assigned_gpts || [],
        permissions: permissions
      };
    }) || [];

    // Get available GPTs using admin client
    const { data: availableGpts } = await adminClient
      .from('custom_gpts')
      .select('id, name, model, description, image_url')
      .limit(50);

    console.log('📊 Final data summary:', {
      teamMembersCount: transformedMembers.length,
      availableGptsCount: availableGpts?.length || 0,
      currentUserRole: currentUserProfile?.role,
      membersList: transformedMembers.map(m => ({ name: m.name, email: m.email, role: m.role }))
    });

    const responseData = { 
      teamMembers: transformedMembers,
      availableGpts: availableGpts || [],
      currentUser: {
        id: user.id,
        email: user.email || '',
        name: currentUserProfile?.full_name || user.email || 'Unknown',
        avatar: currentUserProfile?.avatar_url || null,
        role: currentUserProfile?.role || 'admin'
      },
      team: { 
        name: 'Team Members', 
        description: `Managing ${transformedMembers.length} team member${transformedMembers.length !== 1 ? 's' : ''}`
      }
    };

    console.log('🚀 Sending response data:', {
      teamMembersCount: responseData.teamMembers.length,
      hasTeamMembers: responseData.teamMembers.length > 0
    });

    return json(responseData, {
      headers: response.headers,
    });

  } catch (error) {
    console.error('❌ Critical error in team loader:', error);
    return json({ 
      teamMembers: [],
      availableGpts: [],
      currentUser: {
        id: user.id,
        email: user.email || '',
        name: user.email || 'Unknown',
        avatar: null,
        role: 'admin'
      },
      team: { 
        name: 'Team Members', 
        description: 'Error loading team data'
      },
      error: 'Failed to load team data'
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
    const adminClient = createAdminSupabaseClient(env);
    if (!adminClient) {
      return json({ error: 'Admin client not available' }, { status: 500 });
    }

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
        const { data: existingProfile, error: profileCheckError } = await adminClient
          .from('profiles')
          .select('id, email, role')
          .eq('email', email)
          .single();

        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          console.error('❌ Error checking existing profile:', profileCheckError);
          return json({ error: 'Database error while checking user' }, { status: 500 });
        }

        if (existingProfile) {
          console.log('❌ User already exists in team');
          return json({ error: 'User is already a team member' }, { status: 400 });
        }

        console.log('✅ User not in team, proceeding with invitation...');

        // Send invitation
        const emailResult = await sendInvitationEmailViaSupabase(env, email, role);
        console.log('📬 Invitation result:', emailResult);
        
        if (emailResult.success) {
          let userId: string | undefined;
          
          // Extract user ID from the result
          if ('user' in emailResult && emailResult.user) {
            userId = emailResult.user.id;
          } else if ('id' in emailResult && typeof emailResult.id === 'string') {
            userId = emailResult.id;
          }

          // Create/update profile with admin client
          if (userId) {
            console.log('💾 Creating profile with admin client...');
            const defaultPermissions = getDefaultPermissions(role);
            
            const { error: profileError } = await adminClient
              .from('profiles')
              .upsert({
                id: userId,
                email: email,
                full_name: name,
                role: role,
                assigned_gpts: [],
                permissions: JSON.stringify(defaultPermissions),
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              });

            if (profileError) {
              console.error('❌ Error creating profile:', profileError);
              return json({ error: 'Failed to create user profile' }, { status: 500 });
            }

            console.log('✅ Profile created successfully');
          }

          return json({ 
            success: true, 
            message: 'type' in emailResult && emailResult.type === 'new_invitation' 
              ? 'Invitation sent successfully!' 
              : 'User added to team successfully!',
            type: 'type' in emailResult ? emailResult.type : 'unknown'
          }, {
            headers: response.headers,
          });
        } else {
          return json({ error: 'Failed to send invitation' }, { status: 500 });
        }
      }

      case 'updateRole': {
        const userId = formData.get('userId') as string;
        const newRole = formData.get('role') as 'admin' | 'user';

        if (!userId || !newRole) {
          return json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (userId === user.id) {
          return json({ error: 'Cannot change your own role' }, { status: 400 });
        }

        console.log('🔄 Updating role for user:', userId, 'to:', newRole);

        const newPermissions = getDefaultPermissions(newRole);
        const { error } = await adminClient
          .from('profiles')
          .update({ 
            role: newRole, 
            permissions: JSON.stringify(newPermissions),
            updated_at: new Date().toISOString() 
          })
          .eq('id', userId);

        if (error) {
          console.error('❌ Error updating role:', error);
          return json({ error: 'Failed to update role' }, { status: 500 });
        }

        console.log('✅ Role updated successfully');
        return json({ success: true, message: 'Role updated successfully' }, {
          headers: response.headers,
        });
      }

      case 'updatePermissions': {
        const userId = formData.get('userId') as string;
        const permissionsData = formData.get('permissions') as string;
        const role = formData.get('role') as 'admin' | 'user';

        if (!userId || !permissionsData || !role) {
          return json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (userId === user.id) {
          return json({ error: 'Cannot change your own permissions' }, { status: 400 });
        }

        console.log('🔄 Updating permissions and role for user:', userId);

        try {
          const permissions = JSON.parse(permissionsData);
          const { error } = await adminClient
            .from('profiles')
            .update({ 
              role: role,
              permissions: JSON.stringify(permissions),
              updated_at: new Date().toISOString() 
            })
            .eq('id', userId);

          if (error) {
            console.error('❌ Error updating permissions:', error);
            return json({ error: 'Failed to update permissions' }, { status: 500 });
          }

          console.log('✅ Permissions and role updated successfully');
          return json({ success: true, message: 'Permissions updated successfully' }, {
            headers: response.headers,
          });
        } catch (parseError) {
          console.error('❌ Error parsing permissions:', parseError);
          return json({ error: 'Invalid permissions format' }, { status: 400 });
        }
      }

      case 'assignGpts': {
        const userId = formData.get('userId') as string;
        const gptIds = formData.get('gptIds') as string;

        if (!userId || !gptIds) {
          return json({ error: 'Missing required fields' }, { status: 400 });
        }

        console.log('🔄 Assigning GPTs to user:', userId);

        try {
          const assignedGpts = JSON.parse(gptIds);
          const { error } = await adminClient
            .from('profiles')
            .update({ 
              assigned_gpts: assignedGpts,
              updated_at: new Date().toISOString() 
            })
            .eq('id', userId);

          if (error) {
            console.error('❌ Error assigning GPTs:', error);
            return json({ error: 'Failed to assign GPTs' }, { status: 500 });
          }

          console.log('✅ GPTs assigned successfully');
          return json({ success: true, message: 'GPTs assigned successfully' }, {
            headers: response.headers,
          });
        } catch (parseError) {
          console.error('❌ Error parsing GPT IDs:', parseError);
          return json({ error: 'Invalid GPT IDs format' }, { status: 400 });
        }
      }

      case 'removeUser': {
        const userId = formData.get('userId') as string;

        if (!userId) {
          return json({ error: 'User ID required' }, { status: 400 });
        }

        if (userId === user.id) {
          return json({ error: 'Cannot remove yourself' }, { status: 400 });
        }

        console.log('🗑️ Removing user:', userId);

        const { error: profileError } = await adminClient
          .from('profiles')
          .delete()
          .eq('id', userId);

        if (profileError) {
          console.error('❌ Error removing user profile:', profileError);
          return json({ error: 'Failed to remove user' }, { status: 500 });
        }

        console.log('✅ User removed successfully');
        return json({ success: true, message: 'User removed successfully' }, {
          headers: response.headers,
        });
      }

      default:
        return json({ error: 'Invalid intent' }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ Team action error:', error);
    return json({ error: 'Internal server error' }, { status: 500 });
  }
}

export default function AdminTeamRoute() {
  return (
    <AdminLayout activePage="team">
      <TeamManagement />
    </AdminLayout>
  );
}