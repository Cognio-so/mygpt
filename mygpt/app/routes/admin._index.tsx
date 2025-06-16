import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import AdminLayout from "~/components/admin/AdminLayout";
import AdminDashboard from "~/components/admin/AdminDashboard";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export const meta: MetaFunction = () => {
  return [
    { title: "Admin Dashboard - AI Agents Management" },
    { name: "description", content: "Manage and organize your AI agents efficiently with our admin dashboard." },
    { name: "robots", content: "index, follow" },
    { name: "viewport", content: "width=device-width, initial-scale=1" },
  ];
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
    // First, fetch custom GPTs for the user
    const { data: agents, error } = await supabase
      .from('custom_gpts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching custom GPTs:', error);
      return json({ agents: [] }, {
        headers: response.headers,
      });
    }

    // Then, if there are agents, fetch their knowledge files separately
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
        name: user.user_metadata?.full_name || user.email,
      }
    }, {
      headers: response.headers,
    });

  } catch (error) {
    console.error('Loader error:', error);
    return json({ agents: [] }, {
      headers: response.headers,
    });
  }
}

export default function AdminDashboardPage() {
  return (
    <AdminLayout>
      <AdminDashboard />
    </AdminLayout>
  );
}