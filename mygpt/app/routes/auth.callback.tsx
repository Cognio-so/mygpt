import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { useEffect } from "react";
import { useNavigate, useLoaderData } from "@remix-run/react";
import { createBrowserClient } from "@supabase/auth-helpers-remix";

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase, response } = createSupabaseServerClient(request, env);
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    return redirect('/dashboard', {
      headers: response.headers,
    });
  }

  return json({
    ENV: {
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_API_KEY: env.SUPABASE_API_KEY,
    }
  }, {
    headers: response.headers,
  });
}

export default function AuthCallback() {
  const navigate = useNavigate();
  const { ENV } = useLoaderData<typeof loader>();
  
  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        if (!ENV?.SUPABASE_URL || !ENV?.SUPABASE_API_KEY) {
          console.error('Missing Supabase environment variables');
          navigate('/login?error=missing_env_vars');
          return;
        }
        
        const supabase = createBrowserClient(
          ENV.SUPABASE_URL,
          ENV.SUPABASE_API_KEY
        );
        
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          navigate('/login?error=auth_callback_error');
          return;
        }
        
        if (data.session) {
          navigate('/dashboard');
        } else {
          navigate('/login?error=no_session');
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        navigate('/login?error=auth_callback_error');
      }
    };
    
    handleAuthCallback();
  }, [ENV, navigate]);
  
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Completing authentication...</h2>
        <p className="text-gray-600">Please wait while we finish logging you in.</p>
      </div>
    </div>
  );
} 