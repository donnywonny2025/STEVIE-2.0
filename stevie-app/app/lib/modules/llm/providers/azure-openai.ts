import { BaseProvider } from '~/lib/modules/llm/base-provider';
import type { ModelInfo } from '~/lib/modules/llm/types';
import type { IProviderSetting } from '~/types/model';
import type { LanguageModelV1 } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';

export default class AzureOpenAIProvider extends BaseProvider {
  name = 'Azure OpenAI';
  getApiKeyLink = 'https://portal.azure.com/';

  config = {
    apiTokenKey: 'AZURE_OPENAI_API_KEY',
    baseUrlKey: 'AZURE_OPENAI_ENDPOINT',
  };

  staticModels: ModelInfo[] = [
    { name: 'o4-mini', label: 'GPT-4o Mini (Azure)', provider: 'Azure OpenAI', maxTokenAllowed: 128000 },
    { name: 'gpt-4o', label: 'GPT-4o (Azure)', provider: 'Azure OpenAI', maxTokenAllowed: 128000 },
    { name: 'gpt-4o-mini', label: 'GPT-4o Mini (Azure)', provider: 'Azure OpenAI', maxTokenAllowed: 128000 },
    { name: 'gpt-4-turbo', label: 'GPT-4 Turbo (Azure)', provider: 'Azure OpenAI', maxTokenAllowed: 128000 },
    { name: 'gpt-35-turbo', label: 'GPT-3.5 Turbo (Azure)', provider: 'Azure OpenAI', maxTokenAllowed: 16384 },
  ];

  getModelInstance(options: {
    model: string;
    serverEnv: Env;
    apiKeys?: Record<string, string>;
    providerSettings?: Record<string, IProviderSetting>;
  }): LanguageModelV1 {
    const { model, serverEnv, apiKeys, providerSettings } = options;

    const { baseUrl, apiKey } = this.getProviderBaseUrlAndKey({
      apiKeys,
      providerSettings: providerSettings?.[this.name],
      serverEnv: serverEnv as any,
      defaultBaseUrlKey: 'AZURE_OPENAI_ENDPOINT',
      defaultApiTokenKey: 'AZURE_OPENAI_API_KEY',
    });

    if (!apiKey || !baseUrl) {
      throw new Error(`Missing API key or endpoint for ${this.name} provider. Please check AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT environment variables.`);
    }

    // Extract deployment name and API version from environment or settings
    const deploymentName = (providerSettings as any)?.deploymentName || 
                          serverEnv?.AZURE_OPENAI_DEPLOYMENT_NAME || 
                          process?.env?.AZURE_OPENAI_DEPLOYMENT_NAME || 
                          'o4-mini';
    
    const apiVersion = (providerSettings as any)?.apiVersion || 
                      serverEnv?.AZURE_OPENAI_API_VERSION || 
                      process?.env?.AZURE_OPENAI_API_VERSION || 
                      '2024-12-01-preview';

    // Construct Azure OpenAI endpoint URL - the base URL format for Azure OpenAI
    const azureEndpoint = `${baseUrl}/openai/deployments/${deploymentName}`;

    console.log(`[Azure OpenAI] Using endpoint: ${azureEndpoint} with API version: ${apiVersion}`);

    // Use createOpenAI with Azure configuration and custom fetch to handle api-key header
    const azureOpenAI = createOpenAI({
      baseURL: azureEndpoint,
      apiKey,
      defaultQuery: {
        'api-version': apiVersion,
      },
      fetch: async (url, options = {}) => {
        // Override headers to use Azure's api-key format
        const headers = {
          ...options.headers,
          'api-key': apiKey,
          'Content-Type': 'application/json',
        };
        
        // Remove Authorization header if present (Azure doesn't use Bearer tokens)
        delete (headers as any).Authorization;
        
        console.log(`[Azure OpenAI] Making request to: ${url}`);
        
        return fetch(url, {
          ...options,
          headers,
        }).catch((error) => {
          console.error(`[Azure OpenAI] Request failed:`, error);
          throw new Error(`Azure OpenAI request failed: ${error.message}. Please check your deployment name '${deploymentName}' exists on the Azure resource.`);
        });
      },
    });

    return azureOpenAI(model);
  }
}