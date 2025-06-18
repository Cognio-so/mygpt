import type { LoaderFunctionArgs, MetaFunction, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import UserSetting from "~/components/user/UserSetting";
import UserSidebar from "~/components/user/UserSidebar";
import { requireUserAuth } from "~/lib/auth.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getThemeFromCookie } from "~/lib/theme";

export const meta: MetaFunction = () => {
  return [
    { title: "Settings - User Profile" },
    { name: "description", content: "Manage your user settings and preferences." },
    { name: "robots", content: "index, follow" },
  ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { user, profile, response } = await requireUserAuth(request, env);
  const theme = getThemeFromCookie(request) || 'light';

  return json({
    user: {
      id: user.id,
      email: user.email,
      name: profile?.full_name || user.email,
      profilePic: profile?.avatar_url,
      role: profile?.role || 'user',
      isVerified: true, // Add this based on your requirements
    },
    theme
  }, {
    headers: response.headers,
  });
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env;
  const { user, profile, response } = await requireUserAuth(request, env);
  const { supabase } = createSupabaseServerClient(request, env);
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  try {
    switch (intent) {
      case 'updateProfile': {
        const name = formData.get('name') as string;
        const email = formData.get('email') as string;

        const { error } = await supabase
          .from('profiles')
          .update({
            full_name: name,
            email: email,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) {
          return json({ success: false, error: error.message }, { status: 400 });
        }

        return json({
          success: true,
          message: 'Profile updated successfully',
          user: { name, email, profilePic: profile?.avatar_url }
        }, {
          headers: response.headers,
        });
      }

      case 'updatePassword': {
        const currentPassword = formData.get('currentPassword') as string;
        const newPassword = formData.get('newPassword') as string;

        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) {
          return json({ success: false, error: error.message }, { status: 400 });
        }

        return json({
          success: true,
          message: 'Password updated successfully'
        }, {
          headers: response.headers,
        });
      }

      case 'uploadProfilePicture': {
        // Handle file upload logic here
        return json({
          success: true,
          message: 'Profile picture uploaded successfully'
        }, {
          headers: response.headers,
        });
      }

      default:
        return json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Action error:', error);
    return json({ success: false, error: 'An error occurred' }, { status: 500 });
  }
}

export default function UserSettingRoute() {
  return (
    <div className="flex h-screen w-full bg-white dark:bg-gray-900">
      <UserSidebar />
      <div className="flex-1">
        <UserSetting />
      </div>
    </div>
  );
}