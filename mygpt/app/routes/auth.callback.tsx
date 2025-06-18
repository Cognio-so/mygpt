import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { redirect, json } from "@remix-run/cloudflare";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function loader({ request, context }: LoaderFunctionArgs) {
  try {
    const env = context.cloudflare.env;
    const { supabase, response } = createSupabaseServerClient(request, env);
    
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
  
    if (code) {
      await supabase.auth.exchangeCodeForSession(code);
    }
  
    // Get the user session
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // Get user profile to check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
  
      // If no profile exists, create one with default user role
      if (!profile) {
        try {
          await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              email: session.user.email || '',
              full_name: session.user.user_metadata?.full_name || session.user.email || '',
              role: 'user', // Default role
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
  
          return redirect('/dashboard', {
            headers: response.headers,
          });
        } catch (insertError) {
          console.error('Error creating profile:', insertError);
        }
      }
  
      // Redirect based on role
      if (profile?.role === 'admin') {
        return redirect('/admin', {
          headers: response.headers,
        });
      } else {
        return redirect('/dashboard', {
          headers: response.headers,
        });
      }
    }
  
    // If no session, redirect to login
    return redirect('/login', {
      headers: response.headers,
    });
  } catch (error) {
    console.error('Auth callback error:', error);
    return json({ error: 'Authentication error' }, { status: 500 });
  }
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