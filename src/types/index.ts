// src/types/index.ts
export interface ApiKeyConfig {
  provider: 'openai' | 'anthropic'
  apiKey: string
  model?: string // The selected model ID
  openAIApiKey?: string // Required when provider is 'anthropic', for embeddings
}

export interface ModelInfo {
  id: string
  name: string
}

export interface DocumentReference {
  pageNumber: number
  text: string
  fullText?: string // Full chunk text for highlighting
  highlightRange?: { start: number; end: number } // Specific range to highlight
}

export interface Message {
  role: 'user' | 'assistant'
  content: string
  references?: DocumentReference[]
}

export interface ChatSession {
  id: string
  documentId: string
  messages: Message[]
}

export interface ProcessedDocument {
  id: string
  name: string
  text: string // Full extracted text
  pageContents: string[] // Text content per page
  pageCount: number
  dateUploaded: string
}

export interface UserSettings {
  apiKeyConfig?: ApiKeyConfig
}
