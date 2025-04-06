/**
 * Safely get a DOM element by ID with null fallback and type safety
 */
export function getElementById<T extends HTMLElement = HTMLElement>(id: string): T | null {
  if (typeof document === 'undefined') return null;
  return document.getElementById(id) as T | null;
}

/**
 * Safely query DOM elements with null fallback and type safety
 */
export function querySelector<T extends HTMLElement = HTMLElement>(selector: string, parent?: HTMLElement): T | null {
  if (typeof document === 'undefined') return null;
  const context = parent || document;
  return context.querySelector(selector) as T | null;
}

/**
 * Safely query all DOM elements with empty array fallback and type safety
 */
export function querySelectorAll<T extends HTMLElement = HTMLElement>(selector: string, parent?: HTMLElement): T[] {
  if (typeof document === 'undefined') return [];
  const context = parent || document;
  return Array.from(context.querySelectorAll(selector)) as T[];
}

/**
 * Safely check if an element is a child of another element
 */
export function isChildOf(child: Node | null, parent: Node | null): boolean {
  if (!child || !parent) return false;
  
  // Walk up the DOM tree looking for the parent
  let current: Node | null = child;
  while (current) {
    if (current === parent) return true;
    current = current.parentNode;
  }
  
  return false;
}

/**
 * Safely append a child element, checking parent-child relationship first
 */
export function safeAppendChild<T extends Node>(parent: Node | null, child: T | null): T | null {
  if (!parent || !child) return null;
  
  // Don't append if already a child
  if (isChildOf(child, parent)) return child;
  
  try {
    return parent.appendChild(child);
  } catch (error) {
    console.error('Error appending child:', error);
    return null;
  }
}

/**
 * Safely insert a node before another node, with proper error handling
 */
export function safeInsertBefore<T extends Node>(
  parent: Node | null, 
  newNode: T | null, 
  referenceNode: Node | null
): T | null {
  if (!parent || !newNode) return null;
  
  // Handle the case where referenceNode is not a child of parent
  if (referenceNode && !isChildOf(referenceNode, parent)) {
    console.warn('Reference node is not a child of parent');
    return safeAppendChild(parent, newNode); // Fall back to appending
  }
  
  try {
    return parent.insertBefore(newNode, referenceNode) as T;
  } catch (error) {
    console.error('Error inserting node:', error);
    return safeAppendChild(parent, newNode); // Fall back to appending
  }
}

/**
 * Safely remove a child element, checking parent-child relationship first
 */
export function safeRemoveChild<T extends Node>(parent: Node | null, child: T | null): T | null {
  if (!parent || !child) return null;
  
  // Don't remove if not a direct child
  if (child.parentNode !== parent) return null;
  
  try {
    return parent.removeChild(child) as T;
  } catch (error) {
    console.error('Error removing child:', error);
    return null;
  }
}

/**
 * Safely add event listener with proper type safety and null handling
 */
export function safeAddEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | null | undefined,
  type: K,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
  options?: boolean | AddEventListenerOptions
): void {
  if (!element) return;
  
  try {
    element.addEventListener(type, listener, options);
  } catch (error) {
    console.error(`Error adding ${type} event listener:`, error);
  }
}

/**
 * Safely remove event listener with proper type safety and null handling
 */
export function safeRemoveEventListener<K extends keyof HTMLElementEventMap>(
  element: HTMLElement | null | undefined,
  type: K,
  listener: (this: HTMLElement, ev: HTMLElementEventMap[K]) => any,
  options?: boolean | EventListenerOptions
): void {
  if (!element) return;
  
  try {
    element.removeEventListener(type, listener, options);
  } catch (error) {
    console.error(`Error removing ${type} event listener:`, error);
  }
} 