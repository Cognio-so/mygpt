import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
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

export default function SettingsRoute() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <AdminLayout activePage="settings">
      <AdminSettings />
    </AdminLayout>
  );
} 