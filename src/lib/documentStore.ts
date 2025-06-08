import { ProcessedDocument } from '@/types'

// Ensure we have a global singleton for server-side document storage
// This helps with Next.js API route isolation
let globalDocuments: Record<string, ProcessedDocument> = {}

// Try to access global context if available (for Next.js)
if (typeof global !== 'undefined') {
  if (!global.__pdfDocuments) {
    global.__pdfDocuments = {}
  }
  globalDocuments = global.__pdfDocuments
}

// Function to store a document
export function storeDocument(document: ProcessedDocument): void {
  if (!document || !document.id) {
    console.error('Attempted to store invalid document:', document)
    return
  }

  if (!document.pageContents || document.pageContents.length === 0) {
    console.error('Attempted to store document with no page contents:', document.id)
    return
  }

  // Check if a document with the same name already exists
  const existingDocWithSameName = Object.values(globalDocuments).find(
    doc => doc.name === document.name
  )

  if (existingDocWithSameName) {
    console.log(`Document with name "${document.name}" already exists, updating existing entry`)
    // Use the existing document's ID to update it
    document.id = existingDocWithSameName.id
  }

  // Store in memory (global scope for persistence between API calls)
  globalDocuments[document.id] = document

  console.log(`Document stored with ID: ${document.id}`)
  console.log(`Document details:`, {
    name: document.name,
    pageCount: document.pageCount,
    contentLength: document.pageContents.length,
  })

  console.log(`Current documents in store:`, Object.keys(globalDocuments))
}

// Function to retrieve a document
export function getDocument(id: string): ProcessedDocument | null {
  if (!id) {
    console.error('Attempted to get document with no ID')
    return null
  }

  const doc = globalDocuments[id]

  if (!doc) {
    console.error(
      `Document with ID ${id} not found. Available IDs:`,
      Object.keys(globalDocuments)
    )
    return null
  }

  if (!doc.pageContents || doc.pageContents.length === 0) {
    console.error(`Document ${id} has no page contents`)
    return null
  }

  return doc
}

// Function to get all documents in the store
export function getAllDocuments(): ProcessedDocument[] {
  return Object.values(globalDocuments)
}

// Function to remove a document from the store
export function removeDocument(id: string): boolean {
  if (!id || !globalDocuments[id]) {
    console.error(`Document with ID ${id} not found for deletion`)
    return false
  }

  // Delete the document
  delete globalDocuments[id]
  console.log(`Document with ID ${id} removed from store`)
  console.log(`Remaining documents in store:`, Object.keys(globalDocuments))
  return true
}

// Export documents for compatibility with existing code
export const documents = globalDocuments
