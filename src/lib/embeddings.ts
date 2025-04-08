/**
 * Direct implementation of Voyage AI embeddings API
 */

export interface VoyageEmbeddingResponse {
    object: string;
    data: Array<{
        object: string;
        embedding: number[];
        index: number;
    }>;
    model: string;
    usage: {
        total_tokens: number;
    };
}

export class VoyageEmbeddings {
    private apiKey: string;
    private model: string;
    private inputType: 'query' | 'document' | null;
    private outputDimension: number | null;
    private outputDtype: 'float' | 'int8' | 'uint8' | 'binary' | 'ubinary';

    constructor(
        apiKey: string,
        options: {
            model?: string;
            inputType?: 'query' | 'document' | null;
            outputDimension?: number | null;
            outputDtype?: 'float' | 'int8' | 'uint8' | 'binary' | 'ubinary';
        } = {}
    ) {
        this.apiKey = apiKey;
        this.model = options.model || 'voyage-3-large';
        this.inputType = options.inputType || null;
        this.outputDimension = options.outputDimension || null;
        this.outputDtype = options.outputDtype || 'float';
    }

    /**
     * Embed a single text string
     */
    async embedQuery(text: string): Promise<number[]> {
        const response = await this.embedTexts([text]);
        return response.data[0].embedding;
    }

    /**
     * Embed multiple text strings
     */
    async embedDocuments(texts: string[]): Promise<number[][]> {
        const response = await this.embedTexts(texts);
        return response.data.map(item => item.embedding);
    }

    /**
     * Core method to call the Voyage AI API
     */
    private async embedTexts(texts: string[]): Promise<VoyageEmbeddingResponse> {
        try {
            // Check constraints
            if (texts.length > 128) {
                throw new Error('Maximum of 128 texts can be embedded at once');
            }

            const response = await fetch('https://api.voyageai.com/v1/embeddings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.apiKey}`,
                },
                body: JSON.stringify({
                    input: texts,
                    model: this.model,
                    input_type: this.inputType,
                    output_dimension: this.outputDimension,
                    output_dtype: this.outputDtype,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Voyage AI API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            return await response.json() as VoyageEmbeddingResponse;
        } catch (error) {
            console.error('Error getting Voyage AI embeddings:', error);
            throw error;
        }
    }
} 