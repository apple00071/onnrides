'use client';



import Cookies from 'js-cookie';

export default function AdminSessionCheck() {
  

  useEffect(() => {
    
        if (!sessionResponse.ok) {
          throw new Error('No valid session');
        }
        
        
        if (!session) {
          // No session, redirect to login
          Cookies.remove('admin_session', { path: '/admin' });
          router.push('/admin/login');
          return;
        }

        // Verify admin role
        
        if (!profileResponse.ok) {
          throw new Error('Failed to fetch admin profile');
        }
        

        if (!profile || profile.role !== 'admin') {
          // Not an admin, clear session and redirect
          await fetch('/api/admin/logout', { method: 'POST' });
          Cookies.remove('admin_session', { path: '/admin' });
          router.push('/admin/login');
        }
      } catch (error) {
        // Handle any errors by clearing session and redirecting
        Cookies.remove('admin_session', { path: '/admin' });
        router.push('/admin/login');
      }
    };

    // Check session on mount and setup refresh interval
    checkSession();
     // Check every 5 minutes

    return () => clearInterval(interval);
  }, [router]);

  return null;
} 