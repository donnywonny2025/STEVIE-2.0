/**
 * QueryClassifier - Pure Classification Logic
 * 
 * Extracted from AdvancedQueryAnalyzer to focus solely on query classification.
 * Determines query types, complexity levels, and routing decisions while 
 * maintaining the proven 97% token efficiency patterns.
 * 
 * Key Responsibilities:
 * - Classify query intent and complexity
 * - Determine appropriate processing strategy
 * - Maintain compatibility with existing patterns
 * - Provide confidence scoring for classifications
 */

import type {
  QueryClassification,
  QueryType,
  ComplexityLevel,
  IntentType,
  ClassificationIndicator,
  ChatContext,
  PatternConfig
} from '../types/IntelligenceTypes';

export interface ClassificationWeights {
  technicalTerms: number;
  socialIndicators: number;
  complexityKeywords: number;
  errorPatterns: number;
  contextDependency: number;
}

export class QueryClassifier {
  private technicalVerbs = [
    'debug', 'fix', 'optimize', 'refactor', 'implement', 'create', 'deploy', 
    'test', 'build', 'setup', 'configure', 'install', 'update', 'add', 'remove',
    'design', 'analyze', 'review', 'merge', 'commit', 'push', 'pull', 'clone'
  ];

  private technicalNouns = [
    'component', 'function', 'api', 'database', 'error', 'bug', 'endpoint', 
    'state', 'props', 'hook', 'service', 'module', 'class', 'interface', 
    'variable', 'array', 'object', 'response', 'request', 'server', 'client',
    'framework', 'library', 'package', 'dependency', 'environment', 'config'
  ];

  private complexityKeywords = [
    'architecture', 'design pattern', 'scalability', 'performance', 'security',
    'authentication', 'authorization', 'optimization', 'refactoring', 'testing',
    'deployment', 'docker', 'kubernetes', 'microservices', 'database design',
    'concurrent', 'asynchronous', 'distributed', 'load balancing', 'caching'
  ];

  private socialPatterns = [
    { pattern: /^(hi|hello|hey|sup|what's up)/i, weight: 0.8, type: 'greeting' },
    { pattern: /(please|thank|thanks|thx|appreciated)/i, weight: 0.6, type: 'politeness' },
    { pattern: /(help|assist|support)/i, weight: 0.5, type: 'help_request' },
    { pattern: /^(ok|okay|cool|got it|sounds good)/i, weight: 0.7, type: 'acknowledgment' }
  ];

  private errorPatterns = [
    { pattern: /error|exception|failed|broken|not working|undefined|null/i, weight: 0.8 },
    { pattern: /stack trace|line \d+|syntax error|reference error/i, weight: 0.9 },
    { pattern: /500|404|401|403|cors|network error/i, weight: 0.7 },
    { pattern: /crash|freeze|hang|stuck|won't start/i, weight: 0.8 }
  ];

  private weights: ClassificationWeights = {
    technicalTerms: 0.4,
    socialIndicators: 0.2,
    complexityKeywords: 0.3,
    errorPatterns: 0.6,
    contextDependency: 0.2
  };

  constructor(private config: PatternConfig) {}

  /**
   * Main classification method
   */
  async classifyQuery(query: string, context: ChatContext): Promise<QueryClassification> {
    const indicators: ClassificationIndicator[] = [];
    
    // Step 1: Analyze technical content
    const technicalScore = this.analyzeTechnicalContent(query, indicators);
    
    // Step 2: Analyze social patterns
    const socialScore = this.analyzeSocialPatterns(query, indicators);
    
    // Step 3: Analyze complexity signals
    const complexityScore = this.analyzeComplexitySignals(query, indicators);
    
    // Step 4: Analyze error patterns
    const errorScore = this.analyzeErrorPatterns(query, indicators);
    
    // Step 5: Analyze context dependency
    const contextScore = this.analyzeContextDependency(query, context, indicators);
    
    // Step 6: Calculate weighted scores
    const scores = this.calculateWeightedScores(
      technicalScore, socialScore, complexityScore, errorScore, contextScore
    );
    
    // Step 7: Determine final classification
    const classification = this.determineClassification(scores, indicators);
    
    console.log(`🎯 QUERY CLASSIFICATION:`, {
      query: query.slice(0, 50) + (query.length > 50 ? '...' : ''),
      queryType: classification.queryType,
      complexity: classification.complexity,
      intent: classification.primaryIntent,
      confidence: classification.confidence,
      indicatorCount: indicators.length
    });
    
    return classification;
  }

  /**
   * Analyze technical content in the query
   */
  private analyzeTechnicalContent(query: string, indicators: ClassificationIndicator[]): number {
    const words = query.toLowerCase().split(/\s+/);
    const foundVerbs: string[] = [];
    const foundNouns: string[] = [];
    
    // Find technical verbs and nouns
    for (const word of words) {
      for (const verb of this.technicalVerbs) {
        if (word.includes(verb)) {
          foundVerbs.push(verb);
          indicators.push({
            type: 'deep',
            signal: `technical_verb:${verb}`,
            confidence: 0.7,
            weight: this.weights.technicalTerms
          });
        }
      }
      
      for (const noun of this.technicalNouns) {
        if (word.includes(noun)) {
          foundNouns.push(noun);
          indicators.push({
            type: 'deep',
            signal: `technical_noun:${noun}`,
            confidence: 0.6,
            weight: this.weights.technicalTerms
          });
        }
      }
    }
    
    // Calculate proximity score for technical verb-noun pairs
    const proximityScore = this.calculateProximityScore(query, foundVerbs, foundNouns);
    const termDensity = (foundVerbs.length + foundNouns.length) / words.length;
    
    return Math.min((foundVerbs.length * 0.3) + (foundNouns.length * 0.2) + proximityScore + (termDensity * 0.5), 1.0);
  }

  /**
   * Analyze social patterns and politeness markers
   */
  private analyzeSocialPatterns(query: string, indicators: ClassificationIndicator[]): number {
    let socialScore = 0;
    
    for (const { pattern, weight, type } of this.socialPatterns) {
      if (pattern.test(query)) {
        socialScore += weight * 0.3;
        indicators.push({
          type: 'surface',
          signal: `social_pattern:${type}`,
          confidence: weight,
          weight: this.weights.socialIndicators
        });
      }
    }
    
    return Math.min(socialScore, 1.0);
  }

  /**
   * Analyze complexity escalation signals
   */
  private analyzeComplexitySignals(query: string, indicators: ClassificationIndicator[]): number {
    let complexityScore = 0;
    
    for (const keyword of this.complexityKeywords) {
      if (query.toLowerCase().includes(keyword)) {
        complexityScore += 0.4;
        indicators.push({
          type: 'complexity',
          signal: `complexity_keyword:${keyword}`,
          confidence: 0.8,
          weight: this.weights.complexityKeywords
        });
        break; // Avoid double-counting overlapping keywords
      }
    }
    
    // Multi-file and project-level indicators
    if (/multiple files|several files|project|app|application|system/i.test(query)) {
      complexityScore += 0.3;
      indicators.push({
        type: 'complexity',
        signal: 'multi_file_scope',
        confidence: 0.6,
        weight: this.weights.complexityKeywords
      });
    }
    
    return Math.min(complexityScore, 1.0);
  }

  /**
   * Analyze error and debugging patterns
   */
  private analyzeErrorPatterns(query: string, indicators: ClassificationIndicator[]): number {
    let errorScore = 0;
    
    for (const { pattern, weight } of this.errorPatterns) {
      if (pattern.test(query)) {
        errorScore += weight * 0.4;
        indicators.push({
          type: 'complexity',
          signal: `error_pattern:${pattern.source.slice(0, 20)}`,
          confidence: weight,
          weight: this.weights.errorPatterns
        });
      }
    }
    
    return Math.min(errorScore, 1.0);
  }

  /**
   * Analyze context dependency signals
   */
  private analyzeContextDependency(query: string, context: ChatContext, indicators: ClassificationIndicator[]): number {
    const continuationWords = ['this', 'that', 'it', 'also', 'and', 'plus', 'additionally'];
    const followupWords = ['but', 'however', 'actually', 'wait', 'now'];
    
    let contextScore = 0;
    const words = query.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      if (continuationWords.includes(word)) {
        contextScore += 0.2;
        indicators.push({
          type: 'contextual',
          signal: `continuation:${word}`,
          confidence: 0.6,
          weight: this.weights.contextDependency
        });
      }
      
      if (followupWords.includes(word)) {
        contextScore += 0.3;
        indicators.push({
          type: 'contextual',
          signal: `followup:${word}`,
          confidence: 0.7,
          weight: this.weights.contextDependency
        });
      }
    }
    
    // Boost if we have conversation history
    if (context.messages && context.messages.length > 0) {
      contextScore += 0.2;
      indicators.push({
        type: 'contextual',
        signal: 'has_conversation_history',
        confidence: 0.5,
        weight: this.weights.contextDependency
      });
    }
    
    return Math.min(contextScore, 1.0);
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
   * Calculate weighted scores from all analysis components
   */
  private calculateWeightedScores(
    technical: number,
    social: number,
    complexity: number,
    error: number,
    context: number
  ) {
    return {
      technical: technical * this.weights.technicalTerms,
      social: social * this.weights.socialIndicators,
      complexity: complexity * this.weights.complexityKeywords,
      error: error * this.weights.errorPatterns,
      context: context * this.weights.contextDependency,
      total: (technical * this.weights.technicalTerms) +
             (social * this.weights.socialIndicators) +
             (complexity * this.weights.complexityKeywords) +
             (error * this.weights.errorPatterns) +
             (context * this.weights.contextDependency)
    };
  }

  /**
   * Determine final classification based on weighted scores
   */
  private determineClassification(scores: any, indicators: ClassificationIndicator[]): QueryClassification {
    // Determine primary intent
    let primaryIntent: IntentType = 'social';
    if (scores.error > 0.4) {
      primaryIntent = 'error';
    } else if (scores.technical > 0.5) {
      primaryIntent = 'technical';
    } else if (scores.complexity > 0.6) {
      primaryIntent = 'complex';
    } else if (scores.context > 0.4) {
      primaryIntent = 'continuation';
    }
    
    // Determine complexity level
    let complexity: ComplexityLevel = 'minimal';
    if (scores.complexity > 0.7 || scores.error > 0.6) {
      complexity = 'expert';
    } else if (scores.complexity > 0.5 || scores.technical > 0.7) {
      complexity = 'advanced';
    } else if (scores.technical > 0.5 || scores.error > 0.3) {
      complexity = 'intermediate';
    } else if (scores.technical > 0.3) {
      complexity = 'basic';
    }
    
    // Determine query type
    let queryType: QueryType = 'SIMPLE';
    if (complexity === 'expert' || scores.error > 0.7) {
      queryType = 'COMPLEX';
    } else if (complexity === 'advanced' || scores.technical > 0.6) {
      queryType = 'COMPLEX';
    } else if (complexity === 'intermediate' || scores.technical > 0.4) {
      queryType = 'MEDIUM';
    }
    
    // Calculate overall confidence
    const confidence = Math.min(scores.total, 1.0);
    
    return {
      queryType,
      complexity,
      primaryIntent,
      confidence,
      indicators
    };
  }

  /**
   * Assess confidence for a specific classification
   */
  assessClassificationConfidence(
    query: string,
    classification: QueryClassification
  ): number {
    // Implement confidence assessment logic
    const indicatorStrength = classification.indicators.reduce(
      (sum, indicator) => sum + (indicator.confidence * indicator.weight),
      0
    ) / classification.indicators.length;
    
    const lengthFactor = Math.min(query.length / 100, 1.0); // Longer queries tend to be more reliable
    const consistencyFactor = this.assessIndicatorConsistency(classification.indicators);
    
    return Math.min((indicatorStrength + lengthFactor + consistencyFactor) / 3, 1.0);
  }

  /**
   * Assess consistency of classification indicators
   */
  private assessIndicatorConsistency(indicators: ClassificationIndicator[]): number {
    if (indicators.length === 0) return 0;
    
    const typeGroups = indicators.reduce((groups, indicator) => {
      groups[indicator.type] = (groups[indicator.type] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);
    
    const dominantType = Object.keys(typeGroups).reduce((a, b) => 
      typeGroups[a] > typeGroups[b] ? a : b
    );
    
    const dominanceRatio = typeGroups[dominantType] / indicators.length;
    return dominanceRatio; // Higher consistency = better confidence
  }

  /**
   * Update classification weights (for learning/optimization)
   */
  updateWeights(newWeights: Partial<ClassificationWeights>): void {
    this.weights = { ...this.weights, ...newWeights };
    console.log('⚙️ Classification weights updated');
  }

  /**
   * Get current classification statistics
   */
  getClassificationStats(): {
    weights: ClassificationWeights;
    patternCounts: {
      technicalVerbs: number;
      technicalNouns: number;
      complexityKeywords: number;
      socialPatterns: number;
      errorPatterns: number;
    };
  } {
    return {
      weights: this.weights,
      patternCounts: {
        technicalVerbs: this.technicalVerbs.length,
        technicalNouns: this.technicalNouns.length,
        complexityKeywords: this.complexityKeywords.length,
        socialPatterns: this.socialPatterns.length,
        errorPatterns: this.errorPatterns.length
      }
    };
  }
}