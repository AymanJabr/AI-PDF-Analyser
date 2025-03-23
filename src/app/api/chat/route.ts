import { NextRequest, NextResponse } from 'next/server'
import { OpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { Document } from 'langchain/document'
import { DocumentReference, ProcessedDocument } from '@/types'
import { FakeEmbeddings } from 'langchain/embeddings/fake'

// In-memory document storage from analyze route
// In a production app, this would be a database
declare const documents: Record<string, ProcessedDocument>

export async function POST(req: NextRequest) {
  try {
    const { documentId, message, apiKeyConfig } = await req.json()

    if (!documentId || !message || !apiKeyConfig) {
      return NextResponse.json(
        {
          error: 'Document ID, message, and API key configuration are required',
        },
        { status: 400 }
      )
    }

    const document = documents[documentId]

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Set up model based on provider
    let model
    if (apiKeyConfig.provider === 'openai') {
      model = new OpenAI({
        apiKey: apiKeyConfig.apiKey,
        modelName: 'gpt-3.5-turbo',
        temperature: 0,
      })
    } else {
      model = new ChatAnthropic({
        apiKey: apiKeyConfig.apiKey,
        modelName: 'claude-3-sonnet-20240229',
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
    for (let i = 0; i < document.pageContents.length; i++) {
      const pageContent = document.pageContents[i]
      const chunks = await textSplitter.createDocuments(
        [pageContent],
        [{ pageNumber: i + 1 }]
      )
      docs.push(...chunks)
    }

    // Create a simple in-memory vector store with fake embeddings
    // In a real app, you would use real embeddings like OpenAIEmbeddings
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
      response,
      references,
    })
  } catch (error) {
    console.error('Error in chat processing:', error)
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    )
  }
}
