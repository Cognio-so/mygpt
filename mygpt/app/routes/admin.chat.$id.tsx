import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import AdminChat from "~/components/admin/AdminChat";
import AdminLayout from "~/components/admin/AdminLayout";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { MetaFunction } from "@remix-run/node";
import type { FileAttachment } from "~/lib/database.types";

export async function loader({ request, context, params }: LoaderFunctionArgs) {
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

  const gptId = params.id;
  
  if (!gptId) {
    return redirect('/admin', {
      headers: response.headers,
    });
  }

  try {
    // Fetch the specific GPT data
    const { data: gptData, error: gptError } = await supabase
      .from('custom_gpts')
      .select('*')
      .eq('id', gptId)
      .eq('user_id', user.id)
      .single();

    if (gptError || !gptData) {
      console.error('Error fetching GPT:', gptError);
      return redirect('/admin');
    }

    // Parse knowledge base from JSON string
    let knowledgeBase: FileAttachment[] = [];
    if (gptData.knowledge_base) {
      try {
        knowledgeBase = JSON.parse(gptData.knowledge_base);
      } catch (error) {
        console.error('Error parsing knowledge base:', error);
      }
    }

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
      knowledgeBase,  // Now directly from JSON column
      imageUrl: gptData.image_url,
      conversationStarter: gptData.conversation_starter,
    };

    // Notify backend that GPT is being opened - FIXED VERSION
    const pythonBackendUrl = env.PYTHON_BACKEND_URL || 'http://localhost:8000';
    try {
      console.log(`🚪 Admin Chat Route: Notifying backend of GPT opened: ${gptId}`);
      
      // Prepare the payload with proper validation
      const gptOpenedPayload = {
        user_email: user.email || "",  // Ensure string
        gpt_id: gptId || "",           // Ensure string
        gpt_name: gptData.name || "Custom GPT",  // Ensure string
        file_urls: Array.isArray(knowledgeBase) ? 
          knowledgeBase
            .map((file: any) => file.url)
            .filter((url: any) => url && typeof url === 'string') : [],  // Ensure array of strings
        use_hybrid_search: true,  // Ensure boolean
        schema: {  // Use 'schema' key as per alias
          model: gptData.model || "gpt-4o",
          instructions: gptData.instructions || ""
        },
        api_keys: {}  // Ensure object
      };
      
      console.log(`🚪 Admin Chat Route: GPT-opened payload:`, JSON.stringify(gptOpenedPayload, null, 2));
      
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
        console.error(`❌ Admin Chat Route: GPT-opened failed (${gptOpenedResponse.status}):`, errorText);
      } else {
        const successData = await gptOpenedResponse.json();
        console.log(`✅ Admin Chat Route: GPT-opened successful:`, successData);
      }
      
    } catch (error) {
      console.error('❌ Admin Chat Route: Error with gpt-opened:', error);
      // Continue without breaking the loader
    }

    return json({
      gptData: transformedGptData,
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
        profilePic: user.user_metadata?.avatar_url,
      }
    }, {
      headers: response.headers,
    });

  } catch (error) {
    console.error('Loader error:', error);
    return redirect('/admin', {
      headers: response.headers,
    });
  }
}

export const meta: MetaFunction<typeof loader> = ({ data, params }) => {
  return [
    { title: data?.gptData?.name ? `Chat with ${data.gptData.name}` : "AI Chat" },
    { name: "description", content: "Chat with your custom AI agent" },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export default function AdminChatRoute() {
  return (  
    <AdminLayout>
      <AdminChat />
    </AdminLayout>
  );
}