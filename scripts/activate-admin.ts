import { UserService } from '../lib/services/user.service';

async function activateAdmin() {
  try {
    console.log('Starting admin activation process...');
    
    const adminEmail = 'admin@example.com';
    console.log('Looking for admin user with email:', adminEmail);
    
    const user = await UserService.getUserByEmail(adminEmail);
    console.log('User found:', user ? 'Yes' : 'No');

    if (!user) {
      console.error('Admin user not found in Firestore');
      return;
    }

    console.log('Current user data:', {
      id: user.id,
      email: user.email,
      isActive: user.isActive,
      role: user.role
    });

    console.log('Updating user with ID:', user.id);
    await UserService.updateUser(user.id, {
      isActive: true,
      role: 'admin' as const
    });

    // Verify the update
    const updatedUser = await UserService.getUserByEmail(adminEmail);
    console.log('Updated user data:', {
      id: updatedUser?.id,
      email: updatedUser?.email,
      isActive: updatedUser?.isActive,
      role: updatedUser?.role
    });

    console.log('Admin user activated successfully');
  } catch (error) {
    console.error('Error activating admin:', error);
    // Log the full error details
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
    }
    process.exit(1);
  }
}

// Run the function and handle any unhandled promise rejections
activateAdmin().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
}); 