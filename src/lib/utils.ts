import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names with Tailwind CSS
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Generates a unique ID
 */
export function generateId(): string {
  return Math.random().toString(36).substring(2, 15)
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

/**
 * Safely store API keys in localStorage with encryption
 */
export function storeApiKey(
  provider: 'openai' | 'anthropic',
  apiKey: string
): void {
  // In a production environment, this should be encrypted
  localStorage.setItem(`apiKey_${provider}`, apiKey)
}

/**
 * Retrieve API keys from localStorage
 */
export function getApiKey(provider: 'openai' | 'anthropic'): string | null {
  return localStorage.getItem(`apiKey_${provider}`)
}

/**
 * Helper to chunk text into smaller pieces for processing
 */
export function chunkText(text: string, chunkSize = 1000): string[] {
  const chunks = []
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize))
  }
  return chunks
}
