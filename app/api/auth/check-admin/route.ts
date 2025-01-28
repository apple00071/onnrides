import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email } = body;

    console.log('Checking admin access for email:', email);

    if (!email) {
      console.log('Email is required but was not provided');
      return new NextResponse(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    try {
      // Test database connection
      await prisma.$connect();
      console.log('Database connection successful');

      // Find the user and check their role
      const user = await prisma.users.findUnique({
        where: { email },
        select: { 
          role: true,
          id: true,
          email: true 
        },
      });

      console.log('Found user:', user);

      if (!user) {
        console.log('User not found for email:', email);
        return new NextResponse(JSON.stringify({ error: 'User not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const isAdmin = user.role === 'admin';
      console.log('User role:', user.role, 'Is admin:', isAdmin);

      return new NextResponse(JSON.stringify({
        isAdmin,
        role: user.role,
        user: {
          id: user.id,
          email: user.email,
          role: user.role
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (dbError) {
      console.error('Database error:', dbError);
      throw new Error(`Database error: ${dbError instanceof Error ? dbError.message : 'Unknown database error'}`);
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    console.error('Check admin error:', error);
    // Log the full error details
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    return new NextResponse(JSON.stringify({ 
      error: 'Internal Server Error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
} 