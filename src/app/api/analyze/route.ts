import { NextRequest, NextResponse } from 'next/server'
import { generateId, formatDate } from '@/lib/utils'
import { ProcessedDocument } from '@/types'
import { storeDocument, getDocument } from '@/lib/documentStore'
import { pdfjs } from 'react-pdf'

// Initialize PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`

export async function POST(req: NextRequest) {
  let pdf: any = null
  
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    if (!file.type.includes('pdf')) {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 })
    }

    // Read file as ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    
    // Load the PDF using react-pdf
    const loadingTask = pdfjs.getDocument(new Uint8Array(arrayBuffer))
    pdf = await loadingTask.promise
    
    // Get total page count
    const pageCount = pdf.numPages
    
    if (pageCount === 0) {
      return NextResponse.json({ error: 'PDF is empty' }, { status: 400 })
    }
    
    // Extract text content from each page separately
    const pageContents: string[] = []
    let totalText = ''
    
    // Process each page
    for (let i = 1; i <= pageCount; i++) {
      try {
        const page = await pdf.getPage(i)
        const textContent = await page.getTextContent()
        
        // Extract and join text items with spaces
        const pageText = textContent.items
          .map((item: { str?: string }) => 'str' in item ? item.str : '')
          .join(' ')
        
        pageContents.push(pageText)
        totalText += pageText + '\n'
      } catch (pageError) {
        console.error(`Error processing page ${i}:`, pageError)
        // Add empty string for failed pages to maintain page count
        pageContents.push('')
        totalText += '\n'
      }
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
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Invalid PDF structure')) {
        return NextResponse.json({ error: 'Invalid PDF file' }, { status: 400 })
      }
      if (error.message.includes('Password protected')) {
        return NextResponse.json({ error: 'Password protected PDFs are not supported' }, { status: 400 })
      }
    }
    
    return NextResponse.json(
      { error: 'Failed to process document' },
      { status: 500 }
    )
  } finally {
    // Cleanup
    if (pdf) {
      pdf.destroy()
    }
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
