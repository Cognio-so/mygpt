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

  async uploadFile(file: File, folder: string = ''): Promise<string> {
    try {
      // Generate unique filename
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substring(2, 15);
      const fileExtension = file.name.split('.').pop() || '';
      const fileName = `${folder ? folder + '/' : ''}${timestamp}-${randomId}.${fileExtension}`;

      // Convert File to ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fileName,
        Body: uint8Array,
        ContentType: file.type,
        ContentLength: file.size,
        Metadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      // Return public URL
      const publicUrl = `${this.publicDomain}/${fileName}`;
      console.log(`File uploaded successfully: ${publicUrl}`);
      
      return publicUrl;
    } catch (error) {
      console.error('R2 upload error:', error);
      throw new Error(`Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
  return new R2Uploader({
    accountId: env.CLOUDFLARE_ACCOUNT_ID,
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    bucketName: env.R2_BUCKET_NAME,
    publicDomain: env.R2_PUBLIC_DOMAIN,
  });
} 