import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { writeFile } from 'fs/promises';
import { mkdir } from 'fs/promises';
import path from 'path';
import logger from '@/lib/logger';

// New route segment config
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Verify admin authentication
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const type = formData.get('type') as string;
    const bookingId = formData.get('bookingId') as string;
    
    if (!file || !type || !bookingId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Define upload directory and create if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'documents', bookingId);
    await mkdir(uploadsDir, { recursive: true });
    
    // Create a unique filename
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const filename = `${type}_${Date.now()}.${fileExtension}`;
    const filePath = path.join(uploadsDir, filename);
    
    // Convert file to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Save the file
    await writeFile(filePath, buffer);
    
    // Construct the URL to the file (relative to public folder)
    const publicUrl = `/uploads/documents/${bookingId}/${filename}`;
    
    return NextResponse.json({
      success: true,
      url: publicUrl,
      message: 'Document uploaded successfully'
    });
  } catch (error) {
    logger.error('Error uploading document:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to upload document'
      },
      { status: 500 }
    );
  }
} 