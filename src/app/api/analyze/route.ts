import { NextRequest, NextResponse } from 'next/server'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'
import { generateId, formatDate } from '@/lib/utils'
import { ProcessedDocument } from '@/types'

// In-memory storage for documents
// In a production app, this would be a database
export const documents: Record<string, ProcessedDocument> = {}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Read file as buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    // Extract text from PDF using pdf-parse
    const pdfData = await pdfParse(buffer)

    // For OCR, we would normally process the PDF page by page
    // This is a simplified version - in a real app we would:
    // 1. Extract each page as an image
    // 2. Run OCR on each image
    // For now, we'll just use the pdf-parse result and simulate page separation

    // Simulate page separation (this is a simplification)
    const totalText = pdfData.text
    const approximateCharsPerPage = 3000
    const pageContents: string[] = []

    // Divide the text into pages based on a rough character count
    // In a real app, we'd extract actual pages from the PDF
    for (let i = 0; i < totalText.length; i += approximateCharsPerPage) {
      pageContents.push(totalText.slice(i, i + approximateCharsPerPage))
    }

    // If no pages were created, create at least one
    if (pageContents.length === 0) {
      pageContents.push(totalText)
    }

    // Create document record
    const documentId = generateId()
    const document: ProcessedDocument = {
      id: documentId,
      name: file.name,
      text: totalText,
      pageContents,
      pageCount: pageContents.length,
      dateUploaded: formatDate(new Date()),
    }

    // Store document
    documents[documentId] = document

    return NextResponse.json({ documentId })
  } catch (error) {
    console.error('Error processing document:', error)
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    )
  }
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const documentId = url.searchParams.get('documentId')

  if (!documentId) {
    return NextResponse.json(
      { error: 'Document ID is required' },
      { status: 400 }
    )
  }

  const document = documents[documentId]

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  return NextResponse.json(document)
}
