import { ProcessedDocument } from '@/types'

// In-memory storage for documents
// In a production app, this would be a database
export const documents: Record<string, ProcessedDocument> = {}
