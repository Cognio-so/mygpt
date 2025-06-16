import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { createSupabaseServerClient } from "~/lib/supabase.server";

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

  try {
    const formData = await request.formData();
    const gptId = formData.get('id') as string;
    const folder = formData.get('folder') as string;

    if (!gptId) {
      return json({ error: 'GPT ID is required' }, { status: 400 });
    }

    // Update the folder
    const { error } = await supabase
      .from('custom_gpts')
      .update({ folder: folder || null })
      .eq('id', gptId)
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating folder:', error);
      return json({ error: 'Failed to update folder' }, { status: 500 });
    }

    return json({ success: true });

  } catch (error) {
    console.error('Update folder action error:', error);
    return json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
} 