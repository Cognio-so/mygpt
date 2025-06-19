import type { LoaderFunctionArgs, MetaFunction, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import UserHistoryPage from "~/components/user/UserHistory";
import UserSidebar from "~/components/user/UserSidebar";
import { requireUserAuth } from "~/lib/auth.server";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { getThemeFromCookie } from "~/lib/theme";

export const meta: MetaFunction = () => {
  return [
    { title: "Chat History - AI Agents" },
    { name: "description", content: "View your chat history with AI agents." },
    { name: "robots", content: "index, follow" },
  ];
};

export async function loader({ request, context }: LoaderFunctionArgs) {
  const env = context.cloudflare.env;
  const { user, profile, response } = await requireUserAuth(request, env);
  const { supabase } = createSupabaseServerClient(request, env);
  const theme = getThemeFromCookie(request) || 'light';

  try {
    console.log("🔄 User History Loader: Fetching chat sessions for user:", user.id);
    
    // Fetch chat sessions for the user (using correct table name)
    const { data: chatSessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (sessionsError) {
      console.error('❌ User History Loader: Error fetching chat sessions:', sessionsError);
      return json({
        user: {
          _id: user.id,
          email: user.email,
          name: profile?.full_name || user.email,
        },
        conversations: [],
        theme,
        error: 'Failed to load conversations'
      }, {
        headers: response.headers,
      });
    }

    console.log("✅ User History Loader: Found", chatSessions?.length || 0, "chat sessions");

    // Transform chat sessions data
    const transformedConversations = [];
    
    if (chatSessions && chatSessions.length > 0) {
      for (const session of chatSessions) {
        try {
          console.log("🔄 User History Loader: Processing session:", session.id);
          
          // Get GPT details separately
          const { data: gptData, error: gptError } = await supabase
            .from('custom_gpts')
            .select('id, name, description, image_url, model')
            .eq('id', session.gpt_id)
            .single();

          if (gptError) {
            console.error("❌ User History Loader: Error fetching GPT data for session:", session.id, gptError);
            continue; // Skip this session if GPT data can't be found
          }

          // Get message count and last message
          const { data: messages, error: messagesError } = await supabase
            .from('chat_messages')
            .select('content, role, created_at')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
            .limit(1);

          if (messagesError) {
            console.error("❌ User History Loader: Error fetching messages for session:", session.id, messagesError);
          }

          const lastMessage = messages?.[0]?.content || 'No messages yet';
          
          const { count: messageCount, error: countError } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

          if (countError) {
            console.error("❌ User History Loader: Error counting messages for session:", session.id, countError);
          }

          transformedConversations.push({
            id: session.id,
            gptId: session.gpt_id,
            gptName: gptData?.name || 'Unknown GPT',
            lastMessage: lastMessage.length > 100 ? lastMessage.substring(0, 100) + '...' : lastMessage,
            timestamp: session.updated_at || session.created_at,
            messageCount: messageCount || 0,
            model: session.model || gptData?.model || 'Unknown',
            summary: `Chat with ${gptData?.name || 'Unknown GPT'}`,
            messages: [] // We'll load these separately when needed
          });
          
          console.log("✅ User History Loader: Successfully processed session:", session.id);
        } catch (error) {
          console.error('❌ User History Loader: Error processing chat session:', session.id, error);
          // Skip this session if there's an error but continue with others
        }
      }
    }

    console.log("✅ User History Loader: Successfully transformed", transformedConversations.length, "conversations");

    return json({
      user: {
        _id: user.id,
        email: user.email,
        name: profile?.full_name || user.email,
      },
      conversations: transformedConversations,
      theme
    }, {
      headers: response.headers,
    });

  } catch (error) {
    console.error('❌ User History Loader: Uncaught error:', error);
    return json({
      user: {
        _id: user.id,
        email: user.email,
        name: profile?.full_name || user.email,
      },
      conversations: [],
      theme,
      error: 'Failed to load conversation history'
    }, {
      headers: response.headers,
    });
  }
}

export async function action({ request, context }: ActionFunctionArgs) {
  const env = context.cloudflare.env;
  const { user, response } = await requireUserAuth(request, env);
  const { supabase } = createSupabaseServerClient(request, env);
  const formData = await request.formData();
  const intent = formData.get('intent') as string;

  try {
    switch (intent) {
      case 'deleteConversation': {
        const conversationId = formData.get('conversationId') as string;

        if (!conversationId) {
          console.error("❌ User History Action: No conversation ID provided");
          return json({ success: false, error: 'Conversation ID is required' }, { status: 400 });
        }

        console.log("🗑️ User History Action: Deleting conversation:", conversationId);

        // Delete messages first (foreign key constraint)
        const { error: messagesError } = await supabase
          .from('chat_messages')
          .delete()
          .eq('session_id', conversationId);

        if (messagesError) {
          console.error('❌ User History Action: Error deleting messages:', messagesError);
          return json({ success: false, error: 'Failed to delete messages' }, { status: 500 });
        }

        console.log("✅ User History Action: Messages deleted successfully");

        // Then delete chat session
        const { error: sessionError } = await supabase
          .from('chat_sessions')
          .delete()
          .eq('id', conversationId)
          .eq('user_id', user.id);

        if (sessionError) {
          console.error('❌ User History Action: Error deleting chat session:', sessionError);
          return json({ success: false, error: sessionError.message }, { status: 400 });
        }

        console.log("✅ User History Action: Chat session deleted successfully");

        return json({ success: true }, {
          headers: response.headers,
        });
      }

      default:
        console.error("❌ User History Action: Invalid action:", intent);
        return json({ success: false, error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('❌ User History Action: Uncaught error:', error);
    return json({ success: false, error: 'An error occurred' }, { status: 500 });
  }
}

export default function UserHistoryRoute() {
  return (
    <div className="flex h-screen w-full bg-white dark:bg-gray-900">
      <UserSidebar />
      <div className="flex-1">
        <UserHistoryPage />
      </div>
    </div>
  );
}