import { put, del, list } from '@vercel/blob';
import logger from '@/lib/logger';

export interface BlobItem {
  url: string;
  pathname: string;
  contentType?: string;
  uploadedAt?: Date;
  size?: number;
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
    const { url, pathname, contentType, size } = await put(options.filename, data, {
      access: options.access || 'public',
      contentType: options.contentType,
      addRandomSuffix: true,
    });

    logger.debug('File uploaded successfully:', { url, pathname });
    return { url, pathname, contentType: contentType || undefined, size };
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

export async function listBlobs(options?: {
  prefix?: string;
  limit?: number;
  cursor?: string;
}): Promise<{ items: BlobItem[]; cursor?: string }> {
  try {
    const { blobs, cursor } = await list(options);
    
    const items = blobs.map(blob => ({
      url: `${process.env.NEXT_PUBLIC_VERCEL_BLOB_URL}/${blob.pathname}`,
      pathname: blob.pathname,
      contentType: blob.contentType || undefined,
      uploadedAt: blob.uploadedAt ? new Date(blob.uploadedAt) : undefined,
      size: blob.size
    }));

    logger.debug('Files listed successfully:', { count: items.length });
    return { items, cursor };
  } catch (error) {
    logger.error('Error listing files:', error);
    throw error;
  }
} 