import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function action({ request, context }: ActionFunctionArgs) {  
  console.log("🔄 Admin Chat API: Route called");
  console.log("🔄 Admin Chat API: Request method:", request.method);
  console.log("🔄 Admin Chat API: Request URL:", request.url);
  
  const env = context.cloudflare.env;
  const { supabase, response } = createSupabaseServerClient(request, env);
  
  console.log("🔐 Admin Chat API: Getting user authentication...");
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log("🔐 Admin Chat API: User authentication result:", {
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email
  });

  if (!user) {
    console.log("❌ Admin Chat API: No authenticated user");
    return json({
      error: "You must be logged in to use chat."
    }, { 
      status: 401, 
      headers: response.headers 
    });
  }

  try {
    console.log("📋 Admin Chat API: Parsing form data...");
    const formData = await request.formData();
    console.log("📋 Admin Chat API: FormData parsed successfully");
    
    // Log all FormData entries
    console.log("📋 Admin Chat API: All FormData entries:");
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        console.log(`  ${key}:`, value.length > 100 ? value.substring(0, 100) + '...' : value);
      } else {
        console.log(`  ${key}:`, value);
      }
    }
    
    const intent = formData.get('intent') as string;
    console.log("🎯 Admin Chat API: Intent:", intent);
    
    if (intent === 'chat') {
      const message = formData.get('message') as string;
      const gptId = formData.get('gptId') as string;
      const model = formData.get('model') as string;
      const instructions = formData.get('instructions') as string;
      const webSearch = formData.get('webSearch') === 'true';
      const filesJson = formData.get('files') as string;
      const conversationId = formData.get('conversationId') as string;

      console.log("💬 Admin Chat API: Received chat request:", {
        messageLength: message?.length || 0,
        gptId,
        model,
        instructionsLength: instructions?.length || 0,
        webSearch,
        filesJsonLength: filesJson?.length || 0,
        hasConversationId: !!conversationId,
        conversationId
      });

      let files = [];
      if (filesJson) {
        try {
          files = JSON.parse(filesJson);
          console.log("📎 Admin Chat API: Parsed files:", {
            count: files.length,
            files: files.map((f: any) => ({ name: f.name, url: f.url?.substring(0, 50) + '...' }))
          });
        } catch (parseError) {
          console.error("❌ Admin Chat API: Error parsing files JSON:", parseError);
          console.error("❌ Admin Chat API: Files JSON string:", filesJson);
        }
      }

      if (!message || !gptId) {
        console.log("❌ Admin Chat API: Missing required fields:", { hasMessage: !!message, hasGptId: !!gptId });
        return json({
          error: "Message and GPT ID are required"
        }, {
          status: 400,
          headers: response.headers
        });
      }

      // Use existing session ID or create a new one
      let sessionId = conversationId;
      
      if (!sessionId) {
        console.log("📝 Admin Chat API: Creating new chat session...");
        try {
          const { data: chatSession, error: chatSessionError } = await supabase
            .from('chat_sessions')
            .insert({
              user_id: user.id,
              gpt_id: gptId,
              model: model,
              created_at: new Date().toISOString()
            })
            .select('id')
            .single();

          if (chatSessionError) {
            console.error('❌ Admin Chat API: Error creating chat session:', chatSessionError);
            throw chatSessionError;
          }

          sessionId = chatSession?.id;
          console.log("✅ Admin Chat API: Created chat session:", sessionId);
        } catch (sessionError) {
          console.error('❌ Admin Chat API: Failed to create session:', sessionError);
          throw sessionError;
        }
      } else {
        console.log("🔗 Admin Chat API: Using existing session:", sessionId);
      }

      // Save the user message to the database WITH user_docs
      console.log("💾 Admin Chat API: Saving user message with files", {
        sessionId,
        filesCount: files.length,
        userDocsPreview: files.length > 0 ? JSON.stringify(files).substring(0, 100) + "..." : null
      });

      const { data: userMessage, error: saveError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role: 'user',
          content: message,
          user_docs: files.length > 0 ? JSON.stringify(files) : null,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (saveError) {
        console.error('❌ Admin Chat API: Error saving user message:', saveError);
        console.error('❌ Admin Chat API: Save error details:', {
          code: saveError.code,
          message: saveError.message,
          details: saveError.details,
          hint: saveError.hint
        });
        throw saveError;
      }

      console.log("✅ Admin Chat API: User message saved successfully:", {
        messageId: userMessage.id,
        hasUserDocs: !!userMessage.user_docs
      });

      // Continue with Python backend call...
      const pythonBackendUrl = env.PYTHON_BACKEND_URL || 'http://localhost:8000';
      console.log(`🐍 Admin Chat API: Sending chat request to Python backend at ${pythonBackendUrl}`);
      
      try {
        // Check if this is the first message in a conversation
        const isNewConversation = !conversationId;
        
        // Only call gpt-opened for new conversations
        if (isNewConversation) {
          // First, notify the backend that the GPT is being used
          const gptOpenedData = {
            user_email: user.email || "",
            gpt_id: gptId || "",
            gpt_name: "Custom GPT",
            file_urls: files
              .map((file: any) => file.url)
              .filter((url: any) => url && typeof url === 'string'),
            use_hybrid_search: true,
            schema: {
              model: model || "gpt-4o",
              instructions: instructions || ""
            },
            api_keys: {}
          };

          console.log(`🚪 Admin Chat API: GPT-opened payload for new conversation:`, JSON.stringify(gptOpenedData, null, 2));

          const gptOpenedResponse = await fetch(`${pythonBackendUrl}/gpt-opened`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(gptOpenedData)
          });

          if (!gptOpenedResponse.ok) {
            const errorText = await gptOpenedResponse.text();
            console.error(`❌ Admin Chat API: GPT-opened failed (${gptOpenedResponse.status}):`, errorText);
          } else {
            console.log(`✅ Admin Chat API: GPT-opened successful for new conversation`);
          }
        } else {
          console.log(`ℹ️ Admin Chat API: Skipping gpt-opened call for existing conversation: ${conversationId}`);
        }

        // Prepare the chat stream request for the Python backend
        const chatRequestData = {
          user_email: user.email,
          gpt_id: gptId,
          gpt_name: "Custom GPT",
          message: message,
          history: [],
          memory: [],
          user_document_keys: files.map((file: any) => file.url || file.name || ""),   
          use_hybrid_search: true,
          model: model,
          system_prompt: instructions,
          web_search_enabled: webSearch,
          mcp_enabled: false,
          mcp_schema: null,
          api_keys: {}
        };

        console.log(`🚀 AdminChat API: Sending chat stream request with files:`, {
          messageLength: message.length,
          userDocumentKeysCount: chatRequestData.user_document_keys.length
        });

        // Then make the chat stream request - using ReadableStream to ensure proper streaming
        const chatResponse = await fetch(`${pythonBackendUrl}/chat-stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chatRequestData)
        });

        if (!chatResponse.ok) {
          const errorText = await chatResponse.text();
          console.error(`❌ AdminChat API: Chat API error (${chatResponse.status}): ${errorText}`);
          throw new Error(`Chat API error: ${chatResponse.status}`);
        }

        // Create a transform stream that will track the assistant's response and save it to the database
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const reader = chatResponse.body?.getReader();
        
        if (!reader) {
          throw new Error('No response body received from Python backend');
        }
        
        // Start pumping the original response body into our transform stream
        (async () => {
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          let assistantResponse = '';
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              // Make sure every chunk is properly formatted for SSE
              const text = decoder.decode(value, { stream: true });
              
              // Process and ensure proper SSE format with proper buffering
              let textBuffer = '';
              textBuffer += text;

              // Split by double newlines to preserve SSE message boundaries
              const sseMessages = textBuffer.split('\n\n');
              // Keep the last incomplete message in buffer
              textBuffer = sseMessages.pop() || '';

              for (const sseMessage of sseMessages) {
                if (sseMessage.trim()) {
                  const lines = sseMessage.split('\n');
                  let dataLine = '';
                  
                  // Find the data line(s) in this SSE message
                  for (const line of lines) {
                    if (line.startsWith('data: ')) {
                      dataLine = line.slice(6); // Remove 'data: ' prefix
                      break;
                    }
                  }
                  
                  if (dataLine) {
                    try {
                      const jsonData = JSON.parse(dataLine);
                      
                      // Collect assistant response for database storage
                      if (jsonData.type === 'content' && jsonData.data) {
                        assistantResponse += jsonData.data;
                      } else if (jsonData.type === 'done') {
                        // Save the complete assistant response to the database
                        if (sessionId) {
                          console.log("💾 AdminChat API: Saving assistant response to database");
                          await supabase
                            .from('chat_messages')
                            .insert({
                              session_id: sessionId,
                              role: 'assistant',
                              content: assistantResponse,
                              user_docs: null,
                              created_at: new Date().toISOString()
                            });
                          console.log("✅ AdminChat API: Assistant response saved successfully");
                        }
                      }
                      
                      // Forward the properly formatted SSE message
                      await writer.write(encoder.encode(`data: ${dataLine}\n\n`));
                    } catch (e) {
                      console.warn('⚠️ AdminChat API: Error parsing SSE JSON:', e, 'Data:', dataLine);
                      // Forward the message anyway in case it's not JSON
                      await writer.write(encoder.encode(`data: ${dataLine}\n\n`));
                    }
                  }
                }
              }
            }
          } catch (e) {
            console.error('❌ AdminChat API: Error processing stream:', e);
          } finally {
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

      } catch (error) {
        console.error('❌ AdminChat API: Python backend error:', error);
        return json({
          error: "Failed to connect to chat service"
        }, {
          status: 500,
          headers: response.headers
        });
      }
    } else if (intent === 'saveChatMessage') {
      const sessionId = formData.get('sessionId') as string;
      if (!sessionId) {
        return json({
          error: "Session ID is required"
        }, {
          status: 400,
          headers: response.headers
        });
      }
      const role = formData.get('role') as string;
      const content = formData.get('content') as string;

      if (!role || !content) {
        return json({
          error: "Role and content are required"
        }, {
          status: 400,
          headers: response.headers
        });
      }

      const { error: messageError } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          role,
          content,
          user_docs: null,
          created_at: new Date().toISOString()
        });

      if (messageError) {
        return json({
          error: "Failed to save message: " + messageError.message
        }, {
          status: 500,
          headers: response.headers
        });
      }

      return json({ success: true }, { headers: response.headers });
    }

    console.log("❌ Admin Chat API: Invalid intent:", intent);
    return json({
      error: "Invalid intent"
    }, {
      status: 400,
      headers: response.headers
    });

  } catch (error: any) {
    console.error('❌ Admin Chat API: Uncaught error:', error);
    console.error('❌ Admin Chat API: Error stack:', error.stack);
    console.error('❌ Admin Chat API: Error name:', error.name);
    console.error('❌ Admin Chat API: Error message:', error.message);
    
    return json({
      error: `An unexpected error occurred: ${error.message || "Unknown error"}`,
      details: error.stack
    }, {
      status: 500,
      headers: response.headers
    });
  }
} 