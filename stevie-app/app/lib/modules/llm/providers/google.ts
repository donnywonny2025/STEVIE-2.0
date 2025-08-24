import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export default class GoogleProvider extends BaseProvider {
  name = 'Google';
  getApiKeyLink = 'https://aistudio.google.com/app/apikey';

  config = {
    apiTokenKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
  };

  // Rate limiting for Gemini API - optimized for thinking models
  private requestCount = 0;
  private lastResetTime = Date.now();
  private readonly MAX_REQUESTS_PER_MINUTE = 10; // Conservative for thinking models (2.5 Pro uses more tokens)
  private readonly MAX_REQUESTS_PER_DAY = 1000; // Conservative daily limit for free tier
  private dailyRequestCount = 0;
  private lastDayReset = new Date().getDate();
  
  // Thinking model detection
  private isThinkingModel(model: string): boolean {
    return model.includes('2.5-pro') || model.includes('thinking') || model.includes('2.0-pro');
  }

  staticModels: ModelInfo[] = [
    // Gemini 2.5 Pro Models (Latest & Most Advanced - Thinking Models)
    { name: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro 🧠 (Thinking Model - Best Quality)', provider: 'Google', maxTokenAllowed: 2097152 },
    { name: 'gemini-2.5-pro-preview-06-05', label: 'Gemini 2.5 Pro Preview 🧠 (Thinking)', provider: 'Google', maxTokenAllowed: 2097152 },
    { name: 'gemini-2.5-pro-preview-05-06', label: 'Gemini 2.5 Pro Preview 05-06 🧠', provider: 'Google', maxTokenAllowed: 2097152 },
    
    // Gemini 2.5 Flash Models (Fast & Efficient)
    { name: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Fast)', provider: 'Google', maxTokenAllowed: 1048576 },
    { name: 'gemini-2.5-flash-preview-05-20', label: 'Gemini 2.5 Flash Preview', provider: 'Google', maxTokenAllowed: 1048576 },
    { name: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (Ultra Fast)', provider: 'Google', maxTokenAllowed: 1048576 },
    
    // Gemini 2.0 Models (Advanced Features)
    { name: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', provider: 'Google', maxTokenAllowed: 1048576 },
    { name: 'gemini-2.0-flash-exp', label: 'Gemini 2.0 Flash (Experimental)', provider: 'Google', maxTokenAllowed: 1048576 },
    { name: 'gemini-2.0-pro-exp', label: 'Gemini 2.0 Pro 🧠 (Experimental Thinking)', provider: 'Google', maxTokenAllowed: 2097152 },
    {
      name: 'gemini-2.0-flash-thinking-exp-01-21',
      label: 'Gemini 2.0 Flash-thinking (Experimental)',
      provider: 'Google',
      maxTokenAllowed: 1048576,
    },
    
    // Gemini 1.5 Models (Proven & Reliable)
    { name: 'gemini-1.5-pro-latest', label: 'Gemini 1.5 Pro (Reliable)', provider: 'Google', maxTokenAllowed: 2097152 },
    { name: 'gemini-1.5-pro-002', label: 'Gemini 1.5 Pro-002', provider: 'Google', maxTokenAllowed: 2097152 },
    { name: 'gemini-1.5-flash-latest', label: 'Gemini 1.5 Flash (Recommended)', provider: 'Google', maxTokenAllowed: 1048576 },
    { name: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', provider: 'Google', maxTokenAllowed: 1048576 },
    { name: 'gemini-1.5-flash-002', label: 'Gemini 1.5 Flash-002', provider: 'Google', maxTokenAllowed: 1048576 },
    { name: 'gemini-1.5-flash-8b', label: 'Gemini 1.5 Flash-8b (Fast)', provider: 'Google', maxTokenAllowed: 1048576 },
    
    // Experimental Models
    { name: 'gemini-exp-1206', label: 'Gemini exp-1206 (Experimental)', provider: 'Google', maxTokenAllowed: 2097152 },
  ];

  private checkRateLimit(model?: string): void {
    const now = Date.now();
    const currentDay = new Date().getDate();
    
    // Reset daily counter if it's a new day
    if (currentDay !== this.lastDayReset) {
      this.dailyRequestCount = 0;
      this.lastDayReset = currentDay;
    }
    
    // Reset minute counter if a minute has passed
    if (now - this.lastResetTime > 60000) {
      this.requestCount = 0;
      this.lastResetTime = now;
    }
    
    // Stricter limits for thinking models
    const isThinking = model ? this.isThinkingModel(model) : false;
    const effectiveMinuteLimit = isThinking ? Math.floor(this.MAX_REQUESTS_PER_MINUTE * 0.7) : this.MAX_REQUESTS_PER_MINUTE;
    const effectiveDayLimit = isThinking ? Math.floor(this.MAX_REQUESTS_PER_DAY * 0.8) : this.MAX_REQUESTS_PER_DAY;
    
    // Check daily limit
    if (this.dailyRequestCount >= effectiveDayLimit) {
      throw new Error(
        `Daily request limit reached (${effectiveDayLimit}${isThinking ? ' for thinking models' : ''}). ` +
        `Thinking models use more tokens. Please wait until tomorrow or upgrade to paid plan.`
      );
    }
    
    // Check per-minute limit
    if (this.requestCount >= effectiveMinuteLimit) {
      throw new Error(
        `Rate limit exceeded (${effectiveMinuteLimit} requests per minute${isThinking ? ' for thinking models' : ''}). ` +
        `Thinking models need more processing time. Please wait a moment.`
      );
    }
    
    // Increment counters
    this.requestCount++;
    this.dailyRequestCount++;
    
    // Log thinking model usage
    if (isThinking) {
      console.log(`[Gemini Thinking Model] Using ${model} - Request ${this.requestCount}/${effectiveMinuteLimit} per minute, ${this.dailyRequestCount}/${effectiveDayLimit} per day`);
    }
  }

  async getDynamicModels(
    apiKeys?: Record<string, string>,
    settings?: IProviderSetting,
    serverEnv?: Record<string, string>,
  ): Promise<ModelInfo[]> {
    // Check rate limits before making request
    this.checkRateLimit('dynamic-model-fetch');

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: settings,
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    });

    if (!apiKey) {
      throw `Missing Api Key configuration for ${this.name} provider`;
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`, {
      headers: {
        ['Content-Type']: 'application/json',
      },
    });

    const res = (await response.json()) as any;

    const data = res.models.filter((model: any) => model.outputTokenLimit > 8000);

    return data.map((m: any) => ({
      name: m.name.replace('models/', ''),
      label: `${m.displayName} - context ${Math.floor((m.inputTokenLimit + m.outputTokenLimit) / 1000) + 'k'}`,
      provider: this.name,
      maxTokenAllowed: m.inputTokenLimit + m.outputTokenLimit || 8000,
    }));
  }

  getModelInstance(options: {
    model: string;
    serverEnv: any;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    // Check rate limits before making request - pass model name for thinking model detection
    this.checkRateLimit(model);

    const { apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: '',
      defaultApiTokenKey: 'GOOGLE_GENERATIVE_AI_API_KEY',
    });

    if (!apiKey) {
      throw new Error(`Missing API key for ${this.name} provider`);
    }

    const google = createGoogleGenerativeAI({
      apiKey,
      // Longer timeout for thinking models
      fetch: this.isThinkingModel(model) ? 
        async (url, options) => {
          console.log(`[Thinking Model] ${model} - Starting request (may take longer due to reasoning)`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for thinking
          
          try {
            const response = await fetch(url, {
              ...options,
              signal: controller.signal,
            });
            clearTimeout(timeoutId);
            return response;
          } catch (error) {
            clearTimeout(timeoutId);
            throw error;
          }
        } : undefined,
    });

    return google(model);
  }
}
