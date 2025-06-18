import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { createClient } from "@supabase/supabase-js";
import UserChat from "~/components/user/UserChat";
import UserSidebar from "~/components/user/UserSidebar";
import { requireUserAuth } from "~/lib/auth.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getThemeFromCookie } from "~/lib/theme";
import type { Database } from "~/lib/database.types";

const createAdminSupabaseClient = (env: any) => {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("❌ Missing Supabase URL or Service Role Key for admin client");
    return null;
  }
  return createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
};

export const meta: MetaFunction = () => {
  return [
    { title: "Chat - AI Agent" },
    { name: "description", content: "Chat with your AI agent." },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export async function loader({ request, context, params }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { user, profile, response } = await requireUserAuth(request, env);
  const theme = getThemeFromCookie(request) || 'light';
  
  const gptId = params.id;
  
  console.log('🚪 User Chat Route: Loading GPT with ID:', gptId);
  console.log('🚪 User Chat Route: User ID:', user.id);
  
  if (!gptId) {
    console.log('❌ User Chat Route: No GPT ID provided, redirecting to /user');
    return redirect('/user', {
      headers: response.headers,
    });
  }

  // Create an admin client to bypass RLS for the initial fetch
  const adminClient = createAdminSupabaseClient(context.cloudflare.env);
  if (!adminClient) {
    console.error("❌ User Chat Route: Failed to create admin client. Cannot fetch GPT data.");
    return redirect('/user', { headers: response.headers });
  }

  try {
    // Fetch the user's profile to check their assignments and role
    const { supabase } = createSupabaseServerClient(request, env);
    const { data: userProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, assigned_gpts')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('❌ User Chat Route: Error fetching user profile:', profileError);
      // We can continue, but access might be limited if the profile is needed for assignment checks.
    } else {
      console.log('👤 User Chat Route: User profile loaded:', {
        role: userProfile?.role,
        assignedGpts: userProfile?.assigned_gpts
      });
    }

    // Fetch the specific GPT data using the admin client to ensure it's found
    const { data: gptData, error: gptError } = await adminClient
      .from('custom_gpts')
      .select('*')
      .eq('id', gptId)
      .single();

    if (gptError || !gptData) {
      console.error(`❌ User Chat Route: GPT with ID ${gptId} not found in database, even with admin client.`, gptError);
      return redirect('/user', {
        headers: response.headers,
      });
    }

    console.log('🤖 User Chat Route: GPT data loaded successfully with admin client:', {
      id: gptData.id,
      name: gptData.name,
    });

    // NOW, perform the authorization check in code
    let hasAccess = false;
    if (userProfile?.role === 'admin') {
      hasAccess = true;
      console.log('✅ User Chat Route: Access granted - User is admin.');
    } else if (gptData.user_id === user.id) {
      hasAccess = true;
      console.log('✅ User Chat Route: Access granted - User is the owner.');
    } else if (gptData.is_public) {
      hasAccess = true;
      console.log('✅ User Chat Route: Access granted - GPT is public.');
    } else if (userProfile?.assigned_gpts?.includes(gptId)) {
      hasAccess = true;
      console.log('✅ User Chat Route: Access granted - GPT is assigned to user.');
    }
    
    if (!hasAccess) {
      console.log('❌ User Chat Route: Access denied. User does not have permission for this GPT.', {
        userRole: userProfile?.role,
        isOwner: gptData.user_id === user.id,
        isPublic: gptData.is_public,
        isAssigned: userProfile?.assigned_gpts?.includes(gptId)
      });
      return redirect('/user', {
        headers: response.headers,
      });
    }

    console.log('✅ User Chat Route: Access verified. Proceeding to prepare chat data.');

    // Fetch knowledge files for this GPT (can use admin client for consistency)
    const { data: knowledgeFiles } = await adminClient
      .from('knowledge_files')
      .select('id, file_name, file_url')
      .eq('gpt_id', gptId);

    // Transform data similar to admin._index.tsx approach
    const transformedGptData = {
      _id: gptData.id,
      name: gptData.name,
      description: gptData.description,
      model: gptData.model,
      instructions: gptData.instructions,
      capabilities: {
        webBrowsing: gptData.web_browsing || false,
      },
      knowledgeBase: knowledgeFiles?.map((file: any) => ({
        fileName: file.file_name,
        fileUrl: file.file_url,
      })) || [],
      imageUrl: gptData.image_url,
      conversationStarter: gptData.conversation_starter,
    };

    console.log('✅ User Chat Route: Successfully prepared GPT data for chat');

    // Notify backend that GPT is being opened
    const pythonBackendUrl = env.PYTHON_BACKEND_URL || 'http://localhost:8000';
    try {
      console.log(`🚪 User Chat Route: Notifying backend of GPT opened: ${gptId}`);
      
      // Prepare the payload with proper validation
      const gptOpenedPayload = {
        user_email: user.email || "",
        gpt_id: gptId || "",
        gpt_name: gptData.name || "Custom GPT",
        file_urls: Array.isArray(knowledgeFiles) ? 
          knowledgeFiles
            .map((file: any) => file.file_url)
            .filter((url: any) => url && typeof url === 'string') : [],
        use_hybrid_search: true,
        schema: {
          model: gptData.model || "gpt-4o",
          instructions: gptData.instructions || ""
        },
        api_keys: {}
      };
      
      console.log(`🚪 User Chat Route: GPT-opened payload:`, JSON.stringify(gptOpenedPayload, null, 2));
      
      const gptOpenedResponse = await fetch(`${pythonBackendUrl}/gpt-opened`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gptOpenedPayload)
      });
      
      if (!gptOpenedResponse.ok) {
        const errorText = await gptOpenedResponse.text();
        console.error(`❌ User Chat Route: GPT-opened failed (${gptOpenedResponse.status}):`, errorText);
      } else {
        const successData = await gptOpenedResponse.json();
        console.log(`✅ User Chat Route: GPT-opened successful:`, successData);
      }
      
    } catch (error) {
      console.error('❌ User Chat Route: Error with gpt-opened:', error);
      // Continue without breaking the loader
    }

    return json({
      gptData: transformedGptData,
      user: {
        id: user.id,
        email: user.email,
        name: profile?.full_name || user.email,
        profilePic: profile?.avatar_url,
      },
      theme
    }, {
      headers: response.headers,
    });

  } catch (error) {
    console.error('❌ User Chat Route: Loader error:', error);
    return redirect('/user', {
      headers: response.headers,
    });
  }
}

export default function UserChatRoute() {
  return (  
    <div className="flex h-screen w-full bg-white dark:bg-gray-900">
      <UserSidebar />
      <div className="flex-1">
        <UserChat />
      </div>
    </div>
  );
}
