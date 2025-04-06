import { NextRequest, NextResponse } from 'next/server'
import { generateId, formatDate } from '@/lib/utils'
import { ProcessedDocument } from '@/types'
import { storeDocument, getDocument, getAllDocuments, removeDocument } from '@/lib/documentStore'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    const processedData = formData.get('processedData') as string

    if (!file || !processedData) {
      return NextResponse.json({ error: 'No file or processed data provided' }, { status: 400 })
    }

    // Check if a document with the same name already exists
    const allDocuments = getAllDocuments()
    const existingDoc = allDocuments.find(doc => doc.name === file.name)
    const isUpdate = !!existingDoc

    // Parse the processed data
    const { text, pageContents, pageCount } = JSON.parse(processedData)

    // Create document record
    const documentId = isUpdate ? existingDoc.id : generateId()
    const document: ProcessedDocument = {
      id: documentId,
      name: file.name,
      text,
      pageContents,
      pageCount,
      dateUploaded: formatDate(new Date()),
    }

    // Store document using the helper function
    storeDocument(document)

    console.log(`Document ${isUpdate ? 'updated' : 'created'} with ID: ${documentId}`)

    return NextResponse.json({
      documentId,
      isUpdate,
      message: isUpdate ? 'Document updated' : 'Document created'
    })
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
    // Return all documents if no specific ID is requested
    const allDocuments = getAllDocuments()
    return NextResponse.json(allDocuments)
  }

  const document = getDocument(documentId)

  if (!document) {
    return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  }

  return NextResponse.json(document)
}

export async function DELETE(req: NextRequest) {
  const url = new URL(req.url)
  const documentId = url.searchParams.get('documentId')

  if (!documentId) {
    return NextResponse.json(
      { error: 'Document ID is required' },
      { status: 400 }
    )
  }

  const success = removeDocument(documentId)

  if (!success) {
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 404 }
    )
  }

  return NextResponse.json({ success: true })
}
