import { NextRequest, NextResponse } from 'next/server'
import { ChatOpenAI } from '@langchain/openai'
import { ChatAnthropic } from '@langchain/anthropic'
import { RecursiveCharacterTextSplitter } from 'langchain/text_splitter'
import { Document } from 'langchain/document'
import { DocumentReference } from '@/types'
import { OpenAIEmbeddings } from '@langchain/openai'
import { VoyageEmbeddings } from '@/lib/embeddings'
import { getDocument } from '@/lib/documentStore'
import { getApiKey } from '@/lib/utils'

// OpenAI default model
const DEFAULT_OPENAI_MODEL = 'gpt-3.5-turbo'
// Anthropic default model
const DEFAULT_ANTHROPIC_MODEL = 'claude-3-sonnet-20240229'

// Simple in-memory vector store implementation
class SimpleVectorStore {
  private documents: Document[] = [];
  private embeddings: number[][] = [];
  private provider: 'openai' | 'anthropic';
  private apiKey: string;
  private voyageApiKey?: string;

  constructor(
    documents: Document[],
    embeddings: number[][],
    provider: 'openai' | 'anthropic',
    apiKey: string,
    voyageApiKey?: string
  ) {
    this.documents = documents;
    this.embeddings = embeddings;
    this.provider = provider;
    this.apiKey = apiKey;
    this.voyageApiKey = voyageApiKey;
  }

  async similaritySearch(query: string, k: number = 4): Promise<Document[]> {
    // Get query embedding
    let queryEmbedding: number[];

    if (this.embeddings.length > 0) {
      // Use the same embedding provider that was used for the documents
      const embeddingProvider = this.getEmbeddingProvider();
      queryEmbedding = await embeddingProvider.embedQuery(query);
    } else {
      throw new Error('No documents in vector store');
    }

    // Calculate cosine similarity
    const similarities = this.embeddings.map((docEmbedding, index) => {
      return {
        index,
        similarity: this.cosineSimilarity(queryEmbedding, docEmbedding)
      };
    });

    // Sort by similarity (descending)
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Return top k documents
    return similarities.slice(0, k).map(item => this.documents[item.index]);
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  private getEmbeddingProvider() {
    if (this.provider === 'openai') {
      return new OpenAIEmbeddings({
        apiKey: this.apiKey,
      });
    } else {
      if (!this.voyageApiKey) {
        throw new Error('Voyage API key is required for Anthropic provider');
      }
      return new VoyageEmbeddings(this.voyageApiKey, {
        model: 'voyage-3-large',
        inputType: 'query'
      });
    }
  }
}

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

    // Set up embeddings based on provider
    let documentEmbeddings: number[][] = [];

    if (apiKeyConfig.provider === 'openai') {
      const embeddings = new OpenAIEmbeddings({
        apiKey: apiKeyConfig.apiKey,
      });
      documentEmbeddings = await embeddings.embedDocuments(
        docs.map(doc => doc.pageContent)
      );
    } else {
      // For Anthropic, we need to get the Voyage API key
      const voyageApiKey = apiKeyConfig.voyageApiKey || getApiKey('voyage');

      if (!voyageApiKey) {
        return NextResponse.json(
          { error: 'Voyage AI API key is required for Anthropic provider' },
          { status: 400 }
        );
      }

      const embeddings = new VoyageEmbeddings(voyageApiKey, {
        model: 'voyage-3-large',
        inputType: 'document'
      });
      documentEmbeddings = await embeddings.embedDocuments(
        docs.map(doc => doc.pageContent)
      );
    }

    // Create our custom vector store
    const vectorStore = new SimpleVectorStore(
      docs,
      documentEmbeddings,
      apiKeyConfig.provider,
      apiKeyConfig.apiKey,
      apiKeyConfig.voyageApiKey
    );

    // Get relevant documents for the query
    const relevantDocs = await vectorStore.similaritySearch(message, 100);

    // Format the context from relevant documents with explicit page numbers
    const context = relevantDocs
      .map((doc: Document) =>
        `PAGE ${doc.metadata.pageNumber}\n${doc.pageContent}`
      )
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
    Be detailed but concise.
    
    IMPORTANT: When citing information, use ONLY the exact page numbers as provided in the context (marked as [PAGE X]).
    Always cite the source page number when you reference information from the context.
    ONLY cite page numbers that are explicitly provided in the context sections above.
    Format your response in Markdown.
    `

    // Generate response
    const response = await model.invoke(prompt)

    // Extract references from relevant docs with improved relevance
    const references: DocumentReference[] = relevantDocs.map(
      (doc: Document) => {
        // Find the most relevant part of the document by looking for keyword matches
        // or use the beginning if no clear relevance signals
        const content = doc.pageContent;
        let relevantSection = content.substring(0, 150); // Default to first 150 chars

        // Simple heuristic: try to find parts of the content that contain words from the query
        const queryWords = message.toLowerCase().split(/\s+/).filter((word: string) =>
          word.length > 3 && !['what', 'where', 'when', 'how', 'the', 'this', 'that', 'with'].includes(word)
        );

        for (const word of queryWords) {
          const index = content.toLowerCase().indexOf(word);
          if (index >= 0) {
            // Extract text around the match, centered on the match if possible
            const start = Math.max(0, index - 75);
            const end = Math.min(content.length, index + 75);
            relevantSection = content.substring(start, end);
            break;
          }
        }

        return {
          pageNumber: doc.metadata.pageNumber as number,
          text: relevantSection, // Most relevant section for display
          fullText: content // Store full chunk for highlighting
        };
      }
    );

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
