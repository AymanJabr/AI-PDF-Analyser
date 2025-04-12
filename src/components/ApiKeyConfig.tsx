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
  const [voyageApiKey, setVoyageApiKey] = useState('')
  const [model, setModel] = useState<string>('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [showVoyageApiKey, setShowVoyageApiKey] = useState(false)
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
      setModels([])

      try {
        // Use POST method instead of GET to avoid API keys in URL
        const response = await fetch('/api/models', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: providerName,
            apiKey: key,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || `Error fetching models: ${response.status}`)
        }

        if (data.error) {
          throw new Error(data.error)
        }

        setModels(data.models || [])

        // Set default model if models array is not empty
        if (data.models && data.models.length > 0) {
          setModel(data.models[0].id)
        } else {
          throw new Error('No models available for your account')
        }
      } catch (err) {
        console.error('Error fetching models:', err)
        setError(err instanceof Error ? err.message : String(err))
        setModels([])
        setModel('')
      } finally {
        setIsLoadingModels(false)
      }
    },
    []
  )

  // Try to load saved API key on component mount
  useEffect(() => {
    const savedOpenAIKey = getApiKey('openai')
    const savedAnthropicKey = getApiKey('anthropic')
    const savedVoyageKey = getApiKey('voyage')

    if (savedOpenAIKey) {
      setProvider('openai')
      setApiKey(savedOpenAIKey)
      fetchModels('openai', savedOpenAIKey)
    } else if (savedAnthropicKey) {
      setProvider('anthropic')
      setApiKey(savedAnthropicKey)
      if (savedVoyageKey) {
        setVoyageApiKey(savedVoyageKey)
      }
      fetchModels('anthropic', savedAnthropicKey)
    }
  }, [fetchModels])

  // Handle provider change
  const handleProviderChange = (newProvider: 'openai' | 'anthropic') => {
    setProvider(newProvider)
    setModel('') // Reset model when changing provider

    // Load the saved API key for the selected provider, if available
    const savedKey = getApiKey(newProvider)
    if (savedKey) {
      setApiKey(savedKey)
      fetchModels(newProvider, savedKey)
    } else {
      // Clear API key input and models if no saved key exists for this provider
      setApiKey('')
      setModels([])
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
    setError(null)
    setSuccess(null)

    if (!apiKey) {
      setError('Please enter an API key')
      return
    }

    if (provider === 'anthropic' && !voyageApiKey) {
      setError('Voyage AI API key is required for Anthropic provider')
      return
    }

    if (!model) {
      setError('Please select a model')
      return
    }

    // Store API keys in session storage
    storeApiKey(provider, apiKey)
    if (provider === 'anthropic') {
      storeApiKey('voyage', voyageApiKey)
    }

    // Create config object
    const config: ApiKeyConfigType = {
      provider,
      apiKey,
      model,
    }

    // Add Voyage API key if using Anthropic
    if (provider === 'anthropic') {
      config.voyageApiKey = voyageApiKey
    }

    // Notify parent component
    onApiKeyConfigured(config)

    setSuccess('API configuration saved successfully')
  }

  const handleClearApiKeys = () => {
    // Clear from session storage
    sessionStorage.removeItem(`apiKey_openai`)
    sessionStorage.removeItem(`apiKey_anthropic`)

    // Reset state
    setApiKey('')
    setModel('')
    setModels([])
    setVoyageApiKey('')

    // Show success message
    setSuccess('API keys cleared successfully')
    setError(null)

    // Clear success message after 3 seconds
    setTimeout(() => {
      setSuccess(null)
    }, 3000)
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
              className='w-full px-3 py-2 pr-8 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm placeholder:text-gray-600 text-gray-900'
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
          <div className="mt-1 text-xs text-gray-600">
            {provider === 'openai' ? (
              <span>
                Get your OpenAI API key from{' '}
                <a
                  href="https://platform.openai.com/api-keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  OpenAI Platform
                </a>
              </span>
            ) : (
              <span>
                Get your Anthropic API key from{' '}
                <a
                  href="https://console.anthropic.com/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Anthropic Console
                </a>
              </span>
            )}
          </div>
        </div>

        {provider === 'anthropic' && (
          <div className="space-y-2">
            <label
              htmlFor='voyageApiKey'
              className='block text-sm font-medium text-gray-900 mb-1'
            >
              Voyage AI API Key
            </label>
            <div className="relative">
              <input
                id='voyageApiKey'
                type={showVoyageApiKey ? 'text' : 'password'}
                value={voyageApiKey}
                onChange={(e) => setVoyageApiKey(e.target.value)}
                placeholder='Enter your Voyage AI API key'
                className='w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm placeholder:text-gray-600 text-gray-900'
              />
              <button
                type='button'
                onClick={() => setShowVoyageApiKey(!showVoyageApiKey)}
                className='absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800'
              >
                {showVoyageApiKey ? (
                  <EyeOff className='h-4 w-4' />
                ) : (
                  <Eye className='h-4 w-4' />
                )}
              </button>
            </div>
            <p className='mt-1 text-xs text-gray-700'>
              Required for Anthropic provider. Get your key at{' '}
              <a
                href="https://dashboard.voyageai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                Voyage AI Dashboard
              </a>
            </p>
          </div>
        )}

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

        {error && (
          <div className='mt-2 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-200'>
            {error}
          </div>
        )}

        <button
          type='submit'
          disabled={!apiKey || !model || isLoadingModels}
          className='w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70'
        >
          Save API Settings
        </button>

        {success && success === 'API configuration saved successfully' && (
          <div className='mt-3 text-center text-blue-600 text-sm font-medium'>
            {success}
          </div>
        )}

        <div className='pt-2 border-t border-gray-200 mt-4'>
          <div className='flex flex-col items-center'>
            <p className='text-xs text-gray-500 mb-2'>
              API keys are automatically cleared when page is closed
            </p>
            <button
              type='button'
              onClick={handleClearApiKeys}
              className='text-sm text-gray-600 hover:text-red-600 focus:outline-none'
            >
              Clear Saved API Keys
            </button>
            {success && success === 'API keys cleared successfully' && (
              <div className='mt-2 text-center text-blue-600 text-sm font-medium'>
                {success}
              </div>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
