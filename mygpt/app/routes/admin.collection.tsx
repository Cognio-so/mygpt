import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { AdminLayout } from "~/components/admin/AdminLayout";
import AdminCollection from "~/components/admin/AdminCollection";
import { MetaFunction } from "@remix-run/node";

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
    // Fetch custom GPTs for the user
    const { data: customGpts, error } = await supabase
      .from('custom_gpts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching custom GPTs:', error);
      return json({ 
        customGpts: [],
        user: {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.email,
        }
      }, {
        headers: response.headers,
      });
    }

    // Transform the data and fetch knowledge files for each GPT
    const transformedGpts = [];
    
    if (customGpts && customGpts.length > 0) {
      // Get all GPT IDs
      const gptIds = customGpts.map(gpt => gpt.id);
      
      // Fetch all knowledge files in one query
      const { data: allKnowledgeFiles } = await supabase
        .from('knowledge_files')
        .select('id, file_name, file_url, gpt_id')
        .in('gpt_id', gptIds);

      // Group knowledge files by gpt_id
      const knowledgeFilesByGptId = allKnowledgeFiles?.reduce((acc, file) => {
        if (!acc[file.gpt_id]) acc[file.gpt_id] = [];
        acc[file.gpt_id].push(file);
        return acc;
      }, {} as Record<string, any[]>) || {};

      // Transform GPTs with their knowledge files
      for (const gpt of customGpts) {
        const knowledgeFiles = knowledgeFilesByGptId[gpt.id] || [];
        transformedGpts.push({
          _id: gpt.id,
          name: gpt.name,
          description: gpt.description,
          imageUrl: gpt.image_url,
          model: gpt.model,
          capabilities: { webBrowsing: gpt.web_browsing },
          createdAt: gpt.created_at,
          folder: gpt.folder,
          knowledgeBase: knowledgeFiles.map(file => ({
            fileName: file.file_name,
            fileUrl: file.file_url,
          })),
        });
      }
    }

    return json({
      customGpts: transformedGpts,
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
    return json({ 
      customGpts: [],
      user: {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.email,
      }
    }, {
      headers: response.headers,
    });
  }
}

export default function CollectionsRoute() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <AdminLayout activePage="collections">
      <AdminCollection/>
    </AdminLayout>
  );
}

export const meta: MetaFunction = () => {
  return [
    { title: "Collections - AI Agents Management" },
    { name: "description", content: "Manage your custom AI agent collections" },
    { name: "robots", content: "noindex, nofollow" }, // Private admin area
  ];
}; 