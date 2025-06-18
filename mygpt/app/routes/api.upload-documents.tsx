import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createSupabaseServerClient } from "~/lib/supabase.server";

export async function action({ request, context }: ActionFunctionArgs) {
  console.log("🔄 API Upload Documents: Route called");
  
  try {
    const env = context.cloudflare.env;
    const { supabase, response } = createSupabaseServerClient(request, env);
    
    // Get user properly for API routes
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      console.error("❌ API Upload Documents: Authentication failed:", userError);
      return json({ error: "Authentication required" }, { status: 401 });
    }
    
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    const userEmail = formData.get('user_email') as string || user.email;
    const gptId = formData.get('gpt_id') as string;
    const isUserDocument = formData.get('is_user_document') as string || 'true';
    
    console.log("📋 API Upload Documents: Request data", {
      filesCount: files.length,
      userEmail,
      gptId,
      isUserDocument
    });

    if (!gptId) {
      console.error("❌ API Upload Documents: Missing gpt_id");
      return json({ error: "Missing gpt_id" }, { status: 400 });
    }

    // Get Python backend URL from environment
    const pythonBackendUrl = env.PYTHON_BACKEND_URL;
    if (!pythonBackendUrl) {
      console.error("❌ API Upload Documents: PYTHON_BACKEND_URL not configured");
      return json({ error: "Backend not configured" }, { status: 500 });
    }

    // Create FormData for Python backend
    const backendFormData = new FormData();
    
    // Add files
    files.forEach((file, index) => {
      console.log(`📄 API Upload Documents: Adding file ${index + 1}:`, {
        name: file.name,
        size: file.size,
        type: file.type
      });
      backendFormData.append('files', file);
    });
    
    // Add required parameters
    backendFormData.append('user_email', userEmail || 'unknown');
    backendFormData.append('gpt_id', gptId);
    backendFormData.append('is_user_document', isUserDocument);
    
    console.log("🌐 API Upload Documents: Forwarding to Python backend:", `${pythonBackendUrl}/upload-documents`);
    
    // Forward request to Python backend
    const forwardResponse = await fetch(`${pythonBackendUrl}/upload-documents`, {
      method: 'POST',
      body: backendFormData,
    });
    
    console.log("📥 API Upload Documents: Python backend response:", forwardResponse.status);
    
    if (!forwardResponse.ok) {
      const errorText = await forwardResponse.text();
      console.error("❌ API Upload Documents: Python backend error:", errorText);
      return json({ error: `Upload failed: ${errorText}` }, { status: forwardResponse.status });
    }
    
    const result = await forwardResponse.json();
    console.log("✅ API Upload Documents: Success:", result);
    
    return json(result);
    
  } catch (error) {
    console.error("❌ API Upload Documents: Unexpected error:", error);
    return json({ 
      error: "Failed to upload documents", 
      details: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
} 