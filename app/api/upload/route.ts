import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';
import { uploadFile } from '@/lib/upload';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// Adding route segment config
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    // Auth check: must be logged in
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { message: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { message: 'Only image files are allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { message: 'File size must not exceed 10MB' },
        { status: 400 }
      );
    }

    // Upload to Supabase Storage
    const publicUrl = await uploadFile(file, 'general');

    logger.debug('File uploaded successfully:', publicUrl);

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    logger.error('Error uploading file:', error);
    return NextResponse.json(
      { message: 'Failed to upload file' },
      { status: 500 }
    );
  }
}