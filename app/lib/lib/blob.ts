import { put, del } from '@vercel/blob';
import logger from '@/lib/logger';

export interface BlobItem {
  url: string;
  pathname: string;
  contentType?: string;
  uploadedAt?: Date;
}

export async function uploadBlob(
  data: Buffer | Blob | ArrayBuffer,
  options: {
    filename: string;
    contentType?: string;
    access?: 'public' | 'private';
  }
): Promise<BlobItem> {
  try {
    const { url, pathname } = await put(options.filename, data, {
      access: options.access || 'public',
      contentType: options.contentType,
      addRandomSuffix: true,
    });

    logger.debug('File uploaded successfully:', { url, pathname });
    return { url, pathname };
  } catch (error) {
    logger.error('Error uploading file:', error);
    throw error;
  }
}

export async function deleteBlob(url: string): Promise<void> {
  try {
    await del(url);
    logger.debug('File deleted successfully:', url);
  } catch (error) {
    logger.error('Error deleting file:', error);
    throw error;
  }
} 