import { NextRequest, NextResponse } from 'next/server'
import { ModelInfo } from '@/types'

// Default models for each provider if we can't fetch them dynamically
const DEFAULT_MODELS: Record<string, ModelInfo[]> = {
  openai: [
    { id: 'gpt-3.5-turbo', name: 'gpt-3.5-turbo' },
    { id: 'gpt-4', name: 'gpt-4' },
    { id: 'gpt-4-turbo', name: 'gpt-4-turbo' },
  ],
  anthropic: [
    { id: 'claude-3-opus-20240229', name: 'claude-3-opus-20240229' },
    { id: 'claude-3-sonnet-20240229', name: 'claude-3-sonnet-20240229' },
    { id: 'claude-3-haiku-20240307', name: 'claude-3-haiku-20240307' },
  ],
}

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

  // If no API key, return default models
  if (!apiKey) {
    return NextResponse.json({
      models: DEFAULT_MODELS[provider] || [],
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

    // Return defaults in case of error
    return NextResponse.json({
      models: DEFAULT_MODELS[provider] || [],
      error: 'Could not fetch models. Using defaults.',
    })
  }
}

async function fetchOpenAIModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const data = await response.json()

    // Define interface for OpenAI API response
    interface OpenAIModel {
      id: string;
      object: string;
      created: number;
      owned_by: string;
    }
    
    interface OpenAIModelsResponse {
      data: OpenAIModel[];
      object: string;
    }
    
    const responseData = data as OpenAIModelsResponse;
    
    // Filter to include only text-based chat models appropriate for PDF analysis
    const chatModels = responseData.data
      .filter((model) => {
        const modelId = model.id.toLowerCase();
        
        // Include base GPT models that support chat
        const isGptModel = modelId.includes('gpt');
        
        // Exclude models not suitable for PDF text analysis
        const isExcluded = 
          modelId.includes('instruct') || // Older instruction models
          modelId.includes('embedding') || // Embedding models
          modelId.includes('-if-') ||     // Instruction-following variants
          modelId.includes('vision') ||   // Vision models
          modelId.includes('audio') ||    // Audio models
          modelId.includes('whisper') ||  // Speech-to-text models
          modelId.includes('dalle') ||    // Image generation models
          modelId.includes('tts');        // Text-to-speech models
          
        return isGptModel && !isExcluded;
      })
      .map((model): ModelInfo => ({
        id: model.id,
        name: model.id,
      }))
      // Sort newest to oldest
      .sort((a, b) => {
        // Sort GPT-4 models first, then GPT-3.5, then others
        if (a.id.includes('gpt-4') && !b.id.includes('gpt-4')) return -1;
        if (!a.id.includes('gpt-4') && b.id.includes('gpt-4')) return 1;
        return b.id.localeCompare(a.id);
      });

    return chatModels.length > 0 ? chatModels : DEFAULT_MODELS.openai;
  } catch (error) {
    console.error('Error fetching OpenAI models:', error);
    return DEFAULT_MODELS.openai;
  }
}

async function fetchAnthropicModels(apiKey: string): Promise<ModelInfo[]> {
  try {
    // Anthropic doesn't have a dedicated models endpoint like OpenAI
    // We'll return the current Claude models suitable for text analysis
    // Focusing on Claude 3 models which are best for document analysis
    const models = [
      // Newer Claude 3 models - best for document analysis
      { id: 'claude-3-opus-20240229', name: 'claude-3-opus-20240229' },
      { id: 'claude-3-sonnet-20240229', name: 'claude-3-sonnet-20240229' },
      { id: 'claude-3-haiku-20240307', name: 'claude-3-haiku-20240307' },
      
      // Keep some older models for backwards compatibility
      { id: 'claude-2.1', name: 'claude-2.1' },
      
      // Removing claude-2.0 and claude-instant as they're less capable
      // for complex document analysis and likely to be deprecated
    ]

    // Attempt a simple API call to verify the key works
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307', // Using Haiku for key verification (fastest/cheapest)
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hello' }],
      }),
    })

    // If the key doesn't work, this will throw and we'll return the defaults
    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status}`)
    }

    return models
  } catch (error) {
    console.error('Error verifying Anthropic API key:', error)
    return DEFAULT_MODELS.anthropic
  }
}

