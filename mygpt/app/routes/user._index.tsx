import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import UserDashboard from "~/components/user/UserDashboard";
import UserSidebar from "~/components/user/UserSidebar";
import { requireUserAuth } from "~/lib/auth.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getThemeFromCookie } from "~/lib/theme";

export const meta: MetaFunction = () => {
  return [
    { title: "User Dashboard - AI Agents" },
    { name: "description", content: "Access and manage your AI agents." },
    { name: "robots", content: "index, follow" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { user, profile, response } = await requireUserAuth(request, env);
  const { supabase } = createSupabaseServerClient(request, env);
  const theme = getThemeFromCookie(request) || 'light';

  try {
    // Fetch custom GPTs for the user
    const { data: agents, error } = await supabase
      .from('custom_gpts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching custom GPTs:', error);
      return json({ agents: [], theme }, {
        headers: response.headers,
      });
    }

    // Transform agents data
    const transformedAgents = [];
    
    if (agents && agents.length > 0) {
      for (const agent of agents) {
        // Fetch knowledge files for each agent
        const { data: knowledgeFiles } = await supabase
          .from('knowledge_files')
          .select('id, file_name, file_url')
          .eq('gpt_id', agent.id);

        transformedAgents.push({
          _id: agent.id,
          name: agent.name,
          description: agent.description,
          imageUrl: agent.image_url,
          model: agent.model,
          capabilities: {
            webBrowsing: agent.web_browsing,
          },
          createdAt: agent.created_at,
          folder: agent.folder,
          knowledgeBase: knowledgeFiles?.map((file: any) => ({
            fileName: file.file_name,
            fileUrl: file.file_url,
          })) || [],
        });
      }
    }

    return json({ 
      agents: transformedAgents,
      user: {
        id: user.id,
        email: user.email,
        name: profile?.name || user.email,
      },
      theme
    }, {
      headers: response.headers,
    });

  } catch (error) {
    console.error('Loader error:', error);
    return json({ agents: [], theme }, {
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