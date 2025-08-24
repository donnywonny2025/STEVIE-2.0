/**
 * IntelligentContextRetrieval - Scout's Relevance-Based Context Selection
 * 
 * Implements Scout's proven relevance scoring formula:
 * semantic_similarity * 0.4 + recency_factor * 0.2 + engagement_score * 0.2 + technical_overlap * 0.2
 * 
 * Replaces Bolt's "dump everything" approach with intelligent selection:
 * - Top 5 most relevant messages (minimum 0.3 relevance threshold)
 * - Semantic similarity using TF-IDF with technical term boosting
 * - Engagement tracking (solutions that worked get higher scores)
 * - Technical overlap analysis for coding contexts
 */

export interface ContextRelevanceScore {
  content: string;
  relevance_score: number;
  recency_factor: number;
  semantic_similarity: number;
  user_engagement: number;
  technical_overlap: number;
  timestamp: Date;
  message_id?: string;
  metadata: {
    contained_code: boolean;
    led_to_solution: boolean;
    user_followup: boolean;
    user_thanked: boolean;
    error_context: boolean;
  };
}

export interface Message {
  content: string;
  timestamp: Date;
  id?: string;
  role: 'user' | 'assistant';
  // Engagement tracking fields
  user_followup_questions?: number;
  contained_code?: boolean;
  user_said_thanks?: boolean;
  led_to_working_solution?: boolean;
  error_context?: boolean;
  // Technical analysis fields
  technical_terms?: string[];
  complexity_level?: 'simple' | 'medium' | 'complex';
}

export interface ContextSelectionResult {
  selected_messages: ContextRelevanceScore[];
  total_considered: number;
  selection_strategy: string;
  estimated_tokens: number;
  relevance_threshold: number;
  fallback_used?: boolean;
}

// Technical terms for boosting and overlap analysis
const TECHNICAL_TERMS = new Set([
  'react', 'vue', 'angular', 'svelte', 'typescript', 'javascript', 'node', 'express',
  'api', 'rest', 'graphql', 'database', 'sql', 'mongodb', 'postgres', 'mysql',
  'component', 'function', 'hook', 'state', 'props', 'context', 'reducer',
  'error', 'bug', 'debug', 'test', 'testing', 'unit', 'integration',
  'deploy', 'build', 'webpack', 'vite', 'babel', 'eslint', 'prettier',
  'css', 'scss', 'tailwind', 'styled', 'bootstrap', 'flexbox', 'grid',
  'async', 'await', 'promise', 'callback', 'event', 'listener', 'handler',
  'dom', 'html', 'element', 'selector', 'query', 'fetch', 'axios',
  'server', 'client', 'frontend', 'backend', 'fullstack', 'spa', 'ssr'
]);

export class IntelligentContextRetrieval {
  private relevanceThreshold = 0.3;
  private maxContextMessages = 5;
  private technicalTermBoost = 2.0;

  /**
   * Find relevant context using Scout's proven formula
   */
  async findRelevantContext(
    currentQuery: string,
    sessionHistory: Message[],
    options: {
      maxMessages?: number;
      relevanceThreshold?: number;
      prioritizeTechnical?: boolean;
    } = {}
  ): Promise<ContextSelectionResult> {
    try {
      const maxMessages = options.maxMessages || this.maxContextMessages;
      const threshold = options.relevanceThreshold || this.relevanceThreshold;

      if (sessionHistory.length === 0) {
        return this.buildEmptyResult('No session history available');
      }

      // Score all messages for relevance
      const scoredMessages: ContextRelevanceScore[] = [];
      
      for (const message of sessionHistory) {
        const score = await this.scoreRelevance(currentQuery, message);
        
        if (score.relevance_score >= threshold) {
          scoredMessages.push(score);
        }
      }

      // Sort by relevance score (descending)
      scoredMessages.sort((a, b) => b.relevance_score - a.relevance_score);

      // Take top N messages
      const selectedMessages = scoredMessages.slice(0, maxMessages);

      // Calculate estimated tokens
      const estimatedTokens = this.estimateTokenCount(selectedMessages);

      console.log(`🎯 Context selection: ${selectedMessages.length}/${sessionHistory.length} messages selected (threshold: ${threshold})`);
      
      return {
        selected_messages: selectedMessages,
        total_considered: sessionHistory.length,
        selection_strategy: 'relevance_scoring',
        estimated_tokens: estimatedTokens,
        relevance_threshold: threshold
      };

    } catch (error) {
      console.error('IntelligentContextRetrieval failed:', error);
      // Fallback to simple recency-based selection
      return this.fallbackToRecency(sessionHistory, options.maxMessages || 3);
    }
  }

  /**
   * Score relevance using Scout's formula
   */
  async scoreRelevance(query: string, historicalMessage: Message): Promise<ContextRelevanceScore> {
    // Calculate each component of Scout's formula
    const semanticSimilarity = this.calculateSemanticSimilarity(query, historicalMessage.content);
    const recencyFactor = this.calculateRecencyFactor(historicalMessage.timestamp);
    const engagementScore = this.calculateEngagementScore(historicalMessage);
    const technicalOverlap = this.calculateTechnicalOverlap(query, historicalMessage.content);

    // Apply Scout's proven weights
    const relevanceScore = 
      (semanticSimilarity * 0.4) +
      (recencyFactor * 0.2) +
      (engagementScore * 0.2) +
      (technicalOverlap * 0.2);

    return {
      content: historicalMessage.content,
      relevance_score: Math.min(relevanceScore, 1.0), // Cap at 1.0
      semantic_similarity: semanticSimilarity,
      recency_factor: recencyFactor,
      user_engagement: engagementScore,
      technical_overlap: technicalOverlap,
      timestamp: historicalMessage.timestamp,
      message_id: historicalMessage.id,
      metadata: {
        contained_code: historicalMessage.contained_code || false,
        led_to_solution: historicalMessage.led_to_working_solution || false,
        user_followup: (historicalMessage.user_followup_questions || 0) > 0,
        user_thanked: historicalMessage.user_said_thanks || false,
        error_context: historicalMessage.error_context || false
      }
    };
  }

  /**
   * Calculate semantic similarity using simple TF-IDF with technical boosting
   */
  private calculateSemanticSimilarity(query: string, content: string): number {
    const queryTerms = this.extractTerms(query);
    const contentTerms = this.extractTerms(content);
    
    if (queryTerms.length === 0 || contentTerms.length === 0) {
      return 0;
    }

    // Calculate term frequency overlap
    const querySet = new Set(queryTerms);
    const contentSet = new Set(contentTerms);
    const intersection = new Set([...querySet].filter(x => contentSet.has(x)));
    
    let similarity = intersection.size / Math.max(querySet.size, contentSet.size);
    
    // Boost for technical term matches
    const technicalMatches = [...intersection].filter(term => TECHNICAL_TERMS.has(term.toLowerCase()));
    if (technicalMatches.length > 0) {
      similarity += (technicalMatches.length * 0.1); // Boost technical matches
    }
    
    return Math.min(similarity, 1.0);
  }

  /**
   * Calculate recency factor with exponential decay
   */
  private calculateRecencyFactor(timestamp: Date): number {
    const now = new Date();
    const minutesAgo = (now.getTime() - timestamp.getTime()) / (1000 * 60);
    
    // Exponential decay: more recent = higher score
    return Math.pow(0.9, minutesAgo / 10); // Decay over 10-minute intervals
  }

  /**
   * Calculate engagement score based on user interactions
   */
  private calculateEngagementScore(message: Message): number {
    let score = 0.5; // Base score
    
    // Positive engagement indicators
    if (message.user_followup_questions && message.user_followup_questions > 0) {
      score += 0.3; // User asked follow-up questions
    }
    
    if (message.contained_code) {
      score += 0.4; // Message contained code (likely useful)
    }
    
    if (message.user_said_thanks) {
      score += 0.2; // User expressed gratitude
    }
    
    if (message.led_to_working_solution) {
      score += 0.5; // Led to a working solution (very valuable)
    }
    
    if (message.error_context) {
      score += 0.3; // Error-related context can be valuable
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate technical overlap using Jaccard similarity
   */
  private calculateTechnicalOverlap(query: string, content: string): number {
    const queryTechnicalTerms = this.extractTechnicalTerms(query);
    const contentTechnicalTerms = this.extractTechnicalTerms(content);
    
    if (queryTechnicalTerms.length === 0 || contentTechnicalTerms.length === 0) {
      return 0;
    }
    
    const querySet = new Set(queryTechnicalTerms);
    const contentSet = new Set(contentTechnicalTerms);
    const intersection = new Set([...querySet].filter(x => contentSet.has(x)));
    const union = new Set([...querySet, ...contentSet]);
    
    // Jaccard similarity
    return intersection.size / union.size;
  }

  /**
   * Extract terms for analysis (tokenize and clean)
   */
  private extractTerms(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(term => term.length > 2) // Filter short words
      .filter(term => !this.isStopWord(term)); // Remove stop words
  }

  /**
   * Extract technical terms specifically
   */
  private extractTechnicalTerms(text: string): string[] {
    const terms = this.extractTerms(text);
    return terms.filter(term => TECHNICAL_TERMS.has(term));
  }

  /**
   * Simple stop word filter
   */
  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was',
      'will', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could',
      'would', 'should', 'may', 'might', 'must', 'shall', 'will', 'would'
    ]);
    return stopWords.has(word);
  }

  /**
   * Estimate token count for selected context
   */
  private estimateTokenCount(selectedMessages: ContextRelevanceScore[]): number {
    const totalChars = selectedMessages.reduce((sum, msg) => sum + msg.content.length, 0);
    return Math.ceil(totalChars / 4); // 1 token ≈ 4 characters
  }

  /**
   * Fallback to simple recency-based selection
   */
  private fallbackToRecency(sessionHistory: Message[], maxMessages: number = 3): ContextSelectionResult {
    console.log('🔄 Falling back to recency-based context selection');
    
    // Sort by timestamp (most recent first)
    const sortedMessages = [...sessionHistory]
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, maxMessages);

    const selectedMessages: ContextRelevanceScore[] = sortedMessages.map(msg => ({
      content: msg.content,
      relevance_score: 0.5, // Default score for fallback
      semantic_similarity: 0.3,
      recency_factor: this.calculateRecencyFactor(msg.timestamp),
      user_engagement: 0.3,
      technical_overlap: 0.1,
      timestamp: msg.timestamp,
      message_id: msg.id,
      metadata: {
        contained_code: false,
        led_to_solution: false,
        user_followup: false,
        user_thanked: false,
        error_context: false
      }
    }));

    return {
      selected_messages: selectedMessages,
      total_considered: sessionHistory.length,
      selection_strategy: 'recency_fallback',
      estimated_tokens: this.estimateTokenCount(selectedMessages),
      relevance_threshold: 0.0,
      fallback_used: true
    };
  }

  /**
   * Build empty result for no context scenarios
   */
  private buildEmptyResult(reason: string): ContextSelectionResult {
    return {
      selected_messages: [],
      total_considered: 0,
      selection_strategy: reason,
      estimated_tokens: 0,
      relevance_threshold: this.relevanceThreshold
    };
  }

  /**
   * Update message engagement after user interaction
   */
  updateMessageEngagement(
    messageId: string,
    engagement: {
      userFollowedUp?: boolean;
      userSaidThanks?: boolean;
      ledToSolution?: boolean;
      wasHelpful?: boolean;
    }
  ): void {
    // This would typically update a database or session storage
    // For now, just log the engagement update
    console.log(`📈 Engagement update for message ${messageId}:`, engagement);
  }

  /**
   * Analyze context selection quality (for debugging)
   */
  analyzeSelectionQuality(result: ContextSelectionResult, query: string): {
    quality_score: number;
    technical_coverage: number;
    recency_balance: number;
    engagement_level: number;
    recommendations: string[];
  } {
    const messages = result.selected_messages;
    
    if (messages.length === 0) {
      return {
        quality_score: 0,
        technical_coverage: 0,
        recency_balance: 0,
        engagement_level: 0,
        recommendations: ['No relevant context found - consider lowering relevance threshold']
      };
    }

    // Calculate quality metrics
    const avgRelevance = messages.reduce((sum, msg) => sum + msg.relevance_score, 0) / messages.length;
    const avgTechnicalOverlap = messages.reduce((sum, msg) => sum + msg.technical_overlap, 0) / messages.length;
    const avgRecency = messages.reduce((sum, msg) => sum + msg.recency_factor, 0) / messages.length;
    const avgEngagement = messages.reduce((sum, msg) => sum + msg.user_engagement, 0) / messages.length;

    const recommendations: string[] = [];
    
    if (avgTechnicalOverlap < 0.3 && this.extractTechnicalTerms(query).length > 0) {
      recommendations.push('Low technical overlap - consider expanding technical term matching');
    }
    
    if (avgRecency < 0.3) {
      recommendations.push('Context may be too old - consider prioritizing recent messages');
    }
    
    if (avgEngagement < 0.4) {
      recommendations.push('Low engagement context - look for messages with user interaction');
    }

    return {
      quality_score: avgRelevance,
      technical_coverage: avgTechnicalOverlap,
      recency_balance: avgRecency,
      engagement_level: avgEngagement,
      recommendations
    };
  }

  /**
   * Get configuration settings
   */
  getConfiguration(): {
    relevance_threshold: number;
    max_messages: number;
    technical_boost: number;
  } {
    return {
      relevance_threshold: this.relevanceThreshold,
      max_messages: this.maxContextMessages,
      technical_boost: this.technicalTermBoost
    };
  }

  /**
   * Update configuration
   */
  updateConfiguration(config: {
    relevanceThreshold?: number;
    maxMessages?: number;
    technicalBoost?: number;
  }): void {
    if (config.relevanceThreshold !== undefined) {
      this.relevanceThreshold = Math.max(0, Math.min(1, config.relevanceThreshold));
    }
    if (config.maxMessages !== undefined) {
      this.maxContextMessages = Math.max(1, Math.min(10, config.maxMessages));
    }
    if (config.technicalBoost !== undefined) {
      this.technicalTermBoost = Math.max(1, Math.min(5, config.technicalBoost));
    }
  }
}