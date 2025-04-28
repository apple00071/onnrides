import logger from '@/lib/logger';
import { BlobServiceClient } from '@azure/storage-blob';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'vehicles';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'ap-south-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
  }
});

export async function uploadToBlob(file: File, filename: string): Promise<string> {
  try {
    // Create the BlobServiceClient object with connection string
    const blobServiceClient = BlobServiceClient.fromConnectionString(
      AZURE_STORAGE_CONNECTION_STRING
    );

    // Get a reference to a container
    const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);

    // Create a unique name for the blob
    const blobName = `${Date.now()}-${filename}`;

    // Get a block blob client
    const blockBlobClient = containerClient.getBlockBlobClient(blobName);

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();

    // Upload data to the blob
    await blockBlobClient.uploadData(arrayBuffer, {
      blobHTTPHeaders: { blobContentType: file.type }
    });

    // Return the blob URL
    return blockBlobClient.url;
  } catch (error) {
    logger.error('Error uploading to blob storage:', error);
    return '/cars/default.jpg';
  }
}

export async function uploadFile(file: File, path: string): Promise<string> {
  try {
    const buffer = await file.arrayBuffer();
    const key = `${path}/${file.name}`;

    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET || '',
        Key: key,
        Body: Buffer.from(buffer),
        ContentType: file.type,
      })
    );

    return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION || 'ap-south-1'}.amazonaws.com/${key}`;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw new Error('Failed to upload file');
  }
} 