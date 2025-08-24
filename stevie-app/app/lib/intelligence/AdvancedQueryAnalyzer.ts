/**
 * AdvancedQueryAnalyzer - Scout Intelligence Core
 * 
 * Implements multi-pass semantic analysis to replace simple regex classification.
 * Uses Scout's proven pattern: Surface → Deep → Contextual → Complexity analysis
 * 
 * Token targets:
 * - Simple queries: 20-50 tokens (hello, status, thanks)
 * - Medium queries: 200-400 tokens (add button, fix bug)  
 * - Complex queries: 600-1200 tokens (build app, debug complex error)
 */

// Core interfaces for semantic analysis
export interface SemanticAnalysis {
  intent_layers: {
    surface: IntentLayer;
    deep: IntentLayer;
    contextual: IntentLayer;
  };
  complexity_signals: ComplexitySignal[];
  context_requirements: ContextRequirement;
  confidence_score: number;
  query_type: QueryType;
  fallback_strategy?: FallbackStrategy;
}

export interface IntentLayer {
  type: 'social' | 'technical' | 'continuation' | 'complex';
  primary_action?: string;
  primary_object?: string;
  confidence: number;
  indicators: string[];
}

export interface ComplexitySignal {
  type: 'error_debugging' | 'multi_file' | 'architecture' | 'creation' | 'optimization';
  indicators: string[];
  escalation_level: number; // 0-1 scale
}

export interface ContextRequirement {
  level: 'minimal' | 'technical' | 'comprehensive';
  domains: string[];
  estimated_tokens: number;
  requires_history: boolean;
  requires_files: boolean;
}

export type QueryType = 'SIMPLE' | 'MEDIUM' | 'COMPLEX' | 'ESCALATED';

export interface FallbackStrategy {
  strategy: 'cached_response' | 'progressive_discovery' | 'safe_default' | 'emergency_minimal';
  reason: string;
  estimated_tokens: number;
}

// Smart fallback cache for common patterns
const SMART_FALLBACK_CACHE = {
  // Pure social greetings
  pure_greeting: {
    pattern: /^(hi|hello|hey|sup|what's up)[\s\.\!]*$/i,
    response: `Hi! I'm Steve, your AI coding assistant. I can help you:

• Build apps and websites from scratch
• Debug and fix code issues
• Add features to existing projects  
• Explain how things work

What are you working on today?`,
    tokens: 60,
    query_type: 'SIMPLE' as QueryType
  },

  // Gratitude expressions
  gratitude: {
    pattern: /^(thanks?|thank you|thx|appreciated?)[\s\.\!]*$/i,
    response: `You're welcome! Happy to help. Let me know if you need anything else! 👍`,
    tokens: 25,
    query_type: 'SIMPLE' as QueryType
  },

  // Status checks
  status_check: {
    pattern: /^(how are you|how's it going|status|working\?)[\s\.\!]*$/i,
    response: `All systems running smoothly! Ready to help with your coding projects. What can I build for you?`,
    tokens: 30,
    query_type: 'SIMPLE' as QueryType
  },

  // Debugging with error details
  debug_with_error: {
    pattern: /^(hi|hey|hello).*(debug|fix|error|help).*(error|undefined|null|failed|exception)/i,
    response: `I can help debug that error! To give you the best solution:

1. **Paste the complete error message** (including line numbers)
2. **Share the relevant code** where the error occurs  
3. **Tell me what you expected** vs what's happening

This helps me pinpoint the exact issue quickly!`,
    tokens: 85,
    query_type: 'MEDIUM' as QueryType
  },

  // General creation request
  general_creation: {
    pattern: /^(create|build|make).*(app|website|component|page)$/i,
    response: `I'd love to help you build that! To create exactly what you need:

1. **What type of app/site?** (e.g., "todo app", "portfolio site", "dashboard")
2. **Key features you want?** (user login, database, etc.)
3. **Tech preferences?** (React, vanilla JS, specific styling)

This way I can build something perfect for your needs!`,
    tokens: 95,
    query_type: 'MEDIUM' as QueryType
  },

  // Vague help requests  
  vague_help: {
    pattern: /^(help|can you help|need help|assist)[\s\.\!]*$/i,
    response: `Absolutely! I'm here to help with web development. I specialize in:

• **Building** - Apps, websites, components from scratch
• **Debugging** - Fixing errors and code issues
• **Enhancing** - Adding features to existing projects  
• **Explaining** - How code and technologies work

What's your current project or challenge?`,
    tokens: 80,
    query_type: 'SIMPLE' as QueryType
  }
};

export class AdvancedQueryAnalyzer {
  private technicalVerbs = [
    'debug', 'fix', 'optimize', 'refactor', 'implement', 'create', 'deploy', 
    'test', 'build', 'setup', 'configure', 'install', 'update', 'add', 'remove'
  ];

  private technicalNouns = [
    'component', 'function', 'api', 'database', 'error', 'bug', 'endpoint', 
    'state', 'props', 'hook', 'service', 'module', 'class', 'interface', 
    'variable', 'array', 'object', 'response', 'request', 'server', 'client'
  ];

  private complexityKeywords = [
    'architecture', 'design pattern', 'scalability', 'performance', 'security',
    'authentication', 'authorization', 'optimization', 'refactoring', 'testing',
    'deployment', 'docker', 'kubernetes', 'microservices', 'database design'
  ];

  /**
   * Main analysis method - Scout's multi-pass approach
   */
  async analyzeQuery(query: string, conversationContext: any[] = []): Promise<SemanticAnalysis> {
    try {
      // Add debug logging at start of analyzeQuery method
      console.log('🚀 ANALYZER START:', { query, contextLength: conversationContext.length });
      
      // Step 1: Check smart fallback cache first (fastest path)
      const cachedFallback = this.checkFallbackCache(query);
      if (cachedFallback) {
        return this.buildCachedAnalysis(query, cachedFallback);
      }

      // Step 2: Multi-pass semantic analysis (Scout's approach)
      const surfaceIntent = this.extractSurfaceIntent(query);
      const deepIntent = this.extractDeepIntent(query);
      const contextualIntent = this.extractContextualIntent(query, conversationContext);
      const complexitySignals = this.detectComplexityEscalation(query);

      // Step 3: Calculate overall confidence
      const confidence = this.calculateOverallConfidence(surfaceIntent, deepIntent, contextualIntent);

      // Step 4: Determine context requirements
      const contextRequirements = this.determineContextNeeds(deepIntent, complexitySignals, confidence);

      // Step 5: Classify query type
      const queryType = this.classifyQueryType(deepIntent, complexitySignals, confidence);

      return {
        intent_layers: {
          surface: surfaceIntent,
          deep: deepIntent,
          contextual: contextualIntent
        },
        complexity_signals: complexitySignals,
        context_requirements: contextRequirements,
        confidence_score: confidence,
        query_type: queryType
      };

    } catch (error) {
      console.error('AdvancedQueryAnalyzer failed:', error);
      // Emergency fallback - minimal context, never expensive
      return this.buildEmergencyFallback(query);
    }
  }

  /**
   * Check smart fallback cache for common patterns
   */
  private checkFallbackCache(query: string): any | null {
    const normalizedQuery = query.trim().toLowerCase();
    
    // 🔍 COMPREHENSIVE FALLBACK DEBUG LOGGING
    console.log('🔍 FALLBACK CACHE DEBUG:', {
      originalQuery: query,
      normalizedQuery,
      queryLength: normalizedQuery.length,
      availablePatterns: Object.keys(SMART_FALLBACK_CACHE)
    });
    
    for (const [key, cached] of Object.entries(SMART_FALLBACK_CACHE)) {
      const matched = cached.pattern.test(normalizedQuery);
      console.log(`🧪 Testing pattern '${key}':`, {
        pattern: cached.pattern.source,
        flags: cached.pattern.flags,
        testInput: normalizedQuery,
        matched,
        expectedTokens: cached.tokens
      });
      
      if (matched) {
        console.log(`✅ FALLBACK MATCH FOUND: ${key}`, {
          strategy: 'cached_response',
          tokens: cached.tokens,
          response_preview: cached.response.slice(0, 50) + '...'
        });
        return cached;
      }
    }
    
    console.log('❌ NO FALLBACK MATCHES FOUND - Will use full context pipeline');
    return null;
  }

  /**
   * Build analysis for cached responses
   */
  private buildCachedAnalysis(query: string, cached: any): SemanticAnalysis {
    return {
      intent_layers: {
        surface: { type: 'social', confidence: 0.9, indicators: ['cached_pattern'] },
        deep: { type: 'technical', confidence: 0.8, indicators: ['cached_response'] },
        contextual: { type: 'continuation', confidence: 0.5, indicators: [] }
      },
      complexity_signals: [],
      context_requirements: {
        level: 'minimal',
        domains: [],
        estimated_tokens: cached.tokens,
        requires_history: false,
        requires_files: false
      },
      confidence_score: 0.95,
      query_type: cached.query_type,
      fallback_strategy: {
        strategy: 'cached_response',
        reason: `Matched pattern for common query type`,
        estimated_tokens: cached.tokens
      }
    };
  }

  /**
   * Extract surface intent - social wrappers and politeness
   */
  private extractSurfaceIntent(query: string): IntentLayer {
    const socialPatterns = [
      { pattern: /^(hi|hello|hey|sup|what's up)/i, type: 'greeting' },
      { pattern: /(please|thank|thanks|thx)/i, type: 'politeness' },
      { pattern: /(help|assist|support)/i, type: 'help_request' },
      { pattern: /^(ok|okay|cool|got it|sounds good)/i, type: 'acknowledgment' }
    ];

    const indicators: string[] = [];
    let confidence = 0;

    for (const { pattern, type } of socialPatterns) {
      if (pattern.test(query)) {
        indicators.push(type);
        confidence += 0.3;
      }
    }

    return {
      type: indicators.length > 0 ? 'social' : 'technical',
      confidence: Math.min(confidence, 1.0),
      indicators
    };
  }

  /**
   * Extract deep intent - technical requests and actions
   */
  private extractDeepIntent(query: string): IntentLayer {
    const words = query.toLowerCase().split(/\s+/);
    const foundVerbs: string[] = [];
    const foundNouns: string[] = [];
    
    // Find technical verbs and nouns
    for (const word of words) {
      if (this.technicalVerbs.some(verb => word.includes(verb))) {
        foundVerbs.push(word);
      }
      if (this.technicalNouns.some(noun => word.includes(noun))) {
        foundNouns.push(word);
      }
    }

    // Calculate proximity score for technical pairs
    const proximityScore = this.calculateProximityScore(query, foundVerbs, foundNouns);
    
    let primaryAction = foundVerbs[0] || '';
    let primaryObject = foundNouns[0] || '';
    
    // Boost confidence for technical verb-noun pairs
    let confidence = (foundVerbs.length * 0.3) + (foundNouns.length * 0.2) + proximityScore;
    
    return {
      type: confidence > 0.4 ? 'technical' : 'social',
      primary_action: primaryAction,
      primary_object: primaryObject,
      confidence: Math.min(confidence, 1.0),
      indicators: [...foundVerbs, ...foundNouns]
    };
  }

  /**
   * Extract contextual intent - conversation continuity
   */
  private extractContextualIntent(query: string, history: any[]): IntentLayer {
    const continuationWords = ['this', 'that', 'it', 'also', 'and', 'plus', 'additionally'];
    const followupWords = ['but', 'however', 'actually', 'wait', 'also'];
    
    const indicators: string[] = [];
    let confidence = 0;
    
    // Check for pronouns and continuation words
    const words = query.toLowerCase().split(/\s+/);
    for (const word of words) {
      if (continuationWords.includes(word)) {
        indicators.push(`continuation:${word}`);
        confidence += 0.2;
      }
      if (followupWords.includes(word)) {
        indicators.push(`followup:${word}`);
        confidence += 0.3;
      }
    }
    
    // Boost confidence if we have recent conversation history
    if (history.length > 0) {
      confidence += 0.2;
      indicators.push('has_history');
    }
    
    return {
      type: indicators.length > 0 ? 'continuation' : 'social',
      confidence: Math.min(confidence, 1.0),
      indicators
    };
  }

  /**
   * Detect complexity escalation signals
   */
  private detectComplexityEscalation(query: string): ComplexitySignal[] {
    const signals: ComplexitySignal[] = [];
    
    // Error debugging signals
    const errorPatterns = [
      /error|exception|failed|broken|not working|undefined|null/i,
      /stack trace|line \d+|syntax error|reference error/i,
      /500|404|401|403|cors|network error/i
    ];
    
    for (const pattern of errorPatterns) {
      if (pattern.test(query)) {
        signals.push({
          type: 'error_debugging',
          indicators: [pattern.source],
          escalation_level: 0.7
        });
        break;
      }
    }
    
    // Multi-file complexity
    if (/multiple files|several files|project|app|application/i.test(query)) {
      signals.push({
        type: 'multi_file',
        indicators: ['multi_file_context'],
        escalation_level: 0.6
      });
    }
    
    // Architecture complexity
    for (const keyword of this.complexityKeywords) {
      if (query.toLowerCase().includes(keyword)) {
        signals.push({
          type: 'architecture',
          indicators: [keyword],
          escalation_level: 0.8
        });
        break;
      }
    }
    
    return signals;
  }

  /**
   * Calculate proximity score for technical term pairs
   */
  private calculateProximityScore(query: string, verbs: string[], nouns: string[]): number {
    if (verbs.length === 0 || nouns.length === 0) return 0;
    
    const words = query.toLowerCase().split(/\s+/);
    let maxScore = 0;
    
    for (const verb of verbs) {
      for (const noun of nouns) {
        const verbIndex = words.findIndex(word => word.includes(verb));
        const nounIndex = words.findIndex(word => word.includes(noun));
        
        if (verbIndex !== -1 && nounIndex !== -1) {
          const distance = Math.abs(verbIndex - nounIndex);
          const score = Math.max(0, 0.5 - (distance * 0.1)); // Closer = higher score
          maxScore = Math.max(maxScore, score);
        }
      }
    }
    
    return maxScore;
  }

  /**
   * Calculate overall confidence from all layers
   */
  private calculateOverallConfidence(surface: IntentLayer, deep: IntentLayer, contextual: IntentLayer): number {
    return (surface.confidence * 0.2) + (deep.confidence * 0.6) + (contextual.confidence * 0.2);
  }

  /**
   * Determine context requirements based on analysis
   */
  private determineContextNeeds(deepIntent: IntentLayer, signals: ComplexitySignal[], confidence: number): ContextRequirement {
    let level: 'minimal' | 'technical' | 'comprehensive' = 'minimal';
    let estimatedTokens = 50;
    const domains: string[] = [];
    let requiresHistory = false;
    let requiresFiles = false;
    
    // Escalate based on deep intent confidence
    if (deepIntent.confidence > 0.6) {
      level = 'technical';
      estimatedTokens = 300;
      requiresHistory = true;
      domains.push('technical');
    }
    
    // Escalate based on complexity signals
    const maxEscalation = Math.max(...signals.map(s => s.escalation_level), 0);
    if (maxEscalation > 0.7) {
      level = 'comprehensive';
      estimatedTokens = 800;
      requiresHistory = true;
      requiresFiles = true;
      domains.push('debugging', 'error_analysis');
    }
    
    // Apply hard token limits (Scout's principle)
    estimatedTokens = Math.min(estimatedTokens, 1200);
    
    return {
      level,
      domains,
      estimated_tokens: estimatedTokens,
      requires_history: requiresHistory,
      requires_files: requiresFiles
    };
  }

  /**
   * Classify overall query type
   */
  private classifyQueryType(deepIntent: IntentLayer, signals: ComplexitySignal[], confidence: number): QueryType {
    const maxEscalation = Math.max(...signals.map(s => s.escalation_level), 0);
    
    if (maxEscalation > 0.7 && deepIntent.confidence > 0.6) {
      return 'COMPLEX';
    }
    
    if (deepIntent.confidence > 0.5 || signals.length > 0) {
      return 'MEDIUM';
    }
    
    return 'SIMPLE';
  }

  /**
   * Emergency fallback when everything fails
   */
  private buildEmergencyFallback(query: string): SemanticAnalysis {
    console.log('🚨 Emergency fallback activated for query analysis');
    
    return {
      intent_layers: {
        surface: { type: 'social', confidence: 0.3, indicators: ['emergency'] },
        deep: { type: 'technical', confidence: 0.3, indicators: ['emergency'] },
        contextual: { type: 'continuation', confidence: 0.1, indicators: [] }
      },
      complexity_signals: [],
      context_requirements: {
        level: 'minimal',
        domains: [],
        estimated_tokens: 50,
        requires_history: false,
        requires_files: false
      },
      confidence_score: 0.3,
      query_type: 'SIMPLE',
      fallback_strategy: {
        strategy: 'emergency_minimal',
        reason: 'Analysis pipeline failed - using minimal safe context',
        estimated_tokens: 50
      }
    };
  }
}