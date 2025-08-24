/**
 * PatternMatcher - Pattern Recognition and Fallback Engine
 * 
 * Extracts and enhances the smart fallback cache system from AdvancedQueryAnalyzer.
 * Maintains the critical 97% token efficiency through intelligent pattern matching
 * and cached responses for common query types.
 * 
 * Key Features:
 * - Smart fallback cache for instant responses
 * - Dynamic pattern registration and updates
 * - Pattern confidence scoring
 * - Performance monitoring and cache statistics
 */

import type {
  PatternMatch,
  PatternType,
  QueryType,
  PatternConfig,
  CustomPattern
} from '../types/IntelligenceTypes';

export interface SmartFallbackPattern {
  pattern: RegExp;
  response: string;
  tokens: number;
  queryType: QueryType;
  patternType: PatternType;
  confidence: number;
  hitCount: number;
  lastUsed: Date;
  metadata: {
    category: string;
    tags: string[];
    effectiveness: number;
    averageUserSatisfaction?: number;
  };
}

export interface PatternMatchResult {
  matched: boolean;
  pattern?: SmartFallbackPattern;
  confidence: number;
  estimatedTokens: number;
  fallbackResponse?: string;
  isComplete: boolean;
  patternType?: PatternType;
  metadata?: Record<string, any>;
}

export interface PatternStats {
  totalPatterns: number;
  totalMatches: number;
  cacheHitRate: number;
  averageTokenSavings: number;
  mostUsedPatterns: Array<{
    pattern: string;
    hits: number;
    tokens: number;
  }>;
  patternEffectiveness: Record<string, number>;
}

export class PatternMatcher {
  private patterns: Map<string, SmartFallbackPattern> = new Map();
  private stats = {
    totalMatches: 0,
    totalAttempts: 0,
    tokensSaved: 0
  };

  constructor(private config: PatternConfig) {
    this.initializeDefaultPatterns();
    this.loadCustomPatterns();
  }

  /**
   * Main pattern matching method
   */
  async matchPatterns(query: string): Promise<PatternMatchResult> {
    this.stats.totalAttempts++;
    const normalizedQuery = query.trim().toLowerCase();
    
    console.log('🔍 PATTERN MATCHING:', {
      originalQuery: query.slice(0, 50) + (query.length > 50 ? '...' : ''),
      normalizedQuery: normalizedQuery.slice(0, 50) + (normalizedQuery.length > 50 ? '...' : ''),
      queryLength: normalizedQuery.length,
      availablePatterns: this.patterns.size
    });
    
    // Test each pattern for matches
    for (const [patternId, patternData] of this.patterns) {
      const matched = patternData.pattern.test(normalizedQuery);
      
      console.log(`🧪 Testing pattern '${patternId}':`, {
        pattern: patternData.pattern.source,
        flags: patternData.pattern.flags,
        testInput: normalizedQuery.slice(0, 30) + '...',
        matched,
        expectedTokens: patternData.tokens,
        confidence: patternData.confidence
      });
      
      if (matched) {
        // Update usage statistics
        this.updatePatternUsage(patternId);
        this.stats.totalMatches++;
        this.stats.tokensSaved += this.estimateTokenSavings(patternData);
        
        console.log(`✅ PATTERN MATCH FOUND: ${patternId}`, {
          patternType: patternData.patternType,
          tokens: patternData.tokens,
          confidence: patternData.confidence,
          queryType: patternData.queryType,
          response_preview: patternData.response.slice(0, 50) + '...'
        });
        
        return {
          matched: true,
          pattern: patternData,
          confidence: patternData.confidence,
          estimatedTokens: patternData.tokens,
          fallbackResponse: patternData.response,
          isComplete: true,
          patternType: patternData.patternType,
          metadata: {
            patternId,
            hitCount: patternData.hitCount,
            category: patternData.metadata.category
          }
        };
      }
    }
    
    console.log('❌ NO PATTERN MATCHES FOUND - Will proceed to full analysis pipeline');
    
    return {
      matched: false,
      confidence: 0,
      estimatedTokens: 0,
      isComplete: false
    };
  }

  /**
   * Initialize default high-efficiency patterns
   */
  private initializeDefaultPatterns(): void {
    const defaultPatterns = [
      // Pure social greetings - Highest efficiency
      {
        id: 'pure_greeting',
        pattern: /^(hi|hello|hey|sup|what's up)[\s\.\!]*$/i,
        response: `Hi! I'm Steve, your AI coding assistant. I can help you:

• Build apps and websites from scratch
• Debug and fix code issues
• Add features to existing projects  
• Explain how things work

What are you working on today?`,
        tokens: 60,
        queryType: 'SIMPLE' as QueryType,
        patternType: 'greeting' as PatternType,
        category: 'social',
        tags: ['greeting', 'introduction', 'capabilities']
      },

      // Gratitude expressions
      {
        id: 'gratitude',
        pattern: /^(thanks?|thank you|thx|appreciated?)[\s\.\!]*$/i,
        response: `You're welcome! Happy to help. Let me know if you need anything else! 👍`,
        tokens: 25,
        queryType: 'SIMPLE' as QueryType,
        patternType: 'gratitude' as PatternType,
        category: 'social',
        tags: ['gratitude', 'acknowledgment']
      },

      // Status checks
      {
        id: 'status_check',
        pattern: /^(how are you|how's it going|status|working\?)[\s\.\!]*$/i,
        response: `All systems running smoothly! Ready to help with your coding projects. What can I build for you?`,
        tokens: 30,
        queryType: 'SIMPLE' as QueryType,
        patternType: 'help_request' as PatternType,
        category: 'status',
        tags: ['status', 'readiness', 'capabilities']
      },

      // Debugging with error details
      {
        id: 'debug_with_error',
        pattern: /^(hi|hey|hello).*(debug|fix|error|help).*(error|undefined|null|failed|exception)/i,
        response: `I can help debug that error! To give you the best solution:

1. **Paste the complete error message** (including line numbers)
2. **Share the relevant code** where the error occurs  
3. **Tell me what you expected** vs what's happening

This helps me pinpoint the exact issue quickly!`,
        tokens: 85,
        queryType: 'MEDIUM' as QueryType,
        patternType: 'debug_request' as PatternType,
        category: 'debugging',
        tags: ['debugging', 'error', 'help', 'guidance']
      },

      // General creation request
      {
        id: 'general_creation',
        pattern: /^(create|build|make).*(app|website|component|page)$/i,
        response: `I'd love to help you build that! To create exactly what you need:

1. **What type of app/site?** (e.g., "todo app", "portfolio site", "dashboard")
2. **Key features you want?** (user login, database, etc.)
3. **Tech preferences?** (React, vanilla JS, specific styling)

This way I can build something perfect for your needs!`,
        tokens: 95,
        queryType: 'MEDIUM' as QueryType,
        patternType: 'creation_request' as PatternType,
        category: 'creation',
        tags: ['creation', 'building', 'requirements']
      },

      // Vague help requests
      {
        id: 'vague_help',
        pattern: /^(help|can you help|need help|assist)[\s\.\!]*$/i,
        response: `Absolutely! I'm here to help with web development. I specialize in:

• **Building** - Apps, websites, components from scratch
• **Debugging** - Fixing errors and code issues
• **Enhancing** - Adding features to existing projects  
• **Explaining** - How code and technologies work

What's your current project or challenge?`,
        tokens: 80,
        queryType: 'SIMPLE' as QueryType,
        patternType: 'help_request' as PatternType,
        category: 'help',
        tags: ['help', 'capabilities', 'guidance']
      },

      // Quick confirmations
      {
        id: 'quick_confirmation',
        pattern: /^(yes|yeah|yep|sure|ok|okay|sounds good)[\s\.\!]*$/i,
        response: `Great! I'm ready to help. What would you like me to work on?`,
        tokens: 20,
        queryType: 'SIMPLE' as QueryType,
        patternType: 'continuation' as PatternType,
        category: 'confirmation',
        tags: ['confirmation', 'continuation']
      },

      // Quick negations
      {
        id: 'quick_negation',
        pattern: /^(no|nope|not now|maybe later)[\s\.\!]*$/i,
        response: `No problem! I'll be here whenever you're ready to code something awesome! 🚀`,
        tokens: 25,
        queryType: 'SIMPLE' as QueryType,
        patternType: 'continuation' as PatternType,
        category: 'social',
        tags: ['negation', 'social']
      }
    ];

    // Register default patterns
    for (const patternDef of defaultPatterns) {
      this.registerPattern(
        patternDef.id,
        patternDef.pattern,
        patternDef.response,
        patternDef.tokens,
        patternDef.queryType,
        patternDef.patternType,
        {
          category: patternDef.category,
          tags: patternDef.tags,
          effectiveness: 0.95 // Default high effectiveness for proven patterns
        }
      );
    }

    console.log(`📋 Initialized ${defaultPatterns.length} default patterns`);
  }

  /**
   * Load custom patterns from configuration
   */
  private loadCustomPatterns(): void {
    if (this.config.customPatterns) {
      for (const customPattern of this.config.customPatterns) {
        if (customPattern.enabled) {
          this.registerPattern(
            customPattern.id,
            customPattern.pattern,
            customPattern.response,
            customPattern.estimatedTokens,
            customPattern.queryType,
            'technical_question', // Default pattern type for custom patterns
            {
              category: 'custom',
              tags: ['custom'],
              effectiveness: 0.8 // Default effectiveness for custom patterns
            }
          );
        }
      }
      console.log(`📋 Loaded ${this.config.customPatterns.filter(p => p.enabled).length} custom patterns`);
    }
  }

  /**
   * Register a new pattern
   */
  registerPattern(
    id: string,
    pattern: RegExp,
    response: string,
    tokens: number,
    queryType: QueryType,
    patternType: PatternType,
    metadata: {
      category: string;
      tags: string[];
      effectiveness: number;
    }
  ): void {
    this.patterns.set(id, {
      pattern,
      response,
      tokens,
      queryType,
      patternType,
      confidence: 0.9, // High confidence for registered patterns
      hitCount: 0,
      lastUsed: new Date(),
      metadata: {
        ...metadata,
        averageUserSatisfaction: undefined
      }
    });

    console.log(`✅ Pattern registered: ${id}`, {
      patternType,
      tokens,
      category: metadata.category
    });
  }

  /**
   * Update pattern usage statistics
   */
  private updatePatternUsage(patternId: string): void {
    const pattern = this.patterns.get(patternId);
    if (pattern) {
      pattern.hitCount++;
      pattern.lastUsed = new Date();
      
      // Update effectiveness based on usage frequency
      const usageBoost = Math.min(pattern.hitCount * 0.01, 0.05);
      pattern.metadata.effectiveness = Math.min(pattern.metadata.effectiveness + usageBoost, 1.0);
    }
  }

  /**
   * Estimate token savings from using a pattern
   */
  private estimateTokenSavings(pattern: SmartFallbackPattern): number {
    // Estimate what a full context analysis would have used
    const estimatedFullAnalysis = this.getFullAnalysisEstimate(pattern.queryType);
    return estimatedFullAnalysis - pattern.tokens;
  }

  /**
   * Get estimated token cost for full analysis by query type
   */
  private getFullAnalysisEstimate(queryType: QueryType): number {
    switch (queryType) {
      case 'SIMPLE': return 1500;  // Bolt's old baseline
      case 'MEDIUM': return 1800;
      case 'COMPLEX': return 2500;
      default: return 1500;
    }
  }

  /**
   * Get pattern matching statistics
   */
  getPatternStats(): PatternStats {
    const hitRate = this.stats.totalAttempts > 0 
      ? (this.stats.totalMatches / this.stats.totalAttempts) * 100 
      : 0;

    const averageTokenSavings = this.stats.totalMatches > 0 
      ? this.stats.tokensSaved / this.stats.totalMatches 
      : 0;

    const mostUsedPatterns = Array.from(this.patterns.entries())
      .sort(([, a], [, b]) => b.hitCount - a.hitCount)
      .slice(0, 5)
      .map(([id, pattern]) => ({
        pattern: id,
        hits: pattern.hitCount,
        tokens: pattern.tokens
      }));

    const patternEffectiveness = Array.from(this.patterns.entries())
      .reduce((acc, [id, pattern]) => {
        acc[id] = pattern.metadata.effectiveness;
        return acc;
      }, {} as Record<string, number>);

    return {
      totalPatterns: this.patterns.size,
      totalMatches: this.stats.totalMatches,
      cacheHitRate: hitRate,
      averageTokenSavings,
      mostUsedPatterns,
      patternEffectiveness
    };
  }

  /**
   * Update pattern effectiveness based on user feedback
   */
  updatePatternEffectiveness(patternId: string, userSatisfaction: number): void {
    const pattern = this.patterns.get(patternId);
    if (pattern) {
      const currentSatisfaction = pattern.metadata.averageUserSatisfaction || 0.8;
      const newSatisfaction = (currentSatisfaction + userSatisfaction) / 2;
      pattern.metadata.averageUserSatisfaction = newSatisfaction;
      
      // Adjust effectiveness based on user satisfaction
      pattern.metadata.effectiveness = Math.min(newSatisfaction * 1.2, 1.0);
      
      console.log(`📊 Pattern effectiveness updated: ${patternId}`, {
        satisfaction: newSatisfaction,
        effectiveness: pattern.metadata.effectiveness
      });
    }
  }

  /**
   * Remove or disable underperforming patterns
   */
  cleanupUnderperformingPatterns(): void {
    const threshold = 0.3; // Minimum effectiveness threshold
    const removedPatterns: string[] = [];
    
    for (const [id, pattern] of this.patterns) {
      if (pattern.metadata.effectiveness < threshold && pattern.hitCount > 10) {
        this.patterns.delete(id);
        removedPatterns.push(id);
      }
    }
    
    if (removedPatterns.length > 0) {
      console.log(`🧹 Removed ${removedPatterns.length} underperforming patterns:`, removedPatterns);
    }
  }

  /**
   * Export patterns for backup or transfer
   */
  exportPatterns(): Array<{
    id: string;
    pattern: string;
    flags: string;
    response: string;
    tokens: number;
    queryType: QueryType;
    patternType: PatternType;
    metadata: any;
  }> {
    return Array.from(this.patterns.entries()).map(([id, pattern]) => ({
      id,
      pattern: pattern.pattern.source,
      flags: pattern.pattern.flags,
      response: pattern.response,
      tokens: pattern.tokens,
      queryType: pattern.queryType,
      patternType: pattern.patternType,
      metadata: pattern.metadata
    }));
  }

  /**
   * Import patterns from backup
   */
  importPatterns(patterns: Array<{
    id: string;
    pattern: string;
    flags: string;
    response: string;
    tokens: number;
    queryType: QueryType;
    patternType: PatternType;
    metadata: any;
  }>): void {
    for (const patternData of patterns) {
      try {
        const regex = new RegExp(patternData.pattern, patternData.flags);
        this.registerPattern(
          patternData.id,
          regex,
          patternData.response,
          patternData.tokens,
          patternData.queryType,
          patternData.patternType,
          patternData.metadata
        );
      } catch (error) {
        console.error(`❌ Failed to import pattern ${patternData.id}:`, error);
      }
    }
    
    console.log(`📥 Imported ${patterns.length} patterns`);
  }

  /**
   * Test a query against all patterns (for debugging)
   */
  debugPatternMatching(query: string): Array<{
    patternId: string;
    matched: boolean;
    confidence: number;
    tokens: number;
    category: string;
  }> {
    const normalizedQuery = query.trim().toLowerCase();
    const results: Array<{
      patternId: string;
      matched: boolean;
      confidence: number;
      tokens: number;
      category: string;
    }> = [];
    
    for (const [patternId, pattern] of this.patterns) {
      const matched = pattern.pattern.test(normalizedQuery);
      results.push({
        patternId,
        matched,
        confidence: pattern.confidence,
        tokens: pattern.tokens,
        category: pattern.metadata.category
      });
    }
    
    return results.sort((a, b) => {
      if (a.matched && !b.matched) return -1;
      if (!a.matched && b.matched) return 1;
      return b.confidence - a.confidence;
    });
  }
}