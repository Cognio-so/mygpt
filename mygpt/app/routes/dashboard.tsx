import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { useLoaderData, Form } from "@remix-run/react";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { AdminLayout } from "~/components/admin/AdminLayout";

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

export async function action({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase, response } = createSupabaseServerClient(request, env);
  
  await supabase.auth.signOut();
  
  return redirect('/login', {
    headers: response.headers,
  });
}

export default function Dashboard() {
  const { user } = useLoaderData<typeof loader>();

  return (
    <AdminLayout activePage="dashboard">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back to your MyGpt AI Dashboard.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Welcome</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Hello!</div>
              <p className="text-xs text-muted-foreground">
                {user.email}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>
              Your account details and session information.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-sm font-medium">Email:</label>
                <span className="col-span-2 text-sm text-muted-foreground">{user.email}</span>
              </div>
              <div className="grid grid-cols-3 items-center gap-4">
                <label className="text-sm font-medium">User ID:</label>
                <span className="col-span-2 text-sm text-muted-foreground font-mono">{user.id}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
} 