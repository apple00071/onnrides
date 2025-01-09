import { put } from '@vercel/blob';
import { del } from '@vercel/blob';

export async function uploadToBlob(file: File, filename: string) {
  try {
    const blob = await put(filename, file, {
      access: 'public',
    });

    return blob.url;
  } catch (error) {
    console.error('Error uploading to blob:', error);
    throw error;
  }
}

export async function deleteFromBlob(url: string) {
  try {
    await del(url);
  } catch (error) {
    console.error('Error deleting from blob:', error);
    throw error;
  }
} 