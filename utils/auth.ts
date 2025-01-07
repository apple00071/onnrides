import { User } from '@/app/(main)/profile/page';
import { redirect } from 'next/navigation';

export const handleBookingRedirect = (user: User | null) => {
  if (!user) {
    redirect('/login');
    return;
  }

  if (!user.isDocumentsVerified) {
    redirect('/profile');
    return;
  }

  // If user is logged in and documents are verified, continue to booking
  return true;
}; 