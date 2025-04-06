'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import * as DomUtils from '@/lib/dom-utils';
import { useBrowserFeatures } from '@/hooks/useBrowserFeatures';

// Create context for safe DOM operations
interface SafeDomContextType {
  isClient: boolean;
  getElementById: typeof DomUtils.getElementById;
  querySelector: typeof DomUtils.querySelector;
  querySelectorAll: typeof DomUtils.querySelectorAll;
  isChildOf: typeof DomUtils.isChildOf;
  safeAppendChild: typeof DomUtils.safeAppendChild;
  safeInsertBefore: typeof DomUtils.safeInsertBefore;
  safeRemoveChild: typeof DomUtils.safeRemoveChild;
  safeAddEventListener: typeof DomUtils.safeAddEventListener;
  safeRemoveEventListener: typeof DomUtils.safeRemoveEventListener;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  viewportWidth: number | null;
  viewportHeight: number | null;
}

const SafeDomContext = createContext<SafeDomContextType | undefined>(undefined);

/**
 * Provider component that makes safe DOM operations available to React components
 */
export function SafeDomProvider({ children }: { children: ReactNode }) {
  const { 
    isClient, 
    isMobile, 
    isTablet, 
    isDesktop, 
    viewportWidth, 
    viewportHeight 
  } = useBrowserFeatures();

  const value: SafeDomContextType = {
    isClient,
    getElementById: DomUtils.getElementById,
    querySelector: DomUtils.querySelector,
    querySelectorAll: DomUtils.querySelectorAll,
    isChildOf: DomUtils.isChildOf,
    safeAppendChild: DomUtils.safeAppendChild,
    safeInsertBefore: DomUtils.safeInsertBefore,
    safeRemoveChild: DomUtils.safeRemoveChild,
    safeAddEventListener: DomUtils.safeAddEventListener,
    safeRemoveEventListener: DomUtils.safeRemoveEventListener,
    isMobile,
    isTablet,
    isDesktop,
    viewportWidth,
    viewportHeight,
  };

  return (
    <SafeDomContext.Provider value={value}>
      {children}
    </SafeDomContext.Provider>
  );
}

/**
 * Hook to use safe DOM operations in React components
 */
export function useSafeDom() {
  const context = useContext(SafeDomContext);
  if (context === undefined) {
    throw new Error('useSafeDom must be used within a SafeDomProvider');
  }
  return context;
} 