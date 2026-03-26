export interface LLMProvider {
  id: number
  name: string
  base_url: string
  docs_url?: string
  created_at: string
}

export interface LLMConfig {
  id: number
  name: string
  provider_id: number
  model_name: string
  api_key_encrypted: string
  max_tokens: number
  temperature: number
  is_active: boolean
  is_default: boolean
  cost_per_1k_input_tokens: number
  cost_per_1k_output_tokens: number
  created_at: string
  updated_at: string
}

export type LLMProviderName = 'OpenAI' | 'Kimi' | 'DeepSeek'