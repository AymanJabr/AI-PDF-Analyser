'use client'

import { useState, useEffect, useCallback } from 'react'
import { ApiKeyConfig as ApiKeyConfigType, ModelInfo } from '@/types'
import { storeApiKey, getApiKey } from '@/lib/utils'
import { KeyRound, Eye, EyeOff, Loader2 } from 'lucide-react'

interface ApiKeyConfigProps {
  onApiKeyConfigured: (config: ApiKeyConfigType) => void
}

export default function ApiKeyConfig({
  onApiKeyConfigured,
}: ApiKeyConfigProps) {
  const [provider, setProvider] = useState<'openai' | 'anthropic'>('openai')
  const [apiKey, setApiKey] = useState('')
  const [model, setModel] = useState<string>('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isLoadingModels, setIsLoadingModels] = useState(false)
  const [models, setModels] = useState<ModelInfo[]>([])

  // Fetch models when provider or API key changes
  const fetchModels = useCallback(
    async (providerName: 'openai' | 'anthropic', key: string) => {
      if (!key) return

      setIsLoadingModels(true)
      setError(null)
      setSuccess(null)

      try {
        const response = await fetch(
          `/api/models?provider=${providerName}&apiKey=${encodeURIComponent(
            key
          )}`
        )

        if (!response.ok) {
          throw new Error(`Error fetching models: ${response.status}`)
        }

        const data = await response.json()
        setModels(data.models || [])

        // Set default model if none is selected
        if (!model && data.models && data.models.length > 0) {
          setModel(data.models[0].id)
        }
      } catch (err) {
        console.error('Error fetching models:', err)
        setError('Failed to fetch available models')
        setModels([])
      } finally {
        setIsLoadingModels(false)
      }
    },
    [model]
  )

  // Try to load saved API key on component mount
  useEffect(() => {
    const savedOpenAIKey = getApiKey('openai')
    const savedAnthropicKey = getApiKey('anthropic')

    if (savedOpenAIKey) {
      setProvider('openai')
      setApiKey(savedOpenAIKey)
      fetchModels('openai', savedOpenAIKey)
    } else if (savedAnthropicKey) {
      setProvider('anthropic')
      setApiKey(savedAnthropicKey)
      fetchModels('anthropic', savedAnthropicKey)
    }
  }, [fetchModels])

  // Handle provider change
  const handleProviderChange = (newProvider: 'openai' | 'anthropic') => {
    setProvider(newProvider)
    setModel('') // Reset model when changing provider

    // If API key is set, fetch models for new provider
    if (apiKey) {
      fetchModels(newProvider, apiKey)
    }
  }

  // Handle API key change
  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newApiKey = e.target.value
    setApiKey(newApiKey)

    // Clear models when API key is cleared
    if (!newApiKey) {
      setModels([])
      setModel('')
    }
  }

  // Handle API key blur - fetch models when user completes entering API key
  const handleApiKeyBlur = () => {
    if (apiKey) {
      fetchModels(provider, apiKey)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!apiKey) {
      setError('Please enter your API key')
      setSuccess(null)
      return
    }

    if (!model) {
      setError('Please select a model')
      setSuccess(null)
      return
    }

    try {
      // Store API key in localStorage
      storeApiKey(provider, apiKey)

      // Notify parent component
      onApiKeyConfigured({
        provider,
        apiKey,
        model,
      })

      // Show success message
      setSuccess('API settings saved successfully!')
      setError(null)

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(null)
      }, 3000)
    } catch (err) {
      setError(`Failed to save API key: ${err}`)
      setSuccess(null)
    }
  }

  return (
    <div className='w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-sm border border-gray-200'>
      <div className='flex items-center mb-4'>
        <KeyRound className='h-5 w-5 text-gray-700 mr-2' />
        <h2 className='text-lg font-medium text-gray-900'>Configure API Key</h2>
      </div>

      <form onSubmit={handleSubmit} className='space-y-4'>
        <div>
          <label className='block text-sm font-medium text-gray-900 mb-1'>
            AI Provider
          </label>
          <div className='flex space-x-4'>
            <label className='flex items-center'>
              <input
                type='radio'
                value='openai'
                checked={provider === 'openai'}
                onChange={() => handleProviderChange('openai')}
                className='h-4 w-4 text-blue-600 focus:ring-blue-500'
              />
              <span className='ml-2 text-sm text-gray-900'>OpenAI</span>
            </label>
            <label className='flex items-center'>
              <input
                type='radio'
                value='anthropic'
                checked={provider === 'anthropic'}
                onChange={() => handleProviderChange('anthropic')}
                className='h-4 w-4 text-blue-600 focus:ring-blue-500'
              />
              <span className='ml-2 text-sm text-gray-900'>Anthropic</span>
            </label>
          </div>
        </div>

        <div className='relative'>
          <label
            htmlFor='apiKey'
            className='block text-sm font-medium text-gray-900 mb-1'
          >
            API Key
          </label>
          <div className='relative'>
            <input
              id='apiKey'
              type={showApiKey ? 'text' : 'password'}
              value={apiKey}
              onChange={handleApiKeyChange}
              onBlur={handleApiKeyBlur}
              placeholder='Enter your API key'
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm placeholder:text-gray-600 text-gray-900'
            />
            <button
              type='button'
              onClick={() => setShowApiKey(!showApiKey)}
              className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800'
            >
              {showApiKey ? (
                <EyeOff className='h-4 w-4' />
              ) : (
                <Eye className='h-4 w-4' />
              )}
            </button>
          </div>
        </div>

        <div>
          <label
            htmlFor='model'
            className='block text-sm font-medium text-gray-900 mb-1'
          >
            Model
          </label>
          <div className='relative'>
            <select
              id='model'
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={isLoadingModels || models.length === 0}
              className='w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm appearance-none text-gray-900'
            >
              {models.length === 0 ? (
                <option value=''>
                  {isLoadingModels
                    ? 'Loading models...'
                    : 'Enter API key to see models'}
                </option>
              ) : (
                <>
                  <option value=''>Select a model</option>
                  {models.map((modelInfo) => (
                    <option key={modelInfo.id} value={modelInfo.id}>
                      {modelInfo.name}
                    </option>
                  ))}
                </>
              )}
            </select>
            {isLoadingModels && (
              <div className='absolute inset-y-0 right-0 pr-3 flex items-center'>
                <Loader2 className='h-4 w-4 animate-spin text-gray-600' />
              </div>
            )}
          </div>
          <p className='mt-1 text-xs text-gray-700'>
            {provider === 'openai'
              ? 'GPT-4 models are more capable but may be slower and more expensive.'
              : 'Claude 3 Opus is the most capable model, while Haiku is faster and more affordable.'}
          </p>
        </div>

        {error && <div className='text-red-500 text-sm'>{error}</div>}

        <button
          type='submit'
          disabled={!apiKey || !model || isLoadingModels}
          className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70'
        >
          Save API Settings
        </button>

        {success && (
          <div className='mt-3 text-center text-blue-600 text-sm font-medium'>
            {success}
          </div>
        )}
      </form>
    </div>
  )
}
