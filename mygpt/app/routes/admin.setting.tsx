import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { AdminLayout } from "~/components/admin/AdminLayout";
import AdminSettings from "~/components/admin/AdminSetting";
import { createClient } from '@supabase/supabase-js';

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

  // Get user profile with API keys
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, api_keys')
    .eq('id', user.id)
    .single();

  if (profileError) {
    console.error('❌ Error loading user profile:', profileError);
  }

  return json({
    user,
    profile
  }, {
    headers: response.headers,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
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

  // Check if user is admin
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (userProfile?.role !== 'admin') {
    return json({ error: 'Only admins can perform this action' }, { status: 403 });
  }

  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  if (intent === 'updateTheme') {
    // Theme update is handled client-side and via cookies
    // Just return success for now
    return json({ success: true }, {
      headers: response.headers,
    });
  }
  
  if (intent === 'updateApiKeys') {
    const openaiKey = formData.get('openaiKey') as string;
    const llamaKey = formData.get('llamaKey') as string;
    const geminiKey = formData.get('geminiKey') as string;
    const claudeKey = formData.get('claudeKey') as string;
    const displayName = formData.get('displayName') as string;
    
    // Use admin client to bypass RLS
    const adminClient = createAdminSupabaseClient(env);
    if (!adminClient) {
      return json({ error: 'Admin client not available' }, { status: 500 });
    }
    
    try {
      // Create API keys object
      const apiKeys = {
        openai: openaiKey || null,
        llama: llamaKey || null,
        gemini: geminiKey || null,
        claude: claudeKey || null
      };
      
      // Update profile with API keys
      const { error } = await adminClient
        .from('profiles')
        .update({ 
          api_keys: apiKeys,
          full_name: displayName || null,
          updated_at: new Date().toISOString() 
        })
        .eq('id', user.id);
        
      if (error) {
        console.error('❌ Error updating API keys:', error);
        return json({ error: 'Failed to update API keys' }, { status: 500 });
      }
      
      console.log('✅ API keys updated successfully');
      return json({ success: true, message: 'API keys updated successfully' }, {
        headers: response.headers,
      });
    } catch (error) {
      console.error('❌ Error updating API keys:', error);
      return json({ error: 'Internal server error' }, { status: 500 });
    }
  }

  return json({ error: 'Invalid action' }, {
    status: 400,
    headers: response.headers,
  });
}

export default function SettingsRoute() {
  const loaderData = useLoaderData<typeof loader>();

  return (
    <AdminLayout activePage="settings">
      <AdminSettings />
    </AdminLayout>
  );
} 