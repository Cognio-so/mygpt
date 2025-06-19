import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { requireUserAuth } from "~/lib/auth.server";

export async function action({ request, context }: ActionFunctionArgs) {
  console.log("🔄 User Chat API: Route called");
  const env = context.cloudflare.env;
  const { user, response } = await requireUserAuth(request, env);
  const { supabase } = createSupabaseServerClient(request, env);

  if (!user) {
    return json({ error: "You must be logged in." }, { status: 401, headers: response.headers });
  }

  try {
    const formData = await request.formData();
    const intent = formData.get('intent') as string;
    
    if (intent === 'chat') {
      const message = formData.get('message') as string;
      const gptId = formData.get('gptId') as string;
      const model = formData.get('model') as string;
      const instructions = formData.get('instructions') as string;
      const webSearch = formData.get('webSearch') === 'true';
      const filesJson = formData.get('files') as string;
      let conversationId = formData.get('conversationId') as string | null;

      let files: { name: string; url: string }[] = [];
      if (filesJson) {
        try {
          files = JSON.parse(filesJson);
        } catch (e) {
          console.error("❌ User Chat API: Error parsing files JSON:", e);
        }
      }

      if (!message || !gptId) {
        return json({ error: "Message and GPT ID are required" }, { status: 400, headers: response.headers });
      }

      const isNewConversation = !conversationId;
      if (isNewConversation) {
        const { data: chatSession, error } = await supabase
          .from('chat_sessions')
          .insert({ user_id: user.id, gpt_id: gptId, model: model })
          .select('id').single();
        if (error) throw error;
        conversationId = chatSession.id;
        console.log("✅ User Chat API: Created new session:", conversationId);
      } else {
        // Update the existing session's updated_at timestamp
        await supabase
          .from('chat_sessions')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', conversationId)
          .eq('user_id', user.id);
        console.log("✅ User Chat API: Updated session timestamp:", conversationId);
      }

      // Save user message
      await supabase.from('chat_messages').insert({
        session_id: conversationId,
        role: 'user',
        content: message,
        user_docs: files.length > 0 ? JSON.stringify(files) : null,
      });

      const pythonBackendUrl = env.PYTHON_BACKEND_URL || 'http://localhost:8000';
      
      const chatRequestData = {
        user_email: user.email,
        gpt_id: gptId,
        message: message,
        user_document_keys: files.map(file => file.url || file.name),
        model: model,
        system_prompt: instructions,
        web_search_enabled: webSearch,
        history: [], // History management can be added here later
      };

      const chatResponse = await fetch(`${pythonBackendUrl}/chat-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(chatRequestData),
      });

      if (!chatResponse.ok) {
        const errorText = await chatResponse.text();
        throw new Error(`Chat API error (${chatResponse.status}): ${errorText}`);
      }

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const reader = chatResponse.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let assistantResponse = '';

      (async () => {
        let textBuffer = '';
        
        try {
          if (isNewConversation && conversationId) {
            await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'conversation_id', id: conversationId })}\n\n`));
          }
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              // Process any remaining data in buffer
              if (textBuffer.trim()) {
                const lines = textBuffer.split('\n');
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    try {
                      const jsonData = JSON.parse(line.slice(6));
                      if (jsonData.type === 'content' && jsonData.data) {
                        assistantResponse += jsonData.data;
                      }
                      await writer.write(encoder.encode(`${line}\n\n`));
                    } catch (e) {
                      console.warn('⚠️ User Chat API: Error parsing final SSE data:', e);
                      await writer.write(encoder.encode(`${line}\n\n`));
                    }
                  }
                }
              }
              break;
            }
            
            const text = decoder.decode(value, { stream: true });
            textBuffer += text;
            
            // Split by double newlines to preserve SSE message boundaries  
            const sseMessages = textBuffer.split('\n\n');
            // Keep the last incomplete message in buffer
            textBuffer = sseMessages.pop() || '';
            
            for (const sseMessage of sseMessages) {
              if (sseMessage.trim()) {
                const lines = sseMessage.split('\n');
                let dataLine = '';
                
                // Find the data line in this SSE message
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    dataLine = line.slice(6); // Remove 'data: ' prefix
                    break;
                  }
                }
                
                if (dataLine) {
                  try {
                    const jsonData = JSON.parse(dataLine);
                    if (jsonData.type === 'content' && jsonData.data) {
                      assistantResponse += jsonData.data;
                    }
                    
                    // Forward the properly formatted SSE message
                    await writer.write(encoder.encode(`data: ${dataLine}\n\n`));
                  } catch (e) {
                    console.warn('⚠️ User Chat API: Error parsing SSE JSON:', e, 'Data:', dataLine);
                    // Forward the message anyway in case it's not JSON
                    await writer.write(encoder.encode(`data: ${dataLine}\n\n`));
                  }
                }
              }
            }
          }
        } catch (e) {
          console.error('❌ User Chat API: Stream processing error:', e);
        } finally {
          if (conversationId) {
            // Save assistant response
            await supabase.from('chat_messages').insert({
              session_id: conversationId,
              role: 'assistant',
              content: assistantResponse,
            });
            
            // Update session timestamp again after assistant response
            await supabase
              .from('chat_sessions')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', conversationId)
              .eq('user_id', user.id);
              
            console.log("✅ User Chat API: Assistant response saved and session updated.");
          }
          await writer.close();
        }
      })();

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    return json({ error: "Invalid intent" }, { status: 400, headers: response.headers });
  } catch (error: any) {
    console.error('❌ User Chat API: Uncaught error:', error);
    return json({ error: `An unexpected error occurred: ${error.message}` }, { status: 500, headers: response.headers });
  }
} 