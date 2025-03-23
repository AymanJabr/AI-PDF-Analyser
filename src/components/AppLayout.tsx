'use client'

import { useState } from 'react'
import { Brain, FileText, Settings } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs'
import DocumentUploader from './DocumentUploader'
import ApiKeyConfig from './ApiKeyConfig'
import ChatInterface from './ChatInterface'
import DocumentPreview from './DocumentPreview'
import { ApiKeyConfig as ApiKeyConfigType, ProcessedDocument } from '@/types'

export default function AppLayout() {
  const [activeTab, setActiveTab] = useState('upload')
  const [documentId, setDocumentId] = useState<string | null>(null)
  const [document, setDocument] = useState<ProcessedDocument | null>(null)
  const [apiKeyConfig, setApiKeyConfig] = useState<ApiKeyConfigType | null>(
    null
  )

  const handleDocumentProcessed = async (docId: string) => {
    setDocumentId(docId)

    // Fetch document details
    try {
      const res = await fetch(`/api/analyze?documentId=${docId}`)
      if (res.ok) {
        const docData = await res.json()
        setDocument(docData)
        setActiveTab('chat')
      }
    } catch (error) {
      console.error('Error fetching document:', error)
    }
  }

  const handleApiKeyConfigured = (config: ApiKeyConfigType) => {
    setApiKeyConfig(config)
    if (documentId) {
      setActiveTab('chat')
    }
  }

  return (
    <div className='flex flex-col min-h-screen bg-gray-50'>
      <header className='bg-white border-b sticky top-0 z-10'>
        <div className='max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8'>
          <div className='flex justify-between items-center'>
            <div className='flex items-center'>
              <Brain className='h-8 w-8 text-blue-500 mr-2' />
              <h1 className='text-xl font-bold text-gray-800'>PDF Analyzer</h1>
            </div>
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
                className='flex-1 flex items-center justify-center min-w-[120px]'
                disabled={false}
              >
                <FileText className='h-4 w-4 mr-2' />
                Upload Document
              </TabsTrigger>

              <TabsTrigger
                value='chat'
                className='flex-1 flex items-center justify-center min-w-[120px]'
                disabled={!documentId || !apiKeyConfig}
              >
                <Brain className='h-4 w-4 mr-2' />
                Chat with Document
              </TabsTrigger>

              <TabsTrigger
                value='settings'
                className='flex-1 flex items-center justify-center min-w-[120px]'
                disabled={false}
              >
                <Settings className='h-4 w-4 mr-2' />
                API Settings
              </TabsTrigger>
            </TabsList>

            <div className='bg-white p-4 sm:p-6 rounded-lg shadow'>
              <TabsContent value='upload'>
                <div className='max-w-3xl mx-auto py-4'>
                  <h2 className='text-lg font-medium mb-4 text-center'>
                    Upload a PDF Document
                  </h2>
                  <DocumentUploader
                    onDocumentProcessed={handleDocumentProcessed}
                  />
                </div>
              </TabsContent>

              <TabsContent value='chat' className='w-full'>
                {document && apiKeyConfig ? (
                  <div className='flex flex-col lg:flex-row gap-4 h-[70vh] w-full'>
                    <div className='w-full lg:w-1/2 h-[30vh] lg:h-full'>
                      <DocumentPreview document={document} />
                    </div>
                    <div className='w-full lg:w-1/2 h-[40vh] lg:h-full border rounded-lg overflow-hidden bg-white'>
                      <ChatInterface
                        documentId={documentId as string}
                        apiKeyConfig={apiKeyConfig}
                      />
                    </div>
                  </div>
                ) : (
                  <div className='py-10 text-center'>
                    <p className='text-gray-500'>
                      {!document
                        ? 'Please upload a document first'
                        : 'Please configure your API settings'}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value='settings'>
                <div className='max-w-3xl mx-auto py-4'>
                  <h2 className='text-lg font-medium mb-4 text-center'>
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
          <p className='text-center text-sm text-gray-500'>
            PDF Analyzer - AI-powered document analysis
          </p>
        </div>
      </footer>
    </div>
  )
}
