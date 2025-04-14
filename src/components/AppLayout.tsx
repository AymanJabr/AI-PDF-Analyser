'use client'

import { useState, useEffect } from 'react'
import { FileText, Settings, X, History } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import DocumentUploader from './DocumentUploader'
import ApiKeyConfig from './ApiKeyConfig'
import ChatInterface from './ChatInterface'
import DocumentPreview from './DocumentPreview'
import DocumentList from './DocumentList'
import { ApiKeyConfig as ApiKeyConfigType, ProcessedDocument, DocumentReference } from '@/types'
import Logo from './Logo'
import { getApiKey, getLastProvider, getLastModel } from '@/lib/utils'

export default function AppLayout() {
  const [activeTab, setActiveTab] = useState('upload')
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [document, setDocument] = useState<ProcessedDocument | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [apiKeyConfig, setApiKeyConfig] = useState<ApiKeyConfigType | null>(
    null
  )
  const [activeReference, setActiveReference] = useState<DocumentReference | null>(null)

  // Check for saved API settings on component mount
  useEffect(() => {
    const lastProvider = getLastProvider()
    if (lastProvider) {
      const apiKey = getApiKey(lastProvider)
      const model = getLastModel()

      if (apiKey && model) {
        const config: ApiKeyConfigType = {
          provider: lastProvider,
          apiKey,
          model,
        }

        // Add OpenAI API key if using Anthropic
        if (lastProvider === 'anthropic') {
          const openAIApiKey = getApiKey('openai')
          if (openAIApiKey) {
            config.openAIApiKey = openAIApiKey
          }
        }

        setApiKeyConfig(config)
      }
    }
  }, [])

  const handleDocumentProcessed = async (docId: string) => {
    setDocumentId(docId)
    setError(null)

    // Fetch document details
    try {
      console.log(`Fetching document with ID: ${docId}`)
      const res = await fetch(`/api/analyze?documentId=${docId}`)

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        console.error('Error fetching document:', res.status, errorData)
        setError(`Error loading document: ${errorData.error || res.statusText}`)
        return
      }

      const docData = await res.json()
      console.log(`Document fetched successfully: ${docData.name}`)
      setDocument(docData)
      setActiveTab('chat')
    } catch (error) {
      console.error('Error fetching document:', error)
      setError(
        `Failed to load document: ${error instanceof Error ? error.message : String(error)
        }`
      )
    }
  }

  const handleClearDocument = () => {
    setDocumentId(null)
    setDocument(null)
    setError(null)
    setActiveTab('upload')
  }

  const handleApiKeyConfigured = (config: ApiKeyConfigType) => {
    setApiKeyConfig(config)
    if (documentId) {
      setActiveTab('chat')
    }
  }

  const handleReferenceClick = (reference: DocumentReference) => {
    setActiveReference(reference)
  }

  return (
    <div className='flex flex-col min-h-screen bg-gray-50'>
      <header className='bg-white border-b sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center'>
            <div className='flex items-center'>
              <Logo width={32} height={32} className='mr-2' />
              <h1 className='text-xl font-bold text-gray-800'>PDF Analyzer</h1>
            </div>
            {document && (
              <button
                onClick={handleClearDocument}
                className='flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors'
              >
                <X className='h-4 w-4 mr-1' />
                Clear Document
              </button>
            )}
          </div>
        </div>
      </header>

      <main className='flex-1'>
        <div className='max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8'>
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className='space-y-4'
          >
            <TabsList className='w-full flex flex-wrap'>
              <TabsTrigger
                value='upload'
                className='flex-1 flex items-center justify-center min-w-[120px] disabled:text-gray-600'
                disabled={false}
              >
                <FileText className='h-4 w-4 mr-2' />
                Document Selection
              </TabsTrigger>

              <TabsTrigger
                value='chat'
                className='flex-1 flex items-center justify-center min-w-[120px] disabled:text-gray-600'
                disabled={!documentId || !apiKeyConfig}
              >
                <Logo width={16} height={16} className='mr-2' />
                Chat with Document
              </TabsTrigger>

              <TabsTrigger
                value='settings'
                className='flex-1 flex items-center justify-center min-w-[120px] disabled:text-gray-600'
                disabled={false}
              >
                <Settings className='h-4 w-4 mr-2' />
                API Settings
              </TabsTrigger>
            </TabsList>

            <div className='bg-white p-4 sm:p-6 rounded-lg shadow'>
              <TabsContent value='upload'>
                <div className='max-w-3xl mx-auto py-4'>
                  <h2 className='text-lg font-medium mb-4 text-center text-gray-900'>
                    Document Selection
                  </h2>
                  <div className="mb-8">
                    <h3 className='text-md font-medium mb-4 text-gray-800'>
                      Upload a New Document
                    </h3>
                    <DocumentUploader
                      onDocumentProcessed={handleDocumentProcessed}
                    />
                  </div>

                  <div className="mt-12 pt-8 border-t border-gray-200">
                    <h3 className='text-md font-medium mb-4 text-gray-800'>
                      Previously Uploaded Documents
                    </h3>
                    <DocumentList onSelectDocument={handleDocumentProcessed} />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value='chat' className='w-full'>
                {error ? (
                  <div className='py-10 text-center'>
                    <p className='text-red-500'>{error}</p>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className='mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600'
                    >
                      Try Again
                    </button>
                  </div>
                ) : document && apiKeyConfig ? (
                  <div className='flex flex-col lg:flex-row gap-4 h-[70vh] w-full'>
                    <div className='w-full lg:w-1/2 h-[30vh] lg:h-full'>
                      <DocumentPreview
                        document={document}
                        onClear={handleClearDocument}
                        activeReference={activeReference || undefined}
                      />
                    </div>
                    <div className='w-full lg:w-1/2 h-[40vh] lg:h-full border rounded-lg overflow-hidden bg-white'>
                      <ChatInterface
                        documentId={documentId as string}
                        apiKeyConfig={apiKeyConfig}
                        onReferenceClick={handleReferenceClick}
                      />
                    </div>
                  </div>
                ) : (
                  <div className='py-10 text-center'>
                    <p className='text-gray-700'>
                      {!document
                        ? 'Please upload a document first'
                        : 'Please configure your API settings'}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value='settings'>
                <div className='max-w-3xl mx-auto py-4'>
                  <h2 className='text-lg font-medium mb-4 text-center text-gray-900'>
                    API Configuration
                  </h2>
                  <ApiKeyConfig onApiKeyConfigured={handleApiKeyConfigured} />
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </main>

      <footer className='bg-white border-t py-4 mt-auto'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
          <p className='text-center text-sm text-gray-700'>
            PDF Analyzer - AI-powered document analysis
          </p>
        </div>
      </footer>
    </div>
  )
}
