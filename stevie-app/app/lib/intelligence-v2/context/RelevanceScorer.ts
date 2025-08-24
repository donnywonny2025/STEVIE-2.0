/**
 * RelevanceScorer - Advanced Context Relevance Calculation
 * 
 * Specialized component for calculating sophisticated relevance scores
 * using multiple algorithms including semantic similarity, temporal
 * relevance, and contextual importance.
 * 
 * Key Features:
 * - Multiple relevance algorithms (TF-IDF, cosine similarity, semantic distance)
 * - Temporal relevance weighting with decay functions
 * - Context coherence measurement
 * - Domain-specific relevance boosting
 * - Learning from user feedback
 */

import type {
  ChatMessage,
  RelevantMessage,
  RelevanceMetadata
} from '../types/IntelligenceTypes';

export interface RelevanceAlgorithmConfig {
  algorithm: 'tfidf' | 'cosine' | 'semantic' | 'hybrid';
  weights: RelevanceWeights;
  boostFactors: BoostFactors;
  decayFunction: 'exponential' | 'linear' | 'logarithmic';
}

export interface RelevanceWeights {
  semantic: number;
  temporal: number;
  engagement: number;
  technical: number;
  coherence: number;
}

export interface BoostFactors {
  codeContent: number;
  errorMessages: number;
  solutionMessages: number;
  questionMessages: number;
  technicalTerms: number;
}

export interface ScoringResult {
  score: number;
  breakdown: RelevanceBreakdown;
  confidence: number;
  reasoning: string[];
}

export interface RelevanceBreakdown {
  semanticScore: number;
  temporalScore: number;
  engagementScore: number;
  technicalScore: number;
  coherenceScore: number;
  boostScore: number;
  finalScore: number;
}

export class RelevanceScorer {
  private config: RelevanceAlgorithmConfig = {
    algorithm: 'hybrid',
    weights: {
      semantic: 0.35,
      temporal: 0.20,
      engagement: 0.20,
      technical: 0.15,
      coherence: 0.10
    },
    boostFactors: {
      codeContent: 1.3,
      errorMessages: 1.4,
      solutionMessages: 1.5,
      questionMessages: 1.2,
      technicalTerms: 1.25
    },
    decayFunction: 'exponential'
  };

  private termFrequencyCache = new Map<string, Map<string, number>>();
  private documentFrequencyCache = new Map<string, number>();

  /**
   * Calculate comprehensive relevance score
   */
  async calculateRelevance(
    query: string,
    message: ChatMessage,
    context: ChatMessage[] = []
  ): Promise<ScoringResult> {
    const breakdown = await this.calculateRelevanceBreakdown(query, message, context);
    const boostScore = this.calculateBoostScore(message);
    const finalScore = this.combineScores(breakdown, boostScore);
    
    const confidence = this.calculateConfidence(breakdown, message);
    const reasoning = this.generateReasoning(breakdown, boostScore, message);

    return {
      score: finalScore,
      breakdown: {
        ...breakdown,
        boostScore,
        finalScore
      },
      confidence,
      reasoning
    };
  }

  /**
   * Calculate detailed relevance breakdown
   */
  private async calculateRelevanceBreakdown(
    query: string,
    message: ChatMessage,
    context: ChatMessage[]
  ): Promise<Omit<RelevanceBreakdown, 'boostScore' | 'finalScore'>> {
    const semanticScore = await this.calculateSemanticRelevance(query, message.content);
    const temporalScore = this.calculateTemporalRelevance(message.timestamp);
    const engagementScore = this.calculateEngagementRelevance(message);
    const technicalScore = this.calculateTechnicalRelevance(query, message.content);
    const coherenceScore = this.calculateCoherenceRelevance(message, context);

    return {
      semanticScore,
      temporalScore,
      engagementScore,
      technicalScore,
      coherenceScore
    };
  }

  /**
   * Calculate semantic relevance using multiple algorithms
   */
  private async calculateSemanticRelevance(query: string, content: string): Promise<number> {
    switch (this.config.algorithm) {
      case 'tfidf':
        return this.calculateTfIdfSimilarity(query, content);
      case 'cosine':
        return this.calculateCosineSimilarity(query, content);
      case 'semantic':
        return this.calculateSemanticSimilarity(query, content);
      case 'hybrid':
      default:
        return this.calculateHybridSimilarity(query, content);
    }
  }

  /**
   * TF-IDF based similarity calculation
   */
  private calculateTfIdfSimilarity(query: string, content: string): number {
    const queryTerms = this.extractTerms(query);
    const contentTerms = this.extractTerms(content);
    
    if (queryTerms.length === 0 || contentTerms.length === 0) return 0;

    // Calculate term frequencies
    const queryTf = this.calculateTermFrequency(queryTerms);
    const contentTf = this.calculateTermFrequency(contentTerms);
    
    // Calculate similarity using TF-IDF weights
    let similarity = 0;
    let queryNorm = 0;
    let contentNorm = 0;
    
    const allTerms = new Set([...queryTerms, ...contentTerms]);
    
    for (const term of allTerms) {
      const qTf = queryTf.get(term) || 0;
      const cTf = contentTf.get(term) || 0;
      
      // Simple IDF approximation (could be enhanced with corpus statistics)
      const idf = Math.log(1 + (1 / Math.max(this.getDocumentFrequency(term), 1)));
      
      const qWeight = qTf * idf;
      const cWeight = cTf * idf;
      
      similarity += qWeight * cWeight;
      queryNorm += qWeight * qWeight;
      contentNorm += cWeight * cWeight;
    }
    
    if (queryNorm === 0 || contentNorm === 0) return 0;
    
    return similarity / (Math.sqrt(queryNorm) * Math.sqrt(contentNorm));
  }

  /**
   * Cosine similarity calculation
   */
  private calculateCosineSimilarity(query: string, content: string): number {
    const queryTerms = this.extractTerms(query);
    const contentTerms = this.extractTerms(content);
    
    const querySet = new Set(queryTerms);
    const contentSet = new Set(contentTerms);
    const intersection = new Set([...querySet].filter(x => contentSet.has(x)));
    
    if (querySet.size === 0 || contentSet.size === 0) return 0;
    
    return intersection.size / Math.sqrt(querySet.size * contentSet.size);
  }

  /**
   * Enhanced semantic similarity with technical term boosting
   */
  private calculateSemanticSimilarity(query: string, content: string): number {
    const queryTerms = this.extractTerms(query);
    const contentTerms = this.extractTerms(content);
    
    const querySet = new Set(queryTerms);
    const contentSet = new Set(contentTerms);
    const intersection = new Set([...querySet].filter(x => contentSet.has(x)));
    
    let similarity = intersection.size / Math.max(querySet.size, contentSet.size);
    
    // Boost for technical term matches
    const technicalTerms = this.getTechnicalTerms();
    const technicalMatches = [...intersection].filter(term => technicalTerms.has(term.toLowerCase()));
    
    if (technicalMatches.length > 0) {
      similarity += technicalMatches.length * 0.1;
    }
    
    // Boost for exact phrase matches
    const phrases = this.extractPhrases(query);
    for (const phrase of phrases) {
      if (content.toLowerCase().includes(phrase.toLowerCase())) {
        similarity += 0.15;
      }
    }
    
    return Math.min(similarity, 1.0);
  }

  /**
   * Hybrid approach combining multiple algorithms
   */
  private calculateHybridSimilarity(query: string, content: string): number {
    const tfidf = this.calculateTfIdfSimilarity(query, content);
    const cosine = this.calculateCosineSimilarity(query, content);
    const semantic = this.calculateSemanticSimilarity(query, content);
    
    // Weighted combination
    return (tfidf * 0.4) + (cosine * 0.3) + (semantic * 0.3);
  }

  /**
   * Calculate temporal relevance with configurable decay
   */
  private calculateTemporalRelevance(timestamp: Date): number {
    const now = new Date();
    const minutesAgo = (now.getTime() - timestamp.getTime()) / (1000 * 60);
    
    switch (this.config.decayFunction) {
      case 'exponential':
        return Math.pow(0.95, minutesAgo / 5); // Decay every 5 minutes
      case 'linear':
        return Math.max(0, 1 - (minutesAgo / (24 * 60))); // Linear decay over 24 hours
      case 'logarithmic':
        return 1 / (1 + Math.log(1 + minutesAgo / 10)); // Logarithmic decay
      default:
        return Math.pow(0.95, minutesAgo / 5);
    }
  }

  /**
   * Calculate engagement-based relevance
   */
  private calculateEngagementRelevance(message: ChatMessage): number {
    let score = 0.5; // Base score
    const metadata = message.metadata;
    
    if (!metadata) return score;
    
    if (metadata.userFollowupQuestions && metadata.userFollowupQuestions > 0) {
      score += 0.25;
    }
    
    if (metadata.userSaidThanks) {
      score += 0.2;
    }
    
    if (metadata.ledToWorkingSolution) {
      score += 0.3;
    }
    
    if (metadata.containedCode) {
      score += 0.2;
    }
    
    return Math.min(score, 1.0);
  }

  /**
   * Calculate technical relevance score
   */
  private calculateTechnicalRelevance(query: string, content: string): number {
    const queryTechTerms = this.extractTechnicalTerms(query);
    const contentTechTerms = this.extractTechnicalTerms(content);
    
    if (queryTechTerms.length === 0 || contentTechTerms.length === 0) return 0;
    
    const querySet = new Set(queryTechTerms);
    const contentSet = new Set(contentTechTerms);
    const intersection = new Set([...querySet].filter(x => contentSet.has(x)));
    const union = new Set([...querySet, ...contentSet]);
    
    return intersection.size / union.size; // Jaccard similarity
  }

  /**
   * Calculate coherence with surrounding context
   */
  private calculateCoherenceRelevance(message: ChatMessage, context: ChatMessage[]): number {
    if (context.length === 0) return 0.5;
    
    // Find messages near this one in time
    const timeWindow = 10 * 60 * 1000; // 10 minutes
    const nearbyMessages = context.filter(msg => 
      Math.abs(msg.timestamp.getTime() - message.timestamp.getTime()) < timeWindow
    );
    
    if (nearbyMessages.length === 0) return 0.3;
    
    // Calculate semantic similarity with nearby messages
    let coherenceScore = 0;
    for (const nearbyMsg of nearbyMessages) {
      coherenceScore += this.calculateSemanticSimilarity(message.content, nearbyMsg.content);
    }
    
    return coherenceScore / nearbyMessages.length;
  }

  /**
   * Calculate boost score based on message characteristics
   */
  private calculateBoostScore(message: ChatMessage): number {
    let boost = 1.0;
    const content = message.content.toLowerCase();
    
    // Code content boost
    if (this.containsCode(content)) {
      boost *= this.config.boostFactors.codeContent;
    }
    
    // Error message boost
    if (this.containsErrorPatterns(content)) {
      boost *= this.config.boostFactors.errorMessages;
    }
    
    // Solution indicators boost
    if (this.containsSolutionIndicators(content)) {
      boost *= this.config.boostFactors.solutionMessages;
    }
    
    // Question indicators boost
    if (this.containsQuestionIndicators(content)) {
      boost *= this.config.boostFactors.questionMessages;
    }
    
    // Technical terms boost
    const techTermCount = this.extractTechnicalTerms(content).length;
    if (techTermCount > 0) {
      boost *= Math.pow(this.config.boostFactors.technicalTerms, Math.min(techTermCount / 5, 1));
    }
    
    return Math.min(boost, 2.0); // Cap boost at 2x
  }

  /**
   * Combine all scores into final relevance score
   */
  private combineScores(
    breakdown: Omit<RelevanceBreakdown, 'boostScore' | 'finalScore'>,
    boostScore: number
  ): number {
    const weights = this.config.weights;
    
    const weightedScore = 
      (breakdown.semanticScore * weights.semantic) +
      (breakdown.temporalScore * weights.temporal) +
      (breakdown.engagementScore * weights.engagement) +
      (breakdown.technicalScore * weights.technical) +
      (breakdown.coherenceScore * weights.coherence);
    
    return Math.min(weightedScore * boostScore, 1.0);
  }

  /**
   * Calculate confidence in the relevance score
   */
  private calculateConfidence(breakdown: Omit<RelevanceBreakdown, 'boostScore' | 'finalScore'>, message: ChatMessage): number {
    // Higher confidence when multiple factors agree
    const scores = [
      breakdown.semanticScore,
      breakdown.temporalScore,
      breakdown.engagementScore,
      breakdown.technicalScore,
      breakdown.coherenceScore
    ];
    
    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    
    // Lower variance = higher confidence
    const consistency = 1 - Math.min(variance, 1);
    
    // Boost confidence for longer messages (more content to analyze)
    const lengthFactor = Math.min(message.content.length / 500, 1);
    
    return (consistency * 0.7) + (lengthFactor * 0.3);
  }

  /**
   * Generate human-readable reasoning for the score
   */
  private generateReasoning(
    breakdown: Omit<RelevanceBreakdown, 'boostScore' | 'finalScore'>,
    boostScore: number,
    message: ChatMessage
  ): string[] {
    const reasoning: string[] = [];
    
    if (breakdown.semanticScore > 0.7) {
      reasoning.push('High semantic similarity with query terms');
    }
    
    if (breakdown.temporalScore > 0.8) {
      reasoning.push('Very recent message');
    } else if (breakdown.temporalScore < 0.3) {
      reasoning.push('Older message with reduced temporal relevance');
    }
    
    if (breakdown.engagementScore > 0.7) {
      reasoning.push('High user engagement (thanks, follow-ups, or solutions)');
    }
    
    if (breakdown.technicalScore > 0.6) {
      reasoning.push('Strong technical term overlap');
    }
    
    if (boostScore > 1.2) {
      reasoning.push('Boosted for containing code, errors, or technical content');
    }
    
    if (reasoning.length === 0) {
      reasoning.push('Basic relevance based on content similarity');
    }
    
    return reasoning;
  }

  // Utility methods
  private extractTerms(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(term => term.length > 2 && !this.isStopWord(term));
  }

  private extractPhrases(text: string, minLength: number = 2): string[] {
    const words = text.toLowerCase().split(/\s+/);
    const phrases: string[] = [];
    
    for (let i = 0; i <= words.length - minLength; i++) {
      phrases.push(words.slice(i, i + minLength).join(' '));
    }
    
    return phrases;
  }

  private extractTechnicalTerms(text: string): string[] {
    const terms = this.extractTerms(text);
    const techTerms = this.getTechnicalTerms();
    return terms.filter(term => techTerms.has(term));
  }

  private getTechnicalTerms(): Set<string> {
    return new Set([
      'react', 'vue', 'angular', 'svelte', 'typescript', 'javascript', 'node', 'express',
      'api', 'rest', 'graphql', 'database', 'sql', 'mongodb', 'postgres', 'mysql',
      'component', 'function', 'hook', 'state', 'props', 'context', 'reducer',
      'error', 'bug', 'debug', 'test', 'testing', 'unit', 'integration'
    ]);
  }

  private calculateTermFrequency(terms: string[]): Map<string, number> {
    const tf = new Map<string, number>();
    for (const term of terms) {
      tf.set(term, (tf.get(term) || 0) + 1);
    }
    
    // Normalize by document length
    for (const [term, freq] of tf) {
      tf.set(term, freq / terms.length);
    }
    
    return tf;
  }

  private getDocumentFrequency(term: string): number {
    return this.documentFrequencyCache.get(term) || 1;
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was',
      'will', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'can', 'could'
    ]);
    return stopWords.has(word);
  }

  private containsCode(content: string): boolean {
    return /```|\bfunction\b|\bclass\b|\bconst\b|\blet\b|\bvar\b|{|}|\[|\]/.test(content);
  }

  private containsErrorPatterns(content: string): boolean {
    return /error|exception|failed|broken|undefined|null|traceback|stack trace/i.test(content);
  }

  private containsSolutionIndicators(content: string): boolean {
    return /works|fixed|solved|solution|try this|here's how|this should work/i.test(content);
  }

  private containsQuestionIndicators(content: string): boolean {
    return /\?|how to|what is|why does|can you|help me|how do i/i.test(content);
  }

  /**
   * Update scoring configuration
   */
  updateConfig(newConfig: Partial<RelevanceAlgorithmConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ RelevanceScorer configuration updated');
  }

  /**
   * Get scoring statistics
   */
  getScoringStats(): {
    algorithm: string;
    weights: RelevanceWeights;
    cacheSize: number;
  } {
    return {
      algorithm: this.config.algorithm,
      weights: this.config.weights,
      cacheSize: this.termFrequencyCache.size
    };
  }
}