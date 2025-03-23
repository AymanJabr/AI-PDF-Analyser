'use client'

import { useState, useEffect } from 'react'
import { ApiKeyConfig as ApiKeyConfigType } from '@/types'
import { storeApiKey, getApiKey } from '@/lib/utils'
import { KeyRound, Eye, EyeOff } from 'lucide-react'

interface ApiKeyConfigProps {
  onApiKeyConfigured: (config: ApiKeyConfigType) => void
}

export default function ApiKeyConfig({
  onApiKeyConfigured,
}: ApiKeyConfigProps) {
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai')
  const [apiKey, setApiKey] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Try to load saved API key on component mount
  useEffect(() => {
    const savedOpenAIKey = getApiKey('openai')
    const savedAnthropicKey = getApiKey('anthropic')

    if (savedOpenAIKey) {
      setProvider('openai')
      setApiKey(savedOpenAIKey)
    } else if (savedAnthropicKey) {
      setProvider('anthropic')
      setApiKey(savedAnthropicKey)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!apiKey) {
      setError('Please enter your API key')
      return
    }

    try {
      // Store API key in localStorage
      storeApiKey(provider, apiKey)

      // Notify parent component
      onApiKeyConfigured({
        provider,
        apiKey,
      })

      setError(null)
    } catch (err) {
      setError(`Failed to save API key: ${err}`)
    }
  }

  return (
    <div className='w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200'>
      <div className='flex items-center mb-4'>
        <KeyRound className='h-5 w-5 text-gray-500 mr-2' />
        <h2 className='text-lg font-medium'>Configure API Key</h2>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='block text-sm font-medium text-gray-700 mb-1'>
            AI Provider
          </label>
          <div className='flex space-x-4'>
            <label className='flex items-center'>
              <input
                type='radio'
                value='openai'
                checked={provider === 'openai'}
                onChange={() => setProvider('openai')}
                className='h-4 w-4 text-blue-600 focus:ring-blue-500'
              />
              <span className='ml-2 text-sm text-gray-700'>OpenAI</span>
            </label>
            <label className='flex items-center'>
              <input
                type='radio'
                value='anthropic'
                checked={provider === 'anthropic'}
                onChange={() => setProvider('anthropic')}
                className='h-4 w-4 text-blue-600 focus:ring-blue-500'
              />
              <span className='ml-2 text-sm text-gray-700'>Anthropic</span>
            </label>
          </div>
        </div>

        <div className='relative'>
          <label
            htmlFor='apiKey'
            className='block text-sm font-medium text-gray-700 mb-1'
          >
            API Key
          </label>
          <div className='relative'>
            <input
              id='apiKey'
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder='Enter your API key'
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm'
            />
            <button
              type='button'
              onClick={() => setShowApiKey(!showApiKey)}
              className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600'
            >
              {showApiKey ? (
                <EyeOff className='h-4 w-4' />
              ) : (
                <Eye className='h-4 w-4' />
              )}
            </button>
          </div>
        </div>

        {error && <div className='text-red-500 text-sm'>{error}</div>}

        <button
          type='submit'
          className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
        >
          Save API Key
        </button>
      </form>
    </div>
  )
}
