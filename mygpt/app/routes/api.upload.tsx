import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createR2Uploader } from '~/lib/r2-upload.server';
import { createSupabaseServerClient } from "~/lib/supabase.server";
import type { FileAttachment } from '~/lib/database.types';

export async function action({ request, context }: ActionFunctionArgs) {
  console.log("🔄 API Upload route called");
  
  try {
    const env = context.cloudflare.env;
    const { supabase, response } = createSupabaseServerClient(request, env);
    
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log("❌ API Upload: No authenticated user");
      return json({ error: "Authentication required" }, { status: 401, headers: response.headers });
    }
    
    // Simplified approach - just get raw data
    const formData = await request.formData();
    const files = formData.getAll('files');
    
    console.log("API Upload: Files received:", files.length);
    console.log("API Upload: File types:", files.map(f => typeof f).join(', '));
    
    if (files.length === 0) {
      return json({ error: 'No files provided', files: [] }, { status: 400, headers: response.headers });
    }
    
    // Simplified upload
    const r2Uploader = createR2Uploader(env);
    const uploadedFiles = [];
    
    for (const file of files) {
      console.log("API Upload: Processing file:", file);
      try {
        const result = await r2Uploader.uploadFile(file, user.id);
        uploadedFiles.push(result);
        console.log("API Upload: File processed successfully:", result);
      } catch (error) {
        console.error("API Upload: Error processing file:", error);
      }
    }
    
    console.log("API Upload: Upload completed. Results:", uploadedFiles);
    return json({ files: uploadedFiles }, { headers: response.headers });
    
  } catch (error) {
    console.error("API Upload: Error:", error);
    return json({ error: 'Upload failed', details: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
} 