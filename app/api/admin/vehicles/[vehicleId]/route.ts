import logger from '@/lib/logger';

import pool from '@/lib/db';



export async function DELETE(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    
    try {
      // First check if there are any active bookings for this vehicle
      

      if (parseInt(bookingsResult.rows[0].count) > 0) {
        return NextResponse.json(
          { error: 'Cannot delete vehicle with active bookings' },
          { status: 400 }
        );
      }

      // Delete the vehicle
      

      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: 'Vehicle not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: 'Vehicle deleted successfully' });
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { vehicleId: string } }
) {
  try {
    // Check if user is authenticated and is an admin
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    
    
    
    let locations;
    try {
      locations = JSON.parse(formData.get('location') as string);
    } catch (error) {
      locations = [];
    }
    
    
    
    

    // Handle image upload
    let image_url;
    
    if (image) {
      // Get the current image URL to delete it later
      

      // Upload new image
      
      image_url = await uploadToBlob(image, filename);

      // Delete old image if it exists and is not the default image
      if (currentImage.rows[0]?.image_url && !currentImage.rows[0].image_url.includes('default.jpg')) {
        try {
          await deleteFromBlob(currentImage.rows[0].image_url);
        } catch (error) {
          logger.error('Error deleting old image:', error);
        }
      }
    }

    
    try {
      

      

      

      if (result.rowCount === 0) {
        return NextResponse.json(
          { error: 'Vehicle not found' },
          { status: 404 }
        );
      }

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
} 