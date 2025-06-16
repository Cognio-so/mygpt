import type { MetaFunction } from "@remix-run/cloudflare";
import { Link } from "@remix-run/react";
import { Button } from "~/components/ui/button";
import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase, response } = createSupabaseServerClient(request, env);

  // Check if user is already logged in
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    return redirect('/dashboard', {
      headers: response.headers,
    });
  }

  // If not logged in, redirect to login page
  return redirect('/login', {
    headers: response.headers,
  });
}

export default function Index() {
  return (
    <div>
      <h1>Redirecting...</h1>
    </div>
  );
}
