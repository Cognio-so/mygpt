import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { requireUserAuth } from "~/lib/auth.server";

export async function action({ request, context }: ActionFunctionArgs) {
  console.log("🔄 User Chat API: Route called");
  const env = context.cloudflare.env;
  const { user } = await requireUserAuth(request, env);
  const { supabase, response } = createSupabaseServerClient(request, env);

  try {
    console.log("📋 User Chat API: Parsing form data...");
    const formData = await request.formData();
    const intent = formData.get('intent') as string;
    
    console.log("🎯 User Chat API: Intent:", intent);

    if (intent === 'chat') {
      const message = formData.get('message') as string;
      const gptId = formData.get('gptId') as string;
      const model = formData.get('model') as string || 'gpt-4o';
      const instructions = formData.get('instructions') as string || '';
      const webSearch = formData.get('webSearch') === 'true';
      const filesJson = formData.get('files') as string;
      const conversationId = formData.get('conversationId') as string;
      
      console.log("💬 User Chat API: Received chat request:", {
        messageLength: message?.length || 0,
        gptId,
        model,
        instructionsLength: instructions?.length || 0,
        webSearch,
        filesJsonLength: filesJson?.length || 0,
        hasConversationId: !!conversationId
      });
      
      if (!message || !gptId) {
        console.log("❌ User Chat API: Missing required fields");
        return json({
          error: "Message and GPT ID are required"
        }, {
          status: 400,
          headers: response.headers
        });
      }
      
      // Parse files JSON
      let files = [];
      if (filesJson) {
        try {
          files = JSON.parse(filesJson);
          console.log("📎 User Chat API: Parsed files:", {
            count: files.length,
            files: files.map((f: any) => ({ name: f.name, url: f.url?.substring(0, 50) + '...' }))
          });
        } catch (parseError) {
          console.error("❌ User Chat API: Error parsing files JSON:", parseError);
        }
      }
      
      // Use existing session ID or create a new one
      let sessionId = conversationId;
      
      if (!sessionId) {
        console.log("📝 User Chat API: Creating new chat session...");
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
            console.error('❌ User Chat API: Error creating chat session:', chatSessionError);
            throw chatSessionError;
          }

          sessionId = chatSession?.id;
          console.log("✅ User Chat API: Created chat session:", sessionId);
        } catch (sessionError) {
          console.error('❌ User Chat API: Failed to create session:', sessionError);
          throw sessionError;
        }
      } else {
        console.log("🔗 User Chat API: Using existing session:", sessionId);
      }
      
      // Save the user message to the database
      console.log("💾 User Chat API: Saving user message with files", {
        sessionId,
        filesCount: files.length
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
        console.error('❌ User Chat API: Error saving user message:', saveError);
        throw saveError;
      }
      
      console.log("✅ User Chat API: User message saved successfully:", {
        messageId: userMessage.id,
        hasUserDocs: !!userMessage.user_docs
      });

      // Call Python backend
      const pythonBackendUrl = env.PYTHON_BACKEND_URL || 'http://localhost:8000';
      console.log(`🐍 User Chat API: Sending chat request to Python backend at ${pythonBackendUrl}`);
      
      try {
        // First notify backend that GPT is being used - this step ensures context is set up
        const gptOpenedData = {
          user_email: user.email || "",
          gpt_id: gptId || "",
          gpt_name: "User Custom GPT",
          file_urls: files
            .map((file: any) => file.url)
            .filter((url: any) => url && typeof url === 'string'),  // Ensure valid strings only
          use_hybrid_search: true,  // Boolean
          schema: {  // Use 'schema' key
            model: model || "gpt-4o",
            instructions: instructions || ""
          },
          api_keys: {}
        };
        
        console.log(`🚪 User Chat API: GPT-opened payload:`, JSON.stringify(gptOpenedData, null, 2));
        
        const gptOpenedResponse = await fetch(`${pythonBackendUrl}/gpt-opened`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(gptOpenedData)
        });

        if (!gptOpenedResponse.ok) {
          const errorText = await gptOpenedResponse.text();
          console.error(`❌ User Chat API: GPT-opened failed (${gptOpenedResponse.status}):`, errorText);
          throw new Error(`Chat API error: ${gptOpenedResponse.status}`);
        }

        // Then make the chat stream request - using the same payload format as admin
        const chatRequestData = {
          user_email: user.email,
          gpt_id: gptId,
          gpt_name: "User Custom GPT",
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
        
        console.log(`🚀 User Chat API: Sending chat stream request`);
        const response = await fetch(`${pythonBackendUrl}/chat-stream`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(chatRequestData)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`❌ User Chat API: Chat API error (${response.status}): ${errorText}`);
          throw new Error(`Chat API error: ${response.status}`);
        }

        // Handle streaming response
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const reader = response.body?.getReader();
        
        if (!reader) {
          throw new Error('No response body received from Python backend');
        }
        
        // Process the stream and save assistant response
        (async () => {
          const decoder = new TextDecoder();
          const encoder = new TextEncoder();
          let assistantResponse = '';
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              // Process the chunk
              const text = decoder.decode(value, { stream: true });
              
              const chunks = text.split('\n');
              for (const chunk of chunks) {
                if (chunk.trim()) {
                  if (chunk.startsWith('data: ')) {
                    try {
                      const jsonData = JSON.parse(chunk.slice(5));
                      
                      // Collect assistant response for database storage
                      if (jsonData.type === 'content' && jsonData.data) {
                        assistantResponse += jsonData.data;
                      } else if (jsonData.type === 'done') {
                        // Save the complete assistant response to the database
                        if (sessionId) {
                          console.log("💾 User Chat API: Saving assistant response to database");
                          await supabase
                            .from('chat_messages')
                            .insert({
                              session_id: sessionId,
                              role: 'assistant',
                              content: assistantResponse,
                              user_docs: null,
                              created_at: new Date().toISOString()
                            });
                          console.log("✅ User Chat API: Assistant response saved successfully");
                        }
                      }
                    } catch (e) {
                      // Continue even if JSON parsing fails
                    }
                    
                    await writer.write(encoder.encode(`${chunk}\n\n`));
                  } else {
                    await writer.write(encoder.encode(`data: ${chunk}\n\n`));
                  }
                }
              }
            }
          } catch (e) {
            console.error('❌ User Chat API: Error processing stream:', e);
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
        console.error('❌ User Chat API: Python backend error:', error);
        return json({
          error: "Failed to connect to chat service"
        }, {
          status: 500,
          headers: response.headers
        });
      }
    }
    
    console.log("❌ User Chat API: Invalid intent:", intent);
    return json({
      error: "Invalid intent"
    }, {
      status: 400,
      headers: response.headers
    });

  } catch (error: any) {
    console.error('❌ User Chat API: Uncaught error:', error);
    console.error('❌ User Chat API: Error stack:', error.stack);
    
    return json({
      error: `An unexpected error occurred: ${error.message || "Unknown error"}`,
      details: error.stack
    }, {
      status: 500,
      headers: response.headers
    });
  }
} 