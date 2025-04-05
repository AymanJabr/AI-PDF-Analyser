import { NextRequest, NextResponse } from 'next/server'
import { ModelInfo } from '@/types'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const provider = url.searchParams.get('provider') as
    | 'openai'
    | 'anthropic'
    | null
  const apiKey = url.searchParams.get('apiKey')

  if (!provider) {
    return NextResponse.json(
      { error: 'Provider parameter is required (openai or anthropic)' },
      { status: 400 }
    )
  }

  // If no API key, return empty models array
  if (!apiKey) {
    return NextResponse.json({
      models: [],
      error: 'API key is required to fetch available models'
    })
  }

  try {
    let models

    // Fetch available models based on provider
    if (provider === 'openai') {
      models = await fetchOpenAIModels(apiKey)
    } else if (provider === 'anthropic') {
      models = await fetchAnthropicModels(apiKey)
    } else {
      return NextResponse.json(
        { error: 'Invalid provider. Use "openai" or "anthropic"' },
        { status: 400 }
      )
    }

    return NextResponse.json({ models })
  } catch (error) {
    console.error(`Error fetching ${provider} models:`, error)

    // Return the actual error message to the client
    return NextResponse.json({
      models: [],
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 })
  }
}

async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  const response = await fetch('https://api.openai.com/v1/models', {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`OpenAI API error (${response.status}): ${errorData}`)
  }

  const data = await response.json()

  // Define interface for OpenAI API response
  interface OpenAIModel {
    id: string
    object: string
    created: number
    owned_by: string
  }

  interface OpenAIModelsResponse {
    data: OpenAIModel[]
    object: string
  }

  const responseData = data as OpenAIModelsResponse

  // Filter to include only text-based chat models appropriate for PDF analysis
  const chatModels = responseData.data
    .filter((model) => {
      const modelId = model.id.toLowerCase()

      // Include base GPT models that support chat
      const isGptModel = modelId.includes('gpt')

      // Exclude models not suitable for PDF text analysis
      const isExcluded =
        modelId.includes('instruct') || // Older instruction models
        modelId.includes('embedding') || // Embedding models
        modelId.includes('-if-') || // Instruction-following variants
        modelId.includes('vision') || // Vision models
        modelId.includes('audio') || // Audio models
        modelId.includes('whisper') || // Speech-to-text models
        modelId.includes('dalle') || // Image generation models
        modelId.includes('tts') || // Text-to-speech models
        modelId.includes('transcribe') || // speech-to-text transcribtion
        modelId.includes('realtime') || // streams of either text or audio
        modelId.includes('search') // search models

      return isGptModel && !isExcluded
    })
    .map(
      (model): ModelInfo => ({
        id: model.id,
        name: model.id,
      })
    )
    // Sort newest to oldest
    .sort((a, b) => {
      // Sort GPT-4 models first, then GPT-3.5, then others
      if (a.id.includes('gpt-4') && !b.id.includes('gpt-4')) return -1
      if (!a.id.includes('gpt-4') && b.id.includes('gpt-4')) return 1
      return b.id.localeCompare(a.id)
    })

  if (chatModels.length === 0) {
    throw new Error('No compatible chat models found in your OpenAI account')
  }

  return chatModels
}

async function fetchAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
  // Use the actual Anthropic models endpoint as specified in the docs
  const response = await fetch('https://api.anthropic.com/v1/models', {
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const errorData = await response.text()
    throw new Error(`Anthropic API error (${response.status}): ${errorData}`)
  }

  const data = await response.json()

  // Define interface for Anthropic API response
  interface AnthropicModel {
    id: string
    type: string
    display_name: string
    created_at: string
  }

  interface AnthropicModelsResponse {
    data: AnthropicModel[]
    has_more: boolean
    first_id?: string
  }

  // Validate response structure
  const responseData = data as AnthropicModelsResponse

  if (!responseData.data || !Array.isArray(responseData.data)) {
    throw new Error('Unexpected response format from Anthropic API')
  }

  // Map Anthropic models to our format
  return responseData.data
    .filter(model => model.type === 'model') // Ensure it's a model type
    .map(model => ({
      id: model.id,
      name: model.display_name || model.id
    }))
    // Sort to put newest models first based on created_at date
    .sort((a, b) => {
      // First, prioritize Claude 3 models
      const aIsC3 = a.id.includes('claude-3');
      const bIsC3 = b.id.includes('claude-3');

      if (aIsC3 && !bIsC3) return -1;
      if (!aIsC3 && bIsC3) return 1;

      // For models of the same "family", sort by ID which includes version/date info
      return b.id.localeCompare(a.id);
    });
}
