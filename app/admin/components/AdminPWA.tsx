'use client';

import { useEffect, useState } from 'react';
import { FaDownload, FaInfoCircle } from 'react-icons/fa';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export default function AdminPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Store the event so it can be triggered later
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      // Show the install button
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
      console.log('OnnRides Admin: App was installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', () => {});
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;
    
    if (choiceResult.outcome === 'accepted') {
      console.log('OnnRides Admin: User accepted the install prompt');
    } else {
      console.log('OnnRides Admin: User dismissed the install prompt');
    }
    
    // Clear the deferredPrompt for the next time
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  if (!isInstallable || isInstalled) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="relative">
        {showTooltip && (
          <div className="absolute bottom-full right-0 mb-2 p-3 bg-white rounded-lg shadow-lg text-sm w-64 text-gray-700">
            <p>This app requires an internet connection to function. It will not work offline.</p>
            <div className="absolute bottom-0 right-4 transform translate-y-1/2 rotate-45 w-2 h-2 bg-white"></div>
          </div>
        )}
        <button
          onClick={handleInstallClick}
          className="flex items-center gap-2 bg-[#f26e24] text-white px-4 py-3 rounded-lg shadow-lg hover:bg-[#e05e14] transition-colors"
        >
          <FaDownload className="h-5 w-5" />
          <span>Install Admin App</span>
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