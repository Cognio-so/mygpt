import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const error_description = requestUrl.searchParams.get('error_description');

  const env = context.cloudflare.env;
  const { supabase, response } = createSupabaseServerClient(request, env);

  // Handle OAuth errors
  if (error) {
    console.error('OAuth error:', error, error_description);
    return redirect(`/login?error=${encodeURIComponent(error_description || error)}`, {
      headers: response.headers,
    });
  }

  // Exchange code for session
  if (code) {
    try {
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      
      if (exchangeError) {
        console.error('Error exchanging code for session:', exchangeError);
        return redirect('/login?error=auth_callback_error', {
          headers: response.headers,
        });
      }

      if (data.session) {
        // Successfully authenticated, redirect to dashboard
        return redirect('/dashboard', {
          headers: response.headers,
        });
      }
    } catch (error) {
      console.error('Unexpected error during code exchange:', error);
      return redirect('/login?error=auth_callback_error', {
        headers: response.headers,
      });
    }
  }

  // No code parameter, check if there's already a session
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      return redirect('/dashboard', {
        headers: response.headers,
      });
    }
  } catch (error) {
    console.error('Error getting session:', error);
  }

  // If we get here, something went wrong
  return redirect('/login?error=no_session', {
    headers: response.headers,
  });
}

// This route should only handle server-side redirects
export default function AuthCallback() {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Completing authentication...</h2>
        <p className="text-gray-600">Please wait while we finish logging you in.</p>
      </div>
    </div>
  );
} 