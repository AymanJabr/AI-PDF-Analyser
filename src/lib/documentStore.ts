import { ProcessedDocument } from '@/types'

// Ensure we have a global singleton for server-side document storage
// This helps with Next.js API route isolation
let globalDocuments: Record<string, ProcessedDocument> = {}

// Try to access global context if available (for Next.js)
if (typeof global !== 'undefined') {
  // @ts-ignore: Workaround for global variable
  if (!global.__pdfDocuments) {
    // @ts-ignore: Workaround for global variable
    global.__pdfDocuments = {}
  }
  // @ts-ignore: Workaround for global variable
  globalDocuments = global.__pdfDocuments
}

// Function to store a document
export function storeDocument(document: ProcessedDocument): void {
  // Store in memory (global scope for persistence between API calls)
  globalDocuments[document.id] = document

  console.log(`Document stored with ID: ${document.id}`)
  console.log(`Current documents in store:`, Object.keys(globalDocuments))
}

// Function to retrieve a document
export function getDocument(id: string): ProcessedDocument | null {
  const doc = globalDocuments[id]

  if (!doc) {
    console.error(
      `Document with ID ${id} not found. Available IDs:`,
      Object.keys(globalDocuments)
    )
    return null
  }

  return doc
}

// Export documents for compatibility with existing code
export const documents = globalDocuments
