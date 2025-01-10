import logger from '@/lib/logger';



export async function uploadToBlob(file: File, filename: string) {
  try {
    

    return blob.url;
  } catch (error) {
    logger.error('Error uploading to blob:', error);
    throw error;
  }
}

export async function deleteFromBlob(url: string) {
  try {
    await del(url);
  } catch (error) {
    logger.error('Error deleting from blob:', error);
    throw error;
  }
} 