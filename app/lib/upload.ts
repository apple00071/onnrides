import logger from '@/lib/logger';
import { BlobServiceClient } from '@azure/storage-blob';

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING || '';
const CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME || 'vehicles';

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