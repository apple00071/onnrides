import logger from '@/lib/logger';
import { put } from '@vercel/blob';
import { nanoid } from 'nanoid';

export async function uploadToBlob(file: File, filename: string): Promise<string> {
  try {
    // Generate unique filename
    const blobName = `vehicles/${nanoid()}-${filename}`;
    
    // Upload to Vercel Blob
    const blob = await put(blobName, file, {
      access: 'public',
      addRandomSuffix: false
    });

    // Return the blob URL
    return blob.url;
  } catch (error) {
    logger.error('Error uploading to blob storage:', error);
    return '/cars/default.jpg';
  }
} 