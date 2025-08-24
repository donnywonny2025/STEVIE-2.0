/**
 * DynamicContextManager - Adaptive Context with Smart Fallbacks
 * 
 * Implements Scout's dynamic context adaptation with intelligent fallback strategies.
 * Key features:
 * - Mid-conversation context expansion without mechanical announcements
 * - Topic pivoting with semantic distance measurement  
 * - Smart fallbacks that cost LESS, not more (fail down, not up)
 * - Hard token limits: simple=50, medium=400, complex=1200
 * - Circuit breaker pattern for repeated failures
 */

import type { SemanticAnalysis, QueryType } from './AdvancedQueryAnalyzer';
import type { ContextRelevanceScore, ContextSelectionResult } from './IntelligentContextRetrieval';

export interface ContextWindow {
  current_level: ContextLevel;
  content: string;
  token_count: number;
  domains: string[];
  components: ContextComponent[];
  fallback_strategy?: FallbackInfo;
  natural_transition?: string;
}

export interface ContextComponent {
  type: 'system_prompt' | 'user_query' | 'relevant_history' | 'technical_context' | 'file_context' | 'fallback_response';
  content: string;
  token_count: number;
  relevance_score?: number;
  source: string;
}

export interface AdaptationNeeds {
  expand: boolean;
  pivot: boolean;
  domains: string[];
  new_focus?: string;
  reason: string;
  estimated_tokens: number;
}

export interface FallbackInfo {
  strategy: 'cached_response' | 'progressive_discovery' | 'safe_default' | 'emergency_minimal' | 'circuit_breaker';
  reason: string;
  original_tokens: number;
  fallback_tokens: number;
  confidence: number;
}

export type ContextLevel = 'MINIMAL' | 'TECHNICAL' | 'COMPREHENSIVE';

// Smart fallback responses (from the strategy document)
const SMART_FALLBACK_RESPONSES = {
  classification_uncertain: {
    tokens: 50,
    response: `I'd be happy to help! To give you the best solution, could you be a bit more specific about what you're trying to accomplish?

I can help with:
• Building apps/websites
• Fixing code issues  
• Adding features
• Explaining concepts

What's your current project or challenge?`
  },

  technical_context_needed: {
    tokens: 75,
    response: `I can help with that! To provide the most accurate solution:

1. **What technology are you using?** (React, Vue, Node.js, etc.)
2. **What's the specific issue?** (error message, unexpected behavior)
3. **What did you expect to happen?**

This helps me give you exactly what you need!`
  },

  error_context_needed: {
    tokens: 85,
    response: `I can help debug that! To pinpoint the issue quickly:

1. **Share the complete error message** (including line numbers)
2. **Show the relevant code** where it's happening
3. **Describe what you were trying to do**

This way I can give you a targeted fix instead of guessing!`
  },

  project_context_needed: {
    tokens: 90,
    response: `I'd love to help build that! To create exactly what you need:

1. **What type of project?** (todo app, portfolio, dashboard, etc.)
2. **Key features you want?** (user auth, database, specific functionality)
3. **Tech preferences?** (React, vanilla JS, styling approach)

This ensures I build something perfect for your needs!`
  }
};

// Natural transition phrases for context changes
const NATURAL_TRANSITIONS = {
  simple_to_technical: [
    "Looking at this more closely,",
    "Given the specifics here,", 
    "For this particular case,",
    "Based on what you're describing,"
  ],
  
  technical_to_comprehensive: [
    "This actually touches on several things -",
    "There are a few layers to this:",
    "This connects to what we were working on before -",
    "This involves a few different pieces:"
  ],
  
  context_expansion: [
    "Ah, I see what you're working with -",
    "Given your setup,",
    "Looking at your project structure,",
    "Based on your codebase,"
  ],
  
  topic_pivot: [
    "That's a different approach -",
    "Switching gears to that,",
    "For that particular challenge,",
    "Moving to that topic,"
  ]
};

export class DynamicContextManager {
  private circuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    lastFailure: 0,
    threshold: 3,
    timeout: 5 * 60 * 1000 // 5 minutes
  };

  /**
   * Build context window with smart fallback integration
   */
  async buildContextWindow(
    analysis: SemanticAnalysis,
    relevantContext: ContextSelectionResult,
    userQuery: string,
    sessionId: string
  ): Promise<ContextWindow> {
    try {
      // Check circuit breaker first
      if (this.circuitBreakerState.isOpen) {
        console.log('🚨 Circuit breaker OPEN - forcing minimal context');
        return this.buildCircuitBreakerFallback(userQuery);
      }

      // Check if we should use a cached fallback response
      if (analysis.fallback_strategy) {
        return this.buildFallbackWindow(analysis, userQuery);
      }

      // Build normal intelligent context
      const contextWindow = await this.buildIntelligentContext(analysis, relevantContext, userQuery);
      
      // Apply hard token limits (Scout's principle)
      const limitedWindow = this.applyTokenLimits(contextWindow, analysis.query_type);
      
      // Record success for circuit breaker
      this.recordSuccess();
      
      return limitedWindow;

    } catch (error) {
      console.error('DynamicContextManager failed:', error);
      this.recordFailure();
      
      // Smart fallback - cheaper than normal operation
      return this.buildEmergencyFallback(userQuery, analysis.query_type);
    }
  }

  /**
   * Build intelligent context (normal operation)
   */
  private async buildIntelligentContext(
    analysis: SemanticAnalysis,
    relevantContext: ContextSelectionResult,
    userQuery: string
  ): Promise<ContextWindow> {
    const components: ContextComponent[] = [];
    let totalTokens = 0;

    // 1. System prompt (always included)
    const systemPrompt = this.buildSystemPrompt(analysis.context_requirements.level);
    components.push({
      type: 'system_prompt',
      content: systemPrompt,
      token_count: Math.ceil(systemPrompt.length / 4),
      source: 'system'
    });
    totalTokens += components[components.length - 1].token_count;

    // 2. User query (always included)
    components.push({
      type: 'user_query',
      content: userQuery,
      token_count: Math.ceil(userQuery.length / 4),
      source: 'user'
    });
    totalTokens += components[components.length - 1].token_count;

    // 3. Relevant history (if needed and available)
    if (analysis.context_requirements.requires_history && relevantContext.selected_messages.length > 0) {
      const historyContent = this.buildHistoryContext(relevantContext.selected_messages);
      if (historyContent) {
        components.push({
          type: 'relevant_history',
          content: historyContent,
          token_count: Math.ceil(historyContent.length / 4),
          source: 'history'
        });
        totalTokens += components[components.length - 1].token_count;
      }
    }

    // 4. Technical context (if needed)
    if (analysis.context_requirements.domains.includes('debugging') || 
        analysis.context_requirements.domains.includes('technical')) {
      const technicalContext = this.buildTechnicalContext(analysis);
      if (technicalContext) {
        components.push({
          type: 'technical_context',
          content: technicalContext,
          token_count: Math.ceil(technicalContext.length / 4),
          source: 'technical'
        });
        totalTokens += components[components.length - 1].token_count;
      }
    }

    // 5. Natural transition (if context level changed)
    const naturalTransition = this.buildNaturalTransition(analysis);

    return {
      current_level: this.mapContextLevel(analysis.context_requirements.level),
      content: components.map(c => c.content).join('\n\n'),
      token_count: totalTokens,
      domains: analysis.context_requirements.domains,
      components,
      natural_transition: naturalTransition
    };
  }

  /**
   * Build fallback window for cached responses
   */
  private buildFallbackWindow(analysis: SemanticAnalysis, userQuery: string): ContextWindow {
    const strategy = analysis.fallback_strategy!;
    console.log(`🎯 Using fallback strategy: ${strategy.strategy} (${strategy.estimated_tokens} tokens)`);
    
    // Use the cached response directly
    const component: ContextComponent = {
      type: 'fallback_response',
      content: userQuery, // The cached response will be handled separately
      token_count: strategy.estimated_tokens,
      source: 'cache'
    };

    return {
      current_level: 'MINIMAL',
      content: userQuery,
      token_count: strategy.estimated_tokens,
      domains: [],
      components: [component],
      fallback_strategy: {
        strategy: strategy.strategy,
        reason: strategy.reason,
        original_tokens: 1500, // What old system would have used
        fallback_tokens: strategy.estimated_tokens,
        confidence: 0.9
      }
    };
  }

  /**
   * Apply hard token limits (Scout's principle: never exceed limits)
   */
  private applyTokenLimits(contextWindow: ContextWindow, queryType: QueryType): ContextWindow {
    const limits = {
      'SIMPLE': 50,
      'MEDIUM': 400, 
      'COMPLEX': 1200,
      'ESCALATED': 1200
    };

    const limit = limits[queryType] || limits['MEDIUM'];
    
    if (contextWindow.token_count <= limit) {
      return contextWindow; // Within limits
    }

    console.log(`⚠️ Context exceeds limit (${contextWindow.token_count} > ${limit}), trimming...`);
    
    // Trim components in priority order (keep system prompt and user query)
    const trimmedComponents = [...contextWindow.components];
    let currentTokens = contextWindow.token_count;
    
    // Remove less important components until we're under limit
    const removalPriority = ['file_context', 'relevant_history', 'technical_context'];
    
    for (const componentType of removalPriority) {
      if (currentTokens <= limit) break;
      
      const index = trimmedComponents.findIndex(c => c.type === componentType);
      if (index !== -1) {
        const removed = trimmedComponents.splice(index, 1)[0];
        currentTokens -= removed.token_count;
        console.log(`🔄 Removed ${componentType} (${removed.token_count} tokens)`);
      }
    }

    return {
      ...contextWindow,
      components: trimmedComponents,
      content: trimmedComponents.map(c => c.content).join('\n\n'),
      token_count: currentTokens
    };
  }

  /**
   * Build emergency fallback (when everything fails)
   */
  private buildEmergencyFallback(userQuery: string, queryType: QueryType = 'SIMPLE'): ContextWindow {
    console.log('🚨 Emergency fallback activated');
    
    // Determine best fallback response
    let fallbackResponse: string;
    let tokens: number;
    
    if (this.containsTechnicalTerms(userQuery)) {
      fallbackResponse = SMART_FALLBACK_RESPONSES.technical_context_needed.response;
      tokens = SMART_FALLBACK_RESPONSES.technical_context_needed.tokens;
    } else if (this.containsErrorTerms(userQuery)) {
      fallbackResponse = SMART_FALLBACK_RESPONSES.error_context_needed.response;
      tokens = SMART_FALLBACK_RESPONSES.error_context_needed.tokens;
    } else if (this.containsCreationTerms(userQuery)) {
      fallbackResponse = SMART_FALLBACK_RESPONSES.project_context_needed.response;
      tokens = SMART_FALLBACK_RESPONSES.project_context_needed.tokens;
    } else {
      fallbackResponse = SMART_FALLBACK_RESPONSES.classification_uncertain.response;
      tokens = SMART_FALLBACK_RESPONSES.classification_uncertain.tokens;
    }

    const component: ContextComponent = {
      type: 'fallback_response',
      content: fallbackResponse,
      token_count: tokens,
      source: 'emergency'
    };

    return {
      current_level: 'MINIMAL',
      content: fallbackResponse,
      token_count: tokens,
      domains: ['emergency'],
      components: [component],
      fallback_strategy: {
        strategy: 'emergency_minimal',
        reason: 'Complete context building failure',
        original_tokens: 1500,
        fallback_tokens: tokens,
        confidence: 0.5
      }
    };
  }

  /**
   * Build circuit breaker fallback
   */
  private buildCircuitBreakerFallback(userQuery: string): ContextWindow {
    const response = `I'm having some technical difficulties with context analysis right now. Let me help you directly:

**${userQuery}**

Could you provide a bit more detail about what you're trying to accomplish? I can still help - just need a bit more specificity to give you the best solution!`;

    const tokens = Math.ceil(response.length / 4);

    return {
      current_level: 'MINIMAL',
      content: response,
      token_count: tokens,
      domains: ['circuit_breaker'],
      components: [{
        type: 'fallback_response',
        content: response,
        token_count: tokens,
        source: 'circuit_breaker'
      }],
      fallback_strategy: {
        strategy: 'circuit_breaker',
        reason: 'Circuit breaker open due to repeated failures',
        original_tokens: 1500,
        fallback_tokens: tokens,
        confidence: 0.3
      }
    };
  }

  /**
   * Build system prompt based on context level
   */
  private buildSystemPrompt(level: string): string {
    const basePrompt = "You are Steve, an intelligent web development assistant.";
    
    switch (level) {
      case 'minimal':
        return `${basePrompt} Provide helpful, concise responses. If you need more context to help properly, ask the user for clarification.`;
      
      case 'technical':
        return `${basePrompt} You're helping with a technical web development task. Provide accurate, practical solutions with code examples when helpful.`;
      
      case 'comprehensive':
        return `${basePrompt} You're working on a complex development challenge. Consider architectural implications, best practices, and provide thorough guidance with detailed examples.`;
      
      default:
        return basePrompt;
    }
  }

  /**
   * Build history context from relevant messages
   */
  private buildHistoryContext(relevantMessages: ContextRelevanceScore[]): string {
    if (relevantMessages.length === 0) return '';
    
    const contextPieces = relevantMessages
      .slice(0, 3) // Max 3 most relevant messages
      .map(msg => `Previous context: ${msg.content.substring(0, 200)}...`)
      .join('\n\n');
    
    return `Relevant conversation history:\n${contextPieces}`;
  }

  /**
   * Build technical context
   */
  private buildTechnicalContext(analysis: SemanticAnalysis): string {
    const contexts: string[] = [];
    
    if (analysis.context_requirements.domains.includes('debugging')) {
      contexts.push('Focus on identifying and solving code issues. Ask for error messages, stack traces, and relevant code snippets if needed.');
    }
    
    if (analysis.context_requirements.domains.includes('error_analysis')) {
      contexts.push('Analyze errors systematically: check syntax, logic, dependencies, and runtime conditions.');
    }
    
    return contexts.length > 0 ? `Technical context:\n${contexts.join('\n')}` : '';
  }

  /**
   * Build natural transition phrase
   */
  private buildNaturalTransition(analysis: SemanticAnalysis): string | undefined {
    const level = analysis.context_requirements.level;
    
    if (level === 'technical' && analysis.intent_layers.surface.type === 'social') {
      // Simple to technical escalation
      const transitions = NATURAL_TRANSITIONS.simple_to_technical;
      return transitions[Math.floor(Math.random() * transitions.length)];
    }
    
    if (level === 'comprehensive') {
      // Technical to comprehensive escalation
      const transitions = NATURAL_TRANSITIONS.technical_to_comprehensive;
      return transitions[Math.floor(Math.random() * transitions.length)];
    }
    
    return undefined;
  }

  /**
   * Map context requirement level to ContextLevel enum
   */
  private mapContextLevel(level: string): ContextLevel {
    switch (level) {
      case 'minimal': return 'MINIMAL';
      case 'technical': return 'TECHNICAL';  
      case 'comprehensive': return 'COMPREHENSIVE';
      default: return 'MINIMAL';
    }
  }

  /**
   * Circuit breaker methods
   */
  private recordSuccess(): void {
    this.circuitBreakerState.failureCount = 0;
    if (this.circuitBreakerState.isOpen) {
      this.circuitBreakerState.isOpen = false;
      console.log('🔄 Circuit breaker CLOSED - operations restored');
    }
  }

  private recordFailure(): void {
    this.circuitBreakerState.failureCount++;
    this.circuitBreakerState.lastFailure = Date.now();
    
    if (this.circuitBreakerState.failureCount >= this.circuitBreakerState.threshold) {
      this.circuitBreakerState.isOpen = true;
      console.log(`🚨 Circuit breaker OPENED after ${this.circuitBreakerState.failureCount} failures`);
      
      // Auto-reset after timeout
      setTimeout(() => {
        this.circuitBreakerState.isOpen = false;
        this.circuitBreakerState.failureCount = 0;
        console.log('🔄 Circuit breaker RESET after timeout');
      }, this.circuitBreakerState.timeout);
    }
  }

  /**
   * Helper methods for content analysis
   */
  private containsTechnicalTerms(query: string): boolean {
    const techTerms = ['debug', 'fix', 'error', 'code', 'function', 'component', 'api', 'react', 'vue', 'angular'];
    return techTerms.some(term => query.toLowerCase().includes(term));
  }

  private containsErrorTerms(query: string): boolean {
    const errorTerms = ['error', 'exception', 'failed', 'broken', 'not working', 'undefined', 'null'];
    return errorTerms.some(term => query.toLowerCase().includes(term));
  }

  private containsCreationTerms(query: string): boolean {
    const creationTerms = ['create', 'build', 'make', 'develop', 'design', 'implement'];
    return creationTerms.some(term => query.toLowerCase().includes(term));
  }

  /**
   * Get circuit breaker status
   */
  getCircuitBreakerStatus(): {
    isOpen: boolean;
    failureCount: number;
    threshold: number;
    timeUntilReset?: number;
  } {
    const status = {
      isOpen: this.circuitBreakerState.isOpen,
      failureCount: this.circuitBreakerState.failureCount,
      threshold: this.circuitBreakerState.threshold
    };

    if (this.circuitBreakerState.isOpen) {
      const elapsed = Date.now() - this.circuitBreakerState.lastFailure;
      const remaining = Math.max(0, this.circuitBreakerState.timeout - elapsed);
      return { ...status, timeUntilReset: remaining };
    }

    return status;
  }

  /**
   * Reset circuit breaker (for testing)
   */
  resetCircuitBreaker(): void {
    this.circuitBreakerState = {
      isOpen: false,
      failureCount: 0,
      lastFailure: 0,
      threshold: 3,
      timeout: 5 * 60 * 1000
    };
    console.log('🔄 Circuit breaker manually reset');
  }
}