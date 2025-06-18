import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import UserDashboard from "~/components/user/UserDashboard";
import UserSidebar from "~/components/user/UserSidebar";
import { requireUserAuth } from "~/lib/auth.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getThemeFromCookie } from "~/lib/theme";
import { createClient } from '@supabase/supabase-js';

export const meta: MetaFunction = () => {
  return [
    { title: "User Dashboard - AI Agents" },
    { name: "description", content: "Access and manage your AI agents." },
    { name: "robots", content: "index, follow" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
};

// Create admin client helper for reading GPTs
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

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { user, profile, response } = await requireUserAuth(request, env);
  const { supabase } = createSupabaseServerClient(request, env);
  const theme = getThemeFromCookie(request) || 'light';

  if (!user) {
    return redirect('/login', {
      headers: response.headers,
    });
  }

  try {
    // Get user profile with assignments and permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, assigned_gpts, permissions')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ Error loading user profile:', profileError);
    }

    console.log('👤 User profile loaded:', {
      id: userProfile?.id,
      role: userProfile?.role,
      assignedGpts: userProfile?.assigned_gpts,
      assignedGptsCount: userProfile?.assigned_gpts?.length || 0
    });

    // Get all available GPTs using admin client
    const adminClient = createAdminSupabaseClient(env);
    let allGpts: any[] = [];

    if (adminClient) {
      const { data: gpts, error: gptsError } = await adminClient
        .from('custom_gpts')
        .select('id, name, description, model, image_url, web_browsing, folder, created_at')
        .order('created_at', { ascending: false });

      if (gptsError) {
        console.error('❌ Error loading GPTs:', gptsError);
      } else {
        console.log('📋 All GPTs loaded:', gpts?.length || 0);
        allGpts = gpts || [];
      }
    }

    // Transform GPTs to match the expected Agent interface
    const agents = allGpts.map((gpt: any) => ({
      _id: gpt.id,
      name: gpt.name,
      description: gpt.description,
      model: gpt.model,
      imageUrl: gpt.image_url,
      capabilities: {
        webBrowsing: gpt.web_browsing || false
      },
      createdAt: gpt.created_at,
      folder: gpt.folder
    }));

    // Parse permissions if they exist
    let permissions = null;
    if (userProfile?.permissions) {
      try {
        permissions = typeof userProfile.permissions === 'string' 
          ? JSON.parse(userProfile.permissions)
          : userProfile.permissions;
      } catch (e) {
        console.error('❌ Error parsing permissions:', e);
      }
    }

    const responseData = {
      agents,
      userProfile: {
        id: userProfile?.id || user.id,
        email: userProfile?.email || user.email || '',
        full_name: userProfile?.full_name,
        role: userProfile?.role || 'user',
        assigned_gpts: userProfile?.assigned_gpts || [],
        permissions
      },
      theme
    };

    console.log('🚀 Sending user dashboard data:', {
      agentsCount: agents.length,
      userRole: responseData.userProfile.role,
      assignedGptsCount: responseData.userProfile.assigned_gpts.length,
      hasPermissions: !!permissions
    });

    return json(responseData, {
      headers: response.headers,
    });

  } catch (error) {
    console.error('❌ Critical error in user dashboard loader:', error);
    return json({ 
      agents: [],
      userProfile: {
        id: user.id,
        email: user.email || '',
        full_name: null,
        role: 'user',
        assigned_gpts: [],
        permissions: null
      },
      error: 'Failed to load dashboard data'
    }, {
      headers: response.headers,
    });
  }
}

export default function UserDashboardRoute(){
    return(
      <div className="flex h-screen w-full bg-white dark:bg-gray-900">
        <UserSidebar/>
        <div className="flex-1">
          <UserDashboard/>
        </div>
      </div>
    )
}