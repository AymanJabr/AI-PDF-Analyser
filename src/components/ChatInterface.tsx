'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, FileText, AlertTriangle } from 'lucide-react'
import { Message, DocumentReference, ApiKeyConfig } from '@/types'
import ReactMarkdown from 'react-markdown'
import { parseContextLengthError, estimateTokens } from '@/lib/utils'
import ContextLengthErrorModal from './ContextLengthErrorModal'

interface ChatInterfaceProps {
  documentId: string
  apiKeyConfig: ApiKeyConfig
  onReferenceClick?: (reference: DocumentReference) => void
}

export default function ChatInterface({
  documentId,
  apiKeyConfig,
  onReferenceClick,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [contextError, setContextError] = useState<{
    maxTokens: number;
    usedTokens: number;
  } | null>(null)
  const [tokenUsage, setTokenUsage] = useState({
    estimatedUsage: 0
  })
  const [documentText, setDocumentText] = useState<string>('')

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Fetch document text to estimate token usage
  useEffect(() => {
    const fetchDocumentText = async () => {
      try {
        const response = await fetch(`/api/analyze?documentId=${documentId}`)
        if (!response.ok) throw new Error('Failed to fetch document')
        const data = await response.json()
        setDocumentText(data.text || '')
      } catch (err) {
        console.error('Error fetching document text:', err)
      }
    }

    fetchDocumentText()
  }, [documentId])

  // Update token usage when messages or document text changes
  useEffect(() => {
    let total = 0

    // Count tokens in messages
    messages.forEach(msg => {
      total += estimateTokens(msg.content)
    })

    // Add estimated tokens from current input
    total += estimateTokens(input)

    // Add estimated tokens from document
    if (documentText) {
      total += estimateTokens(documentText)
    }

    setTokenUsage({
      estimatedUsage: total
    })
  }, [messages, input, documentText])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    // Clear any previous errors
    setContextError(null)

    const userMessage: Message = {
      role: 'user',
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      console.log(`Sending chat request for document ID: ${documentId}`)

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          documentId,
          message: input,
          apiKeyConfig,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        console.error('API error:', response.status, errorData)

        let errorMessage = `Error: ${response.status} ${response.statusText}`

        if (response.status === 404) {
          errorMessage =
            'Document not found. This might be due to the server restarting. Please try uploading your document again.'
        } else if (errorData?.error) {
          errorMessage = errorData.error

          // Check if it's a context length error
          const contextLengthError = parseContextLengthError(errorData.error)
          if (contextLengthError) {
            setContextError({
              maxTokens: contextLengthError.maxTokens,
              usedTokens: contextLengthError.usedTokens
            })

            // Don't throw - we'll handle this specially
            setIsLoading(false)
            return
          }
        }

        throw new Error(errorMessage)
      }

      const data = await response.json()

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        references: data.references,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      // Add error message
      console.error('Chat error:', error)

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error while processing your request: ${error instanceof Error ? error.message : String(error)
            }. Please try again or upload your document again if the problem persists.`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  // Handle keyboard events for textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault()
      handleSubmit(e as unknown as React.FormEvent)
    }
  }

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user'

    return (
      <div
        key={index}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3`}
      >
        <div
          className={`max-w-[85%] sm:max-w-[75%] rounded-lg px-3 py-2 ${isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'
            }`}
        >
          <div className='prose prose-sm max-w-none'>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>

          {message.references && message.references.length > 0 && (
            <div className='mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600'>
              <p className='font-semibold mb-1'>References:</p>
              <ul className='space-y-1'>
                {message.references.map((ref: DocumentReference, i: number) => (
                  <li key={i}>
                    <button
                      onClick={() => onReferenceClick?.(ref)}
                      className='flex items-start hover:bg-gray-200 p-1 rounded w-full text-left'
                    >
                      <FileText className='h-3 w-3 mr-1 mt-0.5 flex-shrink-0' />
                      <span className='text-xs'>
                        Page {ref.pageNumber}: {ref.text.substring(0, 40)}
                        {ref.text.length > 40 ? '...' : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col h-full'>
      {/* Use the new Context Length Error Modal component */}
      {contextError && (
        <ContextLengthErrorModal
          maxTokens={contextError.maxTokens}
          usedTokens={contextError.usedTokens}
          onClose={() => setContextError(null)}
        />
      )}

      <div className='flex-1 overflow-y-auto p-2 sm:p-4 space-y-3'>
        {messages.length === 0 ? (
          <div className='flex items-center justify-center h-full text-gray-700'>
            <div className='text-center'>
              <FileText className='h-8 w-8 mx-auto mb-2 text-gray-600' />
              <p className='text-sm'>Ask a question about the document</p>
            </div>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        {isLoading && (
          <div className='flex justify-start mb-3'>
            <div className='bg-gray-100 rounded-lg px-3 py-2 flex items-center space-x-2'>
              <Loader2 className='h-4 w-4 animate-spin text-gray-700' />
              <span className='text-gray-700 text-xs sm:text-sm'>
                Thinking...
              </span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className='border-t p-2 sm:p-4'>
        <form onSubmit={handleSubmit} className='flex flex-col space-y-2'>
          <div className="relative flex-1">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder='Ask a question about the document...'
              className='w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-gray-600 text-gray-900 min-h-[60px] resize-none'
              disabled={isLoading}
              rows={3}
            />
            <div className="flex justify-between items-center text-xs text-gray-500 mt-1">
              <div>Press Ctrl+Enter to send</div>
              <div className="text-gray-600">
                Estimated token usage: {tokenUsage.estimatedUsage.toLocaleString()}
              </div>
            </div>
          </div>
          <button
            type='submit'
            disabled={isLoading || !input.trim()}
            className='self-end bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70'
          >
            {isLoading ? (
              <Loader2 className='h-4 w-4 sm:h-5 sm:w-5 animate-spin' />
            ) : (
              <Send className='h-4 w-4 sm:h-5 sm:w-5' />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
