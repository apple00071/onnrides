import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('image') as File;

        if (!file) {
            return NextResponse.json(
                { error: 'No image file provided' },
                { status: 400 }
            );
        }

        // Convert File to Buffer
        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Process image: auto-crop whitespace, resize to consistent dimensions
        const processedBuffer = await sharp(buffer)
            .trim({
                background: { r: 255, g: 255, b: 255 }, // Remove white background
                threshold: 10 // Sensitivity for edge detection
            })
            .resize(800, 600, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 0 } // Transparent background
            })
            .png() // Convert to PNG for transparency support
            .toBuffer();

        // Convert to base64 for easy storage
        const base64Image = `data:image/png;base64,${processedBuffer.toString('base64')}`;

        return NextResponse.json({
            success: true,
            image: base64Image,
            originalSize: buffer.length,
            processedSize: processedBuffer.length
        });

    } catch (error) {
        console.error('Image processing error:', error);
        return NextResponse.json(
            { error: 'Failed to process image', details: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
        );
    }
}
