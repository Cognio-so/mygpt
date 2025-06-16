import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useLoaderData,
} from "@remix-run/react";
import type { LinksFunction, LoaderFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { getThemeFromCookie, type Theme } from "~/lib/theme";
import { getOptionalAuth } from "~/lib/auth.server";

import "./tailwind.css";

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

export default function App() {
  const { theme, user, ENV } = useLoaderData<typeof loader>();

  return (
    <html lang="en" className={theme === 'dark' ? 'dark' : ''}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.ENV = ${JSON.stringify(ENV)}`,
          }}
        />
      </head>
      <body className={theme === 'dark' ? 'dark' : ''}>
        <Outlet context={{ theme, user }} />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
