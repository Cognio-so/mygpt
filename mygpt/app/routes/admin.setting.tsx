import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData } from "@remix-run/react";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { AdminLayout } from "~/components/admin/AdminLayout";
import AdminSettings from "~/components/admin/AdminSetting";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase, response } = createSupabaseServerClient(request, env);
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return redirect('/login', {
      headers: response.headers,
    });
  }

  return json({
    user: session.user,
  }, {
    headers: response.headers,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase, response } = createSupabaseServerClient(request, env);
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return redirect('/login', {
      headers: response.headers,
    });
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

  return json({ error: 'Invalid action' }, {
    status: 400,
    headers: response.headers,
  });
}

export default function SettingsRoute() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <AdminLayout activePage="settings">
      <AdminSettings />
    </AdminLayout>
  );
} 