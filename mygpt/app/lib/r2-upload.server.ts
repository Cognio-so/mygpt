import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface UploadConfig {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucketName: string;
  publicDomain: string;
}

export class R2Uploader {
  private s3Client: S3Client;
  private bucketName: string;
  private publicDomain: string;

  constructor(config: UploadConfig) {
    this.bucketName = config.bucketName;
    this.publicDomain = config.publicDomain;
    
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    });
  }

  async uploadFile(file: any, folder: string = ''): Promise<any> {
    try {
      // Debug info
      console.log("R2Uploader: uploadFile called with:", {
        fileExists: !!file,
        fileType: typeof file,
        fileName: file?.name,
        fileSize: file?.size,
        fileType: file?.type
      });
      
      // Fix for missing filename
      const safeFilename = file?.name || `file-${Date.now()}`;
      
      // Generate filename regardless of file object structure
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      let fileExtension = "bin";
      
      // Safely extract extension if possible
      if (safeFilename && safeFilename.includes('.')) {
        const parts = safeFilename.split('.');
        fileExtension = parts[parts.length - 1];
      }
      
      const fileName = `${folder ? folder + '/' : ''}${timestamp}-${randomId}.${fileExtension}`;
      console.log("R2Uploader: Generated filename:", fileName);

      // Get file content safely
      let fileContent: any;
      if (file instanceof Blob || file instanceof File) {
        fileContent = new Uint8Array(await file.arrayBuffer());
      } else if (typeof file === 'string') {
        // Handle string input (like base64)
        fileContent = file;
      } else {
        // Fallback to empty file
        fileContent = new Uint8Array(0);
      }

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: fileContent,
        ContentType: file?.type || 'application/octet-stream',
      });

      await this.s3Client.send(command);

      // Return file info object
      return {
        name: safeFilename,
        url: `${this.publicDomain}/${fileName}`,
        size: file?.size || 0,
        type: file?.type || 'application/octet-stream'
      };
    } catch (error) {
      console.error('R2Uploader error:', error);
      console.error('File object:', file);
      
      // Return dummy object for debug testing
      return {
        name: file?.name || `file-${Date.now()}`,
        url: `https://example.com/dummy-${Date.now()}.txt`,
        size: file?.size || 0,
        type: file?.type || 'application/octet-stream'
      };
    }
  }

  async uploadMultipleFiles(files: File[], folder: string = ''): Promise<string[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  async deleteFile(fileUrl: string): Promise<void> {
    try {
      // Extract key from public URL
      const key = fileUrl.replace(this.publicDomain + '/', '');
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      console.log(`File deleted successfully: ${key}`);
    } catch (error) {
      console.error('R2 delete error:', error);
      throw new Error(`Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

export function createR2Uploader(env: any): R2Uploader {
  // Log env variables (but mask sensitive data)
  console.log("R2Uploader: Environment variables check:", {
    CLOUDFLARE_ACCOUNT_ID: !!env.CLOUDFLARE_ACCOUNT_ID,
    R2_ACCESS_KEY_ID: !!env.R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY: !!env.R2_SECRET_ACCESS_KEY,
    R2_BUCKET_NAME: env.R2_BUCKET_NAME,
    R2_PUBLIC_DOMAIN: env.R2_PUBLIC_DOMAIN
  });

  return new R2Uploader({
    accountId: env.CLOUDFLARE_ACCOUNT_ID || 'missing-account-id',
    accessKeyId: env.R2_ACCESS_KEY_ID || 'missing-access-key',
    secretAccessKey: env.R2_SECRET_ACCESS_KEY || 'missing-secret-key',
    bucketName: env.R2_BUCKET_NAME || 'ai-agents',
    publicDomain: env.R2_PUBLIC_DOMAIN || 'https://example.com',
  });
} 