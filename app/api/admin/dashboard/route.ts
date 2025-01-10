import logger from '@/lib/logger';

import pool from '@/lib/db';


interface DashboardStats {
  total_users: number;
  total_revenue: number;
  total_vehicles: number;
  pending_documents: number;
  recent_bookings: Array<{
    id: string;
    user_name: string;
    user_email: string;
    vehicle_name: string;
    amount: number;
    status: string;
    created_at: string;
    pickup_datetime: string;
    dropoff_datetime: string;
    pickup_location: string;
    drop_location: string;
  }>;
}

export 

export async function GET(request: NextRequest) {
  
  
  try {
    
    
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    // Start a transaction
    await client.query('BEGIN');

    // Get total users
    
    
    // Get total revenue
    
    
    // Get total vehicles
    
    
    // Get pending documents
    
    
    // Get recent bookings
    

    // Commit the transaction
    await client.query('COMMIT');

    const stats: DashboardStats = {
      total_users: parseInt(usersResult.rows[0].total),
      total_revenue: parseFloat(revenueResult.rows[0].total),
      total_vehicles: parseInt(vehiclesResult.rows[0].total),
      pending_documents: parseInt(documentsResult.rows[0].total),
      recent_bookings: bookingsResult.rows
    };

    return NextResponse.json(stats);
  } catch (error) {
    // Rollback the transaction in case of error
    await client.query('ROLLBACK');
    
    logger.error('Dashboard stats error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    );
  } finally {
    // Always release the client back to the pool
    client.release();
  }
} 