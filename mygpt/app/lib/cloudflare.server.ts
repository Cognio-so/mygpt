// R2 storage handler

export async function uploadToR2(
  file: File,
  env: any,
  folder: string = "uploads"
): Promise<string | null> {
  try {
    if (!file || file.size === 0) {
      return null;
    }

    // Validate env
    if (!env.R2_BUCKET) {
      console.error("R2_BUCKET environment variable is not defined");
      throw new Error("Storage configuration error");
    }

    const r2Bucket = env.R2_BUCKET;
    
    // Generate a unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 10);
    const safeFilename = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const uniqueFilename = `${folder}/${timestamp}-${randomString}-${safeFilename}`;
    
    // Get file data as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    
    // Upload to R2
    await r2Bucket.put(uniqueFilename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // Create and return a public URL
    // Format: https://example.com/r2-public/${uniqueFilename}
    const baseUrl = env.R2_PUBLIC_URL || `${env.APP_URL}/r2-public`;
    const publicUrl = `${baseUrl}/${uniqueFilename}`;
    
    return publicUrl;
  } catch (error) {
    console.error("Error uploading to R2:", error);
    return null;
  }
} 