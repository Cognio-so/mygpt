import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { getUserWithProfile } from "~/lib/auth.server";
import { redirect } from "@remix-run/cloudflare";

export const meta: MetaFunction = () => {
  return [
    { title: "Dashboard Redirect" },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { user, profile, response } = await getUserWithProfile(request, env);

  if (!user) {
    return redirect('/login', {
      headers: response.headers,
    });
  }

  // Redirect based on role
  if (profile?.role === 'admin') {
    return redirect('/admin', {
      headers: response.headers,
    });
  } else {
    return redirect('/user', {
      headers: response.headers,
    });
  }
}

export default function Dashboard() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Redirecting...</h1>
        <p className="text-gray-600">Please wait while we redirect you to the appropriate dashboard.</p>
      </div>
    </div>
  );
} 