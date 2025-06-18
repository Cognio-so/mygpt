import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
  useRouteError,
  isRouteErrorResponse,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { getThemeFromCookie, type Theme } from "~/lib/theme";
import { getOptionalAuth } from "~/lib/auth.server";
import { useState, useEffect } from "react";
import { SupabaseProvider } from '~/context/supabaseContext';
import { ThemeProvider } from '~/context/themeContext';

import "./tailwind.css";
import AdminLayout from "./components/admin/AdminLayout";   
export const links: LinksFunction = () => [
  { rel: "preconnect", href: "https://fonts.googleapis.com" },
  {
    rel: "preconnect",
    href: "https://fonts.gstatic.com",
    crossOrigin: "anonymous",
  },
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap",
  },
];

declare global {
  interface Window {
    ENV: {
      SUPABASE_URL: string;
      SUPABASE_API_KEY: string;
    };
  }
}

export async function loader({ request, context }: LoaderFunctionArgs) {
  const theme = getThemeFromCookie(request);
  const env = context.cloudflare.env;
  
  const { user, response } = await getOptionalAuth(request, env);
  
  return json({
    theme,
    user,
    ENV: {
      SUPABASE_URL: env.SUPABASE_URL,
      SUPABASE_API_KEY: env.SUPABASE_API_KEY,
    }
  }, {
    headers: response.headers,
  });
}

export function ErrorBoundary() {
  const error = useRouteError();
  
  let errorMessage = "An unexpected error occurred!";
  let statusCode = 500;
  
  if (isRouteErrorResponse(error)) {
    statusCode = error.status;
    errorMessage = error.data || `${error.status} ${error.statusText}`;
  } else if (error instanceof Error) {
    errorMessage = error.message;
  }
  
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        <title>Application Error</title>
        <Meta />
        <Links />
      </head>
      <body className="bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen flex items-center justify-center">
        <div className="p-8 max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg">
          <h1 className="text-red-500 text-2xl font-bold mb-4">Error {statusCode}</h1>
          <p className="mb-4">{errorMessage}</p>
          <a href="/" className="inline-block px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition">
            Return to Home
          </a>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  const { theme, user, ENV } = useLoaderData<typeof loader>();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <html lang="en" className={theme === 'dark' ? 'dark' : ''}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content={theme === 'dark' ? '#111827' : '#ffffff'} />
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(ENV)}`,
          }}
        />
      </head>
      <body className={`${theme === 'dark' ? 'dark' : ''} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <SupabaseProvider 
            supabaseUrl={ENV?.SUPABASE_URL} 
            supabaseKey={ENV?.SUPABASE_API_KEY}
          >
            <Outlet context={{ theme, user }} />
          </SupabaseProvider>
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

