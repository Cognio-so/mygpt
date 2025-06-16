import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createThemeCookie, type Theme } from "~/lib/theme";

export async function action({ request }: ActionFunctionArgs) {
  try {
    const formData = await request.formData();
    const theme = formData.get("theme") as Theme;

    if (theme !== "light" && theme !== "dark") {
      return json({ error: "Invalid theme" }, { status: 400 });
    }

    const cookie = createThemeCookie(theme);

    return json(
      { success: true, theme },
      {
        status: 200,
        headers: {
          "Set-Cookie": cookie,
        },
      }
    );
  } catch (error) {
    console.error("Theme update error:", error);
    return json({ error: "Failed to update theme" }, { status: 500 });
  }
}

export async function loader() {
  return json({ error: "Method not allowed" }, { status: 405 });
} 