import { Form, Link, useActionData, useNavigation } from "@remix-run/react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "~/components/ui/button";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { useCallback } from "react";
import { redirectAuthenticatedUser } from "~/lib/auth.server";
import { useSupabase } from "~/context/supabaseContext";

type ActionData = {
  error?: string;
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  
  try {
    // Redirect if already authenticated
    await redirectAuthenticatedUser(request, env);
  
    return json({}, {
      headers: {
        'X-Robots-Tag': 'noindex, nofollow',
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error("Loader error:", error);
    return json({});
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  try {
    const env = context.cloudflare.env;
    const { supabase, response } = createSupabaseServerClient(request, env);
    const formData = await request.formData();
    const action = formData.get('_action') as string;
  
    if (action === 'email') {
      const email = formData.get('email') as string;
      const password = formData.get('password') as string;
  
      if (!email || !password) {
        return json<ActionData>({ error: 'Email and password are required' }, { status: 400 });
      }
  
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
  
      if (error) {
        return json<ActionData>({ error: error.message }, { status: 400 });
      }
  
      if (data.user) {
        // Get user profile to check role and redirect accordingly
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();
  
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
    }
  
    return json<ActionData>({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error("Action error:", error);
    return json<ActionData>({ error: 'An error occurred during sign in' }, { status: 500 });
  }
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const { supabase, isReady } = useSupabase();
  const isSubmitting = navigation.state === 'submitting';

  const handleGoogleSignIn = useCallback(async () => {
    if (!supabase || !isReady) {
      console.error('Supabase client not ready');
      return;
    }
    
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) {
        console.error('OAuth sign in error:', error);
      }
    } catch (error) {
      console.error('Unexpected OAuth error:', error);
    }
  }, [supabase, isReady]);

  return (
    <div className="flex h-screen w-full bg-white">
      {/* Left side - Image and Text */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-[#02091A] to-[#031555] flex-col items-center relative overflow-hidden py-12">
        <div className="relative z-10 flex flex-col items-center justify-center flex-grow px-12 text-center">
          <h1 className="text-5xl font-bold mb-8 text-white">Decision Intelligence Starts Here</h1>
          <p className="text-xl font-medium mb-6 text-white">Welcome to MyGpt-Intelligent AI Dashboards</p>
          <p className="text-lg opacity-90 mb-6 text-[#A1B0C5]">
            Access MyGpt-Intelligent AI Dashboards designed to analyse data, generate insights, and support your operational decisions in real time.
          </p>
          <p className="text-lg italic mb-8 text-[#FBFCFD]">
            From complexity to clarity—in just a few clicks.
          </p>
          <div className="h-1 w-32 bg-[#055FF7] mt-4"></div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-br from-[#031555] to-[#083EA9] opacity-20"></div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 md:px-16 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Welcome Back</h2>
            <p className="text-gray-600">Please enter your details</p>
          </div>

          {actionData?.error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {actionData.error}
            </div>
          )}

          <Form method="post" className="space-y-6">
            <input type="hidden" name="_action" value="email" />
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                name="email"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition-all bg-gray-50"
                placeholder="john@example.com"
                required
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <Link to="/forgot-password" className="text-sm text-gray-600 hover:text-black">
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                name="password"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition-all bg-gray-50"
                placeholder="••••••••"
                required
              />
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-black hover:bg-gray-800 text-white py-3 rounded-lg font-medium shadow-sm transition-all duration-200 transform hover:translate-y-[-2px] disabled:opacity-50"
            >
              {isSubmitting ? 'Signing In...' : 'Sign In'}
            </Button>
          </Form>

          <div className="flex items-center my-4">
            <div className="flex-1 h-px bg-gray-300"></div>
            <p className="mx-4 text-sm text-gray-500">or</p>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSubmitting || !isReady}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
          >
            <FcGoogle size={20} />
            {isSubmitting ? 'Signing In...' : isReady ? 'Continue with Google' : 'Loading...'}
          </Button>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <Link to="/signup" className="text-black font-medium hover:underline">
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}