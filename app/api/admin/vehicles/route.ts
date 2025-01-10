import logger from '@/lib/logger';

import pool from '@/lib/db';



export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    try {
      

      return NextResponse.json(result.rows);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    
    
    // Validate required fields
    
    
    for (const field of requiredFields) {
      if (!formData.get(field)) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Parse and validate price
    
    
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      return NextResponse.json(
        { error: 'Invalid price' },
        { status: 400 }
      );
    }

    // Parse and validate quantity
    
    if (isNaN(quantity) || quantity <= 0) {
      return NextResponse.json(
        { error: 'Invalid quantity' },
        { status: 400 }
      );
    }

    // Parse locations array
    let locations;
    try {
      locations = JSON.parse(formData.get('location') as string);
      if (!Array.isArray(locations) || locations.length === 0) {
        throw new Error('Invalid locations');
      }
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid locations format' },
        { status: 400 }
      );
    }

    // Handle image upload
    let image_url = '';
    
    if (image) {
      
      image_url = await uploadToBlob(image, filename);
    }

    
    try {
      

      return NextResponse.json(result.rows[0]);
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get vehicle ID from URL
    
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
      // TODO: Implement image upload to a storage service
      image_url = '/cars/default.jpg';
    }

    
    try {
      
      

      if (image_url) {
        updateFields.push('image_url = $9');
        values.push(image_url);
      }

      

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

export async function DELETE(request: NextRequest) {
  try {
    // Check if user is authenticated and is an admin
    
    if (!user || user.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get vehicle ID from URL
    
    if (!vehicleId) {
      return NextResponse.json(
        { error: 'Vehicle ID is required' },
        { status: 400 }
      );
    }

    
    try {
      // First check if there are any active bookings for this vehicle
      

      if (bookingsResult.rows[0].count > 0) {
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