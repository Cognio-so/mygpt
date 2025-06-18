import type { LoaderFunctionArgs } from "@remix-run/cloudflare";
import { redirect } from "@remix-run/cloudflare";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function requireAuth(request: Request, env: any) {
  try {
    const { supabase, response } = createSupabaseServerClient(request, env);
    
    const {
      data: { session },
    } = await supabase.auth.getSession();
  
    if (!session) {
      throw redirect('/login', {
        headers: response.headers,
      });
    }
  
    return { user: session.user, response };
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('Auth error:', error);
    throw redirect('/login');
  }
}

export async function requireAdminAuth(request: Request, env: any) {
  try {
    const { supabase, response } = createSupabaseServerClient(request, env);
    
    const {
      data: { session },
    } = await supabase.auth.getSession();
  
    if (!session) {
      throw redirect('/login', {
        headers: response.headers,
      });
    }
  
    // Get full user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
  
    if (!profile || profile.role !== 'admin') {
      throw redirect('/dashboard', {
        headers: response.headers,
      });
    }
  
    return { user: session.user, profile, response };
  } catch (error) {
    if (error instanceof Response) throw error;
    console.error('Admin auth error:', error);
    throw redirect('/login');
  }
}

export async function requireUserAuth(request: Request, env: any) {
  const { supabase, response } = createSupabaseServerClient(request, env);
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    throw redirect('/login', {
      headers: response.headers,
    });
  }

  // Get full user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if (!profile) {
    throw redirect('/login', {
      headers: response.headers,
    });
  }

  // If user is admin, redirect to admin dashboard
  if (profile.role === 'admin') {
    throw redirect('/admin', {
      headers: response.headers,
    });
  }

  return { user: session.user, profile, response };
}

export async function getOptionalAuth(request: Request, env: any) {
  try {
    const { supabase, response } = createSupabaseServerClient(request, env);
    
    const {
      data: { session },
    } = await supabase.auth.getSession();

    return { user: session?.user || null, response };
  } catch (error) {
    console.error('Auth check error:', error);
    return { user: null, response: new Response() };
  }
}

export async function redirectAuthenticatedUser(request: Request, env: any) {
  const { supabase, response } = createSupabaseServerClient(request, env);
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    // Get user profile to check role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();

    if (profile?.role === 'admin') {
      throw redirect('/admin', {
        headers: response.headers,
      });
    } else {
      throw redirect('/dashboard', {
        headers: response.headers,
      });
    }
  }

  return { response };
}

export async function getUserWithProfile(request: Request, env: any) {
  const { supabase, response } = createSupabaseServerClient(request, env);
  
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return { user: null, profile: null, response };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  return { user: session.user, profile, response };
} 