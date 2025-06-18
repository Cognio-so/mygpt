import type { LoaderFunctionArgs, MetaFunction, ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import UserHistory from "~/components/user/UserHistory";
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
    // Fetch chat sessions for the user (using correct table name)
    const { data: chatSessions, error: sessionsError } = await supabase
      .from('chat_sessions')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (sessionsError) {
      console.error('Error fetching chat sessions:', sessionsError);
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

    // Transform chat sessions data
    const transformedConversations = [];
    
    if (chatSessions && chatSessions.length > 0) {
      for (const session of chatSessions) {
        try {
          // Get GPT details separately
          const { data: gptData } = await supabase
            .from('custom_gpts')
            .select('id, name, description, image_url, model')
            .eq('id', session.gpt_id)
            .single();

          // Get message count and last message
          const { data: messages } = await supabase
            .from('chat_messages')
            .select('content, created_at')
            .eq('session_id', session.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const lastMessage = messages?.[0]?.content || 'No messages yet';
          
          const { count: messageCount } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);

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
        } catch (error) {
          console.error('Error processing chat session:', session.id, error);
          // Skip this session if there's an error but continue with others
        }
      }
    }

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
    console.error('History loader error:', error);
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
          return json({ success: false, error: 'Conversation ID is required' }, { status: 400 });
        }

        // Delete messages first
        const { error: messagesError } = await supabase
          .from('chat_messages')
          .delete()
          .eq('session_id', conversationId);

        if (messagesError) {
          console.error('Error deleting messages:', messagesError);
          return json({ success: false, error: 'Failed to delete messages' }, { status: 500 });
        }

        // Then delete chat session
        const { error: sessionError } = await supabase
          .from('chat_sessions')
          .delete()
          .eq('id', conversationId)
          .eq('user_id', user.id);

        if (sessionError) {
          console.error('Error deleting chat session:', sessionError);
          return json({ success: false, error: sessionError.message }, { status: 400 });
        }

        return json({ success: true }, {
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

export default function UserHistoryRoute() {
  return (
    <div className="flex h-screen w-full bg-white dark:bg-gray-900">
      <UserSidebar />
      <div className="flex-1">
        <UserHistory />
      </div>
    </div>
  );
}