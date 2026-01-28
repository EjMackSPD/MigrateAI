// Embedding service - supports Voyage AI and OpenAI

export interface EmbeddingService {
  embedText(text: string): Promise<number[]>
  embedBatch(texts: string[]): Promise<number[][]>
}

export class VoyageEmbeddingService implements EmbeddingService {
  private apiKey: string
  private model: string

  constructor() {
    this.apiKey = process.env.VOYAGE_API_KEY || ''
    this.model = 'voyage-2'
  }

  async embedText(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('VOYAGE_API_KEY not configured')
    }

    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: this.model,
      }),
    })

    if (!response.ok) {
      throw new Error(`Voyage API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('VOYAGE_API_KEY not configured')
    }

    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
      }),
    })

    if (!response.ok) {
      throw new Error(`Voyage API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data.map((item: any) => item.embedding)
  }
}

export class OpenAIEmbeddingService implements EmbeddingService {
  private apiKey: string
  private model: string

  constructor() {
    this.apiKey = process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY || ''
    this.model = 'text-embedding-3-small'
  }

  async embedText(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('EMBEDDING_API_KEY or OPENAI_API_KEY not configured')
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: text,
        model: this.model,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data[0].embedding
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    if (!this.apiKey) {
      throw new Error('EMBEDDING_API_KEY or OPENAI_API_KEY not configured')
    }

    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        input: texts,
        model: this.model,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.data.map((item: any) => item.embedding)
  }
}

export function getEmbeddingService(): EmbeddingService {
  if (process.env.VOYAGE_API_KEY) {
    return new VoyageEmbeddingService()
  } else if (process.env.EMBEDDING_API_KEY || process.env.OPENAI_API_KEY) {
    return new OpenAIEmbeddingService()
  } else {
    throw new Error('No embedding service API key configured')
  }
}
