import type { ActionFunctionArgs } from "@remix-run/cloudflare";
import { json } from "@remix-run/cloudflare";
import { createR2Uploader } from '~/lib/r2-upload.server';
import type { FileAttachment } from '~/lib/database.types';

export async function action({ request, context }: ActionFunctionArgs) {
  console.log("🔄 Upload.server route called");
  
  try {
    const formData = await request.formData();
    const files = formData.getAll('files') as File[];
    
    console.log("📁 Files received in upload.server:", files.length);
    files.forEach((file, index) => {
      console.log(`📄 File ${index + 1}:`, {
        name: file.name,
        size: file.size,
        type: file.type,
        isFile: file instanceof File
      });
    });
    
    if (!files || files.length === 0) {
      console.log("❌ No files provided to upload.server");
      return json({ error: 'No files provided', files: [] }, { status: 400 });
    }

    // Check environment variables
    const env = context.cloudflare.env;
    console.log("🔧 Environment check in upload.server:", {
      hasAccountId: !!env.CLOUDFLARE_ACCOUNT_ID,
      hasAccessKeyId: !!env.R2_ACCESS_KEY_ID,
      hasSecretAccessKey: !!env.R2_SECRET_ACCESS_KEY,
      hasBucketName: !!env.R2_BUCKET_NAME,
      hasPublicDomain: !!env.R2_PUBLIC_DOMAIN
    });

    // Upload files to R2
    console.log("⬆️ Initializing R2 uploader in upload.server...");
    const r2Uploader = createR2Uploader(env);
    const uploadedFiles: FileAttachment[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!(file instanceof File) || file.size === 0) {
        console.warn(`⚠️ Skipping invalid file ${i + 1} in upload.server:`, file);
        continue;
      }

      try {
        console.log(`⬆️ Uploading file ${i + 1}/${files.length} in upload.server:`, file.name);
        const fileUrl = await r2Uploader.uploadFile(file, 'chat-attachments');
        console.log(`✅ File ${i + 1} uploaded successfully in upload.server:`, fileUrl);
        
        uploadedFiles.push({
          name: file.name,
          url: fileUrl,
          size: file.size,
          type: file.type,
          uploadedAt: new Date().toISOString()
        });
      } catch (error) {
        console.error(`❌ Error uploading file ${file.name} in upload.server:`, error);
        throw error;
      }
    }
    
    console.log("✅ All files uploaded successfully in upload.server:", uploadedFiles.length);
    return json({ files: uploadedFiles });
    
  } catch (error) {
    console.error('❌ Upload error in upload.server:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return json({ 
      error: 'Upload failed', 
      files: [],
      details: errorMessage
    }, { status: 500 });
  }
}