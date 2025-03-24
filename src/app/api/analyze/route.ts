import { NextRequest, NextResponse } from 'next/server'
import { generateId, formatDate } from '@/lib/utils'
import { ProcessedDocument } from '@/types'
import { storeDocument, getDocument } from '@/lib/documentStore'
import pdfParse from 'pdf-parse/lib/pdf-parse.js'

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

    // Use actual pages from the PDF instead of arbitrary divisions
    // Note: This is a custom approach to extract page content separately
    // since pdf-parse doesn't provide per-page text directly
    const pageContents: string[] = []

    // Include the page count from the actual PDF
    const pageCount = pdfData.numpages

    // If pdf-parse provides the text as a whole, we'll try to divide it by common page delimiters
    const totalText = pdfData.text

    if (pageCount <= 1) {
      // If there's only one page, use the entire text
      pageContents.push(totalText)
    } else {
      // Try to identify page breaks in the extracted text
      // This is a simplification - in a real app we would use a proper PDF library that supports
      // per-page extraction or process the PDF page by page using OCR

      // Common markers that appear at page boundaries
      const pageDelimiters = [
        /\f/g, // Form feed character often marks page breaks
        /\n\s*\d+\s*\n/g, // Page numbers often appear alone
      ]

      // Split text by potential page breaks
      let pages: string[] = [totalText]
      for (const delimiter of pageDelimiters) {
        const newPages: string[] = []
        for (const page of pages) {
          const parts = page.split(delimiter)
          if (parts.length > 1) {
            newPages.push(...parts.filter((p) => p.trim().length > 0))
          } else {
            newPages.push(page)
          }
        }
        pages = newPages
      }

      // If we successfully split into a reasonable number of pages, use those
      if (pages.length > 1 && pages.length <= pageCount * 2) {
        pageContents.push(...pages)
      } else {
        // Fallback to simple division
        const approxLengthPerPage = Math.ceil(totalText.length / pageCount)
        for (let i = 0; i < pageCount; i++) {
          const start = i * approxLengthPerPage
          const end = Math.min((i + 1) * approxLengthPerPage, totalText.length)
          pageContents.push(totalText.slice(start, end))
        }
      }
    }

    // Ensure we have the right number of pages
    while (pageContents.length < pageCount) {
      pageContents.push('Page content could not be extracted')
    }

    // If we have too many pages, merge extras
    if (pageContents.length > pageCount) {
      const extraPages = pageContents.splice(pageCount)
      pageContents[pageCount - 1] += '\n' + extraPages.join('\n')
    }

    // Create document record
    const documentId = generateId()
    const document: ProcessedDocument = {
      id: documentId,
      name: file.name,
      text: totalText,
      pageContents,
      pageCount: pageCount,
      dateUploaded: formatDate(new Date()),
    }

    // Store document using the helper function
    storeDocument(document)

    console.log(`Document processed and stored with ID: ${documentId}`)

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

  const document = getDocument(documentId)

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  return NextResponse.json(document)
}
