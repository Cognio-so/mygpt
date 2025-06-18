import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import UserChat from "~/components/user/UserChat";
import UserSidebar from "~/components/user/UserSidebar";
import { requireUserAuth } from "~/lib/auth.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getThemeFromCookie } from "~/lib/theme";

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
  const { supabase } = createSupabaseServerClient(request, env);
  const theme = getThemeFromCookie(request) || 'light';
  
  const gptId = params.id;
  
  if (!gptId) {
    return redirect('/user', {
      headers: response.headers,
    });
  }

  try {
    // Fetch the specific GPT data
    const { data: gptData, error: gptError } = await supabase
      .from('custom_gpts')
      .select('*')
      .eq('id', gptId)
      .single();

    if (gptError || !gptData) {
      console.error('Error fetching GPT:', gptError);
      return redirect('/user', {
        headers: response.headers,
      });
    }

    // Check if user has access to this GPT (either owner or assigned)
    const hasAccess = gptData.user_id === user.id || gptData.is_public;
    
    if (!hasAccess) {
      return redirect('/user', {
        headers: response.headers,
      });
    }

    // Fetch knowledge files for this GPT
    const { data: knowledgeFiles } = await supabase
      .from('knowledge_files')
      .select('id, file_name, file_url')
      .eq('gpt_id', gptId);

    // Transform the data to match the expected interface
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

    // Notify backend that GPT is being opened - FIXED VERSION
    const pythonBackendUrl = env.PYTHON_BACKEND_URL || 'http://localhost:8000';
    try {
      console.log(`🚪 User Chat Route: Notifying backend of GPT opened: ${gptId}`);
      
      // Prepare the payload with proper validation
      const gptOpenedPayload = {
        user_email: user.email || "",  // Ensure string
        gpt_id: gptId || "",           // Ensure string
        gpt_name: gptData.name || "Custom GPT",  // Ensure string
        file_urls: Array.isArray(knowledgeFiles) ? 
          knowledgeFiles
            .map((file: any) => file.file_url)
            .filter((url: any) => url && typeof url === 'string') : [],  // Ensure array of strings
        use_hybrid_search: true,  // Ensure boolean
        schema: {  // Use 'schema' key as per alias
          model: gptData.model || "gpt-4o",
          instructions: gptData.instructions || ""
        },
        api_keys: {}  // Ensure object
      };
      
      console.log(`🚪 User Chat Route: GPT-opened payload:`, JSON.stringify(gptOpenedPayload, null, 2));
      
      // Make the request with proper error handling
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
    console.error('Loader error:', error);
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
