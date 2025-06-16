import { Form, Link, useActionData, useNavigation, useLoaderData } from "@remix-run/react";
import { FcGoogle } from "react-icons/fc";
import { Button } from "~/components/ui/button";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json, redirect } from "@remix-run/cloudflare";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { useCallback } from "react";
import { createBrowserClient } from "@supabase/auth-helpers-remix";

type ActionData = {
  error?: string;
  success?: string;
};

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

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env;
  const { supabase, response } = createSupabaseServerClient(request, env);
  const formData = await request.formData();
  const action = formData.get('_action') as string;

  if (action === 'email') {
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('name') as string;

    if (!email || !password || !fullName) {
      return json<ActionData>({ error: 'All fields are required' }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (error) {
      return json<ActionData>({ error: error.message }, { status: 400 });
    }

    if (data.user && !data.session) {
      return json<ActionData>({ 
        success: 'Please check your email to confirm your account before signing in.' 
      });
    }

    return redirect('/dashboard', {
      headers: response.headers,
    });
  }

  return json<ActionData>({ error: 'Invalid action' }, { status: 400 });
}

export default function Signup() {
  const actionData = useActionData<typeof action>();
  const { ENV } = useLoaderData<typeof loader>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  const handleGoogleSignIn = useCallback(async () => {
    if (!ENV?.SUPABASE_URL || !ENV?.SUPABASE_API_KEY) {
      console.error('Missing Supabase environment variables');
      return;
    }
    
    const supabase = createBrowserClient(
      ENV.SUPABASE_URL,
      ENV.SUPABASE_API_KEY
    );
    
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }, [ENV]);

  return (
    <div className="flex h-screen w-full bg-white">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-b from-[#02091A] to-[#031555] flex-col items-center relative overflow-hidden py-12">
        <div className="relative z-10 w-full flex justify-center mb-12 mt-8">
         
        </div>

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

      <div className="w-full lg:w-1/2 flex items-center justify-center px-6 md:px-16 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
            <p className="text-gray-600">Please enter your details</p>
          </div>

          {actionData?.error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {actionData.error}
            </div>
          )}

          {actionData?.success && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {actionData.success}
            </div>
          )}

          <Form method="post" className="space-y-6">
            <input type="hidden" name="_action" value="email" />
            
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <input
                id="name"
                type="text"
                name="name"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition-all bg-gray-50"
                placeholder="John Doe"
                required
              />
            </div>

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
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-700 focus:border-transparent transition-all bg-gray-50"
                placeholder="••••••••"
                required
                minLength={6}
              />
            </div>
            
            <Button
              type="submit"
              disabled={isSubmitting}
              className={`w-full bg-black hover:bg-gray-800 text-white py-3 rounded-lg font-medium shadow-sm transition-all duration-200 transform hover:translate-y-[-2px] disabled:opacity-50`}
            >
              {isSubmitting ? 'Creating Account...' : 'Sign Up'}
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
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-3 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-all shadow-sm disabled:opacity-50"
          >
            <FcGoogle size={20} />
            {isSubmitting ? 'Signing up...' : 'Sign up with Google'}
          </Button>

          <p className="text-center mt-8 text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="text-black font-medium hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}