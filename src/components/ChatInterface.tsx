import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, FileText } from 'lucide-react'
import { Message, DocumentReference, ApiKeyConfig } from '@/types'
import ReactMarkdown from 'react-markdown'

interface ChatInterfaceProps {
  documentId: string
  apiKeyConfig: ApiKeyConfig
}

export default function ChatInterface({
  documentId,
  apiKeyConfig,
}: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      role: 'user',
      content: input,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId,
          message: input,
          apiKeyConfig,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to get response')
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
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Sorry, I encountered an error while processing your request. Please try again. error: ${error}`,
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const renderMessage = (message: Message, index: number) => {
    const isUser = message.role === 'user'

    return (
      <div
        key={index}
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
      >
        <div
          className={`max-w-[75%] rounded-lg px-4 py-2 ${
            isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-800'
          }`}
        >
          <ReactMarkdown className='prose prose-sm max-w-none'>
            {message.content}
          </ReactMarkdown>

          {message.references && message.references.length > 0 && (
            <div className='mt-2 pt-2 border-t border-gray-200 text-xs text-gray-600'>
              <p className='font-semibold mb-1'>References:</p>
              <ul className='space-y-1'>
                {message.references.map((ref: DocumentReference, i: number) => (
                  <li key={i} className='flex items-start'>
                    <FileText className='h-3 w-3 mr-1 mt-0.5 flex-shrink-0' />
                    <span>
                      Page {ref.pageNumber}: {ref.text.substring(0, 60)}
                      {ref.text.length > 60 ? '...' : ''}
                    </span>
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
      <div className='flex-1 overflow-y-auto p-4 space-y-4'>
        {messages.length === 0 ? (
          <div className='flex items-center justify-center h-full text-gray-500'>
            <div className='text-center'>
              <FileText className='h-10 w-10 mx-auto mb-2 text-gray-400' />
              <p>Ask a question about the document</p>
            </div>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        {isLoading && (
          <div className='flex justify-start mb-4'>
            <div className='bg-gray-100 rounded-lg px-4 py-2 flex items-center space-x-2'>
              <Loader2 className='h-4 w-4 animate-spin text-gray-500' />
              <span className='text-gray-500 text-sm'>Thinking...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className='border-t p-4'>
        <form onSubmit={handleSubmit} className='flex space-x-2'>
          <input
            type='text'
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder='Ask a question about the document...'
            className='flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500'
            disabled={isLoading}
          />
          <button
            type='submit'
            disabled={isLoading || !input.trim()}
            className='bg-blue-500 text-white p-2 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50'
          >
            {isLoading ? (
              <Loader2 className='h-5 w-5 animate-spin' />
            ) : (
              <Send className='h-5 w-5' />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
