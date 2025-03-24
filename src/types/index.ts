export interface ApiKeyConfig {
  provider: 'openai' | 'anthropic'
  apiKey: string
  model?: string // The selected model ID
}

export interface ModelInfo {
  id: string
  name: string
}

export interface DocumentReference {
  pageNumber: number
  text: string
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
