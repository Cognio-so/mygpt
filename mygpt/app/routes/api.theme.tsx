import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createThemeCookie, type Theme } from "~/lib/theme";

export async function action({ request }: ActionFunctionArgs) {
  const formData = await request.formData();
  const theme = formData.get('theme') as Theme;
  
  if (theme !== 'light' && theme !== 'dark') {
    return json({ error: "Invalid theme" }, { status: 400 });
  }

  const headers = new Headers();
  headers.append('Set-Cookie', createThemeCookie(theme));
  
  return json({ success: true, theme }, { headers });
}

export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
} 