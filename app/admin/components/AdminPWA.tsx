'use client';

import { useEffect, useState, useCallback } from 'react';
import { FaDownload, FaInfoCircle, FaCheckCircle } from 'react-icons/fa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function AdminPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);
  const [installStatus, setInstallStatus] = useState<'idle' | 'installing' | 'success' | 'error'>('idle');

  // Check if already installed
  const checkIfInstalled = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    // Check if in standalone mode (PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                         (window.navigator as any).standalone === true;
    
    return isStandalone;
  }, []);

  // Handle app installed event
  const handleAppInstalled = useCallback(() => {
    setIsInstalled(true);
    setIsInstallable(false);
    setDeferredPrompt(null);
    setInstallStatus('success');
    console.log('OnnRides Admin: App was installed');
    
    // Show success message briefly
    setTimeout(() => {
      setInstallStatus('idle');
    }, 3000);
  }, []);

  // Handle before install prompt event
  const handleBeforeInstallPrompt = useCallback((e: Event) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Store the event so it can be triggered later
    setDeferredPrompt(e as BeforeInstallPromptEvent);
    // Show the install button
    setIsInstallable(true);
    console.log('OnnRides Admin: App is installable');
  }, []);

  useEffect(() => {
    // Check if already installed
    if (checkIfInstalled()) {
      setIsInstalled(true);
      return;
    }

    // Add event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Cleanup function
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [handleBeforeInstallPrompt, handleAppInstalled, checkIfInstalled]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      setInstallStatus('installing');
      
      // Show the install prompt
      deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('OnnRides Admin: User accepted the install prompt');
        setInstallStatus('success');
        
        // Show a message to the user about where to find the app
        alert('Installation successful! You can now access the OnnRides Admin app from your home screen or app drawer.');
      } else {
        console.log('OnnRides Admin: User dismissed the install prompt');
        setInstallStatus('idle');
      }
    } catch (error) {
      console.error('OnnRides Admin: Error during installation', error);
      setInstallStatus('error');
      
      // Show error message
      alert('There was an error installing the app. Please try again or contact support.');
    } finally {
      // Clear the deferredPrompt for the next time
      setDeferredPrompt(null);
      
      // Keep the button visible in case of error
      if (installStatus !== 'error') {
        setIsInstallable(false);
      }
    }
  };

  // Don't render anything if not installable or already installed
  if ((!isInstallable && installStatus !== 'success' && installStatus !== 'error') || 
      (isInstalled && installStatus !== 'success')) {
    return null;
  }

  // Success message after installation
  if (installStatus === 'success') {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center gap-2 bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg">
          <FaCheckCircle className="h-5 w-5" />
          <span>App installed successfully!</span>
        </div>
      </div>
    );
  }

  // Error message
  if (installStatus === 'error') {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <div className="flex items-center gap-2 bg-red-600 text-white px-4 py-3 rounded-lg shadow-lg">
          <span>Installation failed. Try again?</span>
          <button 
            onClick={() => setInstallStatus('idle')}
            className="ml-2 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Install button
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        {showTooltip && (
          <div className="absolute bottom-full right-0 mb-2 p-3 bg-white rounded-lg shadow-lg text-sm w-64 text-gray-700">
            <p>This app requires an internet connection to function. It will not work offline.</p>
            <p className="mt-1">After installation, you'll be able to access the admin dashboard directly from your home screen.</p>
            <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-white"></div>
          </div>
        )}
        <button
          onClick={handleInstallClick}
          disabled={installStatus === 'installing'}
          className={`flex items-center gap-2 ${
            installStatus === 'installing' 
              ? 'bg-gray-500' 
              : 'bg-[#f26e24] hover:bg-[#e05e14]'
          } text-white px-4 py-3 rounded-lg shadow-lg transition-colors`}
        >
          <FaDownload className="h-5 w-5" />
          <span>
            {installStatus === 'installing' 
              ? 'Installing...' 
              : 'Install Admin App'}
          </span>
          <FaInfoCircle 
            className="h-4 w-4 ml-1 cursor-help opacity-80 hover:opacity-100"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
          />
        </button>
      </div>
    </div>
  );
} 