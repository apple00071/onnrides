import logger from '@/lib/logger';

import pool from '@/lib/db';


export async function GET(request: NextRequest) {
  
  try {
    // Get user from token instead of headers
    
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // First check if profile exists
    

    // If profile doesn&apos;t exist, create one with minimal data
    if (profileCheck.rows.length === 0) {
      
      
      if (createProfile.rows.length === 0) {
        throw new Error('Failed to create profile');
      }
    }

    // Get user data with profile
    

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'Profile not found' },
        { status: 404 }
      );
    }

    // Combine first_name and last_name for backward compatibility
    

    return NextResponse.json(profile);
  } catch (error) {
    logger.error('Error fetching profile:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function PATCH(request: NextRequest) {
  
  try {
    // Get user from token instead of headers
    
    if (!user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { name, phone, address } = await request.json();

    // Split name into first_name and last_name if provided
    let firstName = null;
    let lastName = null;
    if (name) {
      const [firstPart, ...lastParts] = name.trim().split(' ');
      firstName = firstPart;
      lastName = lastParts.join(' ') || null;
    }

    // First check if profile exists
    

    // If profile doesn&apos;t exist, create one
    if (profileCheck.rows.length === 0) {
      await client.query(
        `INSERT INTO profiles (
          user_id, 
          first_name, 
          last_name, 
          phone_number,
          is_documents_verified
        ) VALUES ($1, $2, $3, $4, false)`,
        [user.id, firstName, lastName, phone]
      );
    }

    

    if (result.rows.length === 0) {
      return NextResponse.json(
        { message: 'Profile not found' },
        { status: 404 }
      );
    }

    // Get full user data with updated profile
    

    // Combine first_name and last_name for backward compatibility
    

    return NextResponse.json(profile);
  } catch (error) {
    logger.error('Error updating profile:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
} 