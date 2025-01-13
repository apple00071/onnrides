import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import logger from '@/lib/logger';
import { findUserById, createUser, updateUser } from '@/app/lib/lib/db';

interface UserProfile {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  role: string | null;
  is_blocked: boolean | null;
  is_verified: boolean | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export async function GET(request: NextRequest) {
  try {
    // Get user from session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get user profile data
    const profile = await findUserById(session.user.id);

    if (!profile) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(profile);
  } catch (error) {
    logger.error('Error fetching profile:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    // Get user from session
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, phone } = body;

    // Get existing profile
    let profile = await findUserById(session.user.id);

    if (!profile) {
      // Create new profile if it doesn't exist
      profile = await createUser({
        id: session.user.id,
        email: session.user.email!,
        name: name || session.user.name || '',
        phone: phone || null,
        role: 'user',
        is_blocked: false,
        is_verified: false
      });
    } else {
      // Update existing profile
      profile = await updateUser(session.user.id, {
        name: name || profile.name,
        phone: phone || profile.phone
      });
    }

    if (!profile) {
      return NextResponse.json(
        { message: 'Failed to update profile' },
        { status: 500 }
      );
    }

    return NextResponse.json(profile);
  } catch (error) {
    logger.error('Error updating profile:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
} 