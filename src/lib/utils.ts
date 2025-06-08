// src/lib/utils.ts
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
 * Simple encryption for API keys
 * This is a basic implementation and not meant for high-security applications
 */
function encryptApiKey(apiKey: string): string {
  // Simple XOR-based encryption with a fixed key
  // This provides obfuscation rather than true encryption
  const encryptionKey = 'pdf-analyzer-key-2025'
  let encrypted = ''

  for (let i = 0; i < apiKey.length; i++) {
    const charCode = apiKey.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length)
    encrypted += String.fromCharCode(charCode)
  }

  // Convert to Base64 for safe storage
  return btoa(encrypted)
}

/**
 * Decrypt the API key
 */
function decryptApiKey(encryptedKey: string): string {
  try {
    // Convert from Base64
    const encrypted = atob(encryptedKey)
    const encryptionKey = 'pdf-analyzer-key-2025'
    let decrypted = ''

    for (let i = 0; i < encrypted.length; i++) {
      const charCode = encrypted.charCodeAt(i) ^ encryptionKey.charCodeAt(i % encryptionKey.length)
      decrypted += String.fromCharCode(charCode)
    }

    return decrypted
  } catch (error) {
    console.error('Failed to decrypt API key:', error)
    return ''
  }
}

/**
 * Safely store API keys in sessionStorage with encryption
 */
export function storeApiKey(
  provider: 'openai' | 'anthropic',
  apiKey: string
): void {
  // Encrypt the API key before storing
  const encryptedKey = encryptApiKey(apiKey)
  sessionStorage.setItem(`apiKey_${provider}`, encryptedKey)
}

/**
 * Store the last used provider in sessionStorage
 */
export function storeLastProvider(provider: 'openai' | 'anthropic'): void {
  sessionStorage.setItem('lastProvider', provider)
}

/**
 * Store the last used model in sessionStorage
 */
export function storeLastModel(model: string): void {
  sessionStorage.setItem('lastModel', model)
}

/**
 * Retrieve API keys from sessionStorage
 */
export function getApiKey(provider: 'openai' | 'anthropic'): string | null {
  const encryptedKey = sessionStorage.getItem(`apiKey_${provider}`)
  if (!encryptedKey) return null

  // Decrypt the API key
  return decryptApiKey(encryptedKey)
}

/**
 * Retrieve the last used provider from sessionStorage
 */
export function getLastProvider(): 'openai' | 'anthropic' | null {
  const provider = sessionStorage.getItem('lastProvider') as 'openai' | 'anthropic' | null
  return provider
}

/**
 * Retrieve the last used model from sessionStorage
 */
export function getLastModel(): string | null {
  return sessionStorage.getItem('lastModel')
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

/**
 * Parse context length error messages from LLM APIs
 * Returns the max tokens and used tokens if it's a context length error
 */
export function parseContextLengthError(errorMessage: string): {
  maxTokens: number;
  usedTokens: number;
  isContextLengthError: boolean
} | null {
  // Match patterns like "maximum context length is 8192 tokens. However, your messages resulted in 16614 tokens"
  const regex = /maximum context length is (\d+) tokens.*resulted in (\d+) tokens/i;
  const matches = errorMessage.match(regex);

  if (matches && matches.length === 3) {
    return {
      maxTokens: parseInt(matches[1], 10),
      usedTokens: parseInt(matches[2], 10),
      isContextLengthError: true
    };
  }

  return null;
}
