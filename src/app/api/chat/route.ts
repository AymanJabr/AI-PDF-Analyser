import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { Document } from 'langchain/document'
import { DocumentReference } from '@/types'
import { FakeEmbeddings } from 'langchain/embeddings/fake'
import { getDocument } from '@/lib/documentStore'

// OpenAI default model
const DEFAULT_OPENAI_MODEL = 'gpt-3.5-turbo'
// Anthropic default model
const DEFAULT_ANTHROPIC_MODEL = 'claude-3-sonnet-20240229'

// Define both handler methods explicitly with named exports
export async function POST(req: NextRequest) {
  try {
    // Parse the request
    const body = await req.json()
    const { documentId, message, apiKeyConfig } = body

    console.log(`Chat API received request for document ID: ${documentId}`)

    if (!documentId || !message || !apiKeyConfig) {
      return NextResponse.json(
        {
          error: 'Document ID, message, and API key configuration are required',
        },
        { status: 400 }
      )
    }

    const document = getDocument(documentId)

    if (!document) {
      console.error(`Document with ID ${documentId} not found in chat API`)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (!document.pageContents || document.pageContents.length === 0) {
      console.error(`Document ${documentId} has no page contents`)
      return NextResponse.json(
        { error: 'Document has no content to analyze' },
        { status: 400 }
      )
    }

    console.log(
      `Document found: ${document.name}, pages: ${document.pageCount}, content length: ${document.pageContents.length}`
    )

    // Set up model based on provider and selected model
    let model
    if (apiKeyConfig.provider === 'openai') {
      const modelName = apiKeyConfig.model || DEFAULT_OPENAI_MODEL
      model = new ChatOpenAI({
        apiKey: apiKeyConfig.apiKey,
        modelName: modelName,
        temperature: 0,
      })
    } else {
      const modelName = apiKeyConfig.model || DEFAULT_ANTHROPIC_MODEL
      model = new ChatAnthropic({
        apiKey: apiKeyConfig.apiKey,
        modelName: modelName,
        temperature: 0,
      })
    }

    // Prepare document text for retrieval
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 100,
    })

    // Split text into chunks with metadata for page reference
    const docs: Document[] = []
    try {
      for (let i = 0; i < document.pageContents.length; i++) {
        const pageContent = document.pageContents[i]
        if (!pageContent) {
          console.warn(`Empty page content found at index ${i}`)
          continue
        }
        const chunks = await textSplitter.createDocuments(
          [pageContent],
          [{ pageNumber: i + 1 }]
        )
        docs.push(...chunks)
      }

      if (docs.length === 0) {
        console.error('No valid document chunks were created')
        return NextResponse.json(
          { error: 'Failed to process document content' },
          { status: 500 }
        )
      }
    } catch (error) {
      console.error('Error processing document chunks:', error)
      return NextResponse.json(
        { error: 'Failed to process document content' },
        { status: 500 }
      )
    }

    // Create a simple in-memory vector store with fake embeddings
    const vectorStore = await MemoryVectorStore.fromDocuments(
      docs,
      new FakeEmbeddings()
    )

    // Use the vector store as a retriever
    const retriever = vectorStore.asRetriever(4) // Get top 4 most relevant chunks

    // Get relevant documents for the query
    const relevantDocs = await retriever.invoke(message)

    // Format the context from relevant documents
    const context = relevantDocs
      .map((doc: Document) => doc.pageContent)
      .join('\n\n')

    // Format the prompt with context and instruction to cite sources
    const prompt = `
    You are an AI assistant that helps users understand PDF documents.
    
    CONTEXT:
    ${context}
    
    USER QUESTION:
    ${message}
    
    Provide a helpful response based solely on the context above. 
    If you don't know the answer based on the provided context, say so.
    Be detailed but concise, and make sure to cite the page numbers where you found the information.
    Format your response in Markdown.
    `

    // Generate response
    const response = await model.invoke(prompt)

    // Extract references from relevant docs
    const references: DocumentReference[] = relevantDocs.map(
      (doc: Document) => ({
        pageNumber: doc.metadata.pageNumber as number,
        text: doc.pageContent.substring(0, 150), // Truncate for display
      })
    )

    return NextResponse.json({
      response: typeof response === 'string' ? response : response.content,
      references,
    })
  } catch (error) {
    console.error('Error in chat processing:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to process chat request: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// Add a GET handler for completeness
export async function GET() {
  return NextResponse.json(
    { message: 'Chat API is running. Use POST to send messages.' },
    { status: 200 }
  )
}
