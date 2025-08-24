/**
 * ConfidenceScorer - Intelligent Confidence Calculation Engine
 * 
 * Calculates confidence scores for all intelligence components using sophisticated
 * algorithms that consider multiple factors including consistency, signal strength,
 * and historical accuracy patterns.
 * 
 * Key Features:
 * - Multi-factor confidence calculation
 * - Consistency analysis across different signal types
 * - Historical accuracy tracking
 * - Adaptive confidence thresholds
 * - Uncertainty quantification
 */

import type {
  QueryClassification,
  IntentAnalysis,
  ContextData,
  ClassificationIndicator,
  PatternMatch
} from '../types/IntelligenceTypes';

export interface ConfidenceFactors {
  signalStrength: number;
  signalConsistency: number;
  historicalAccuracy: number;
  patternReliability: number;
  contextualSupport: number;
  uncertaintyPenalty: number;
}

export interface ConfidenceBreakdown {
  overallConfidence: number;
  factors: ConfidenceFactors;
  riskAssessment: RiskAssessment;
  reliabilityScore: number;
  recommendations: string[];
}

export interface RiskAssessment {
  level: 'low' | 'medium' | 'high';
  factors: string[];
  mitigationStrategies: string[];
  confidenceRange: [number, number];
}

export interface HistoricalAccuracy {
  componentName: string;
  totalPredictions: number;
  correctPredictions: number;
  accuracy: number;
  lastUpdated: Date;
  recentTrend: 'improving' | 'stable' | 'declining';
}

export class ConfidenceScorer {
  private historicalAccuracy: Map<string, HistoricalAccuracy> = new Map();
  private confidenceThresholds = {
    high: 0.8,
    medium: 0.6,
    low: 0.4,
    unreliable: 0.2
  };

  constructor() {
    this.initializeHistoricalData();
  }

  /**
   * Calculate overall confidence from all intelligence components
   */
  async calculateOverallConfidence(
    classification: QueryClassification,
    intentAnalysis: IntentAnalysis,
    contextData?: ContextData
  ): Promise<number> {
    const factors = await this.calculateConfidenceFactors(
      classification,
      intentAnalysis,
      contextData
    );

    // Weighted combination of all factors
    const weights = {
      signalStrength: 0.25,
      signalConsistency: 0.20,
      historicalAccuracy: 0.20,
      patternReliability: 0.15,
      contextualSupport: 0.15,
      uncertaintyPenalty: 0.05
    };

    const weightedScore = 
      (factors.signalStrength * weights.signalStrength) +
      (factors.signalConsistency * weights.signalConsistency) +
      (factors.historicalAccuracy * weights.historicalAccuracy) +
      (factors.patternReliability * weights.patternReliability) +
      (factors.contextualSupport * weights.contextualSupport) -
      (factors.uncertaintyPenalty * weights.uncertaintyPenalty);

    const overallConfidence = Math.max(0, Math.min(1, weightedScore));

    console.log('🎯 CONFIDENCE CALCULATION:', {
      overallConfidence: overallConfidence.toFixed(3),
      factors: {
        signalStrength: factors.signalStrength.toFixed(3),
        consistency: factors.signalConsistency.toFixed(3),
        historical: factors.historicalAccuracy.toFixed(3),
        pattern: factors.patternReliability.toFixed(3),
        context: factors.contextualSupport.toFixed(3),
        uncertainty: factors.uncertaintyPenalty.toFixed(3)
      },
      level: this.getConfidenceLevel(overallConfidence)
    });

    return overallConfidence;
  }

  /**
   * Get detailed confidence breakdown for debugging and analysis
   */
  async getConfidenceBreakdown(
    classification: QueryClassification,
    intentAnalysis: IntentAnalysis,
    contextData?: ContextData
  ): Promise<ConfidenceBreakdown> {
    const factors = await this.calculateConfidenceFactors(
      classification,
      intentAnalysis,
      contextData
    );

    const overallConfidence = await this.calculateOverallConfidence(
      classification,
      intentAnalysis,
      contextData
    );

    const riskAssessment = this.assessRisk(factors, overallConfidence);
    const reliabilityScore = this.calculateReliabilityScore(factors);
    const recommendations = this.generateRecommendations(factors, overallConfidence);

    return {
      overallConfidence,
      factors,
      riskAssessment,
      reliabilityScore,
      recommendations
    };
  }

  /**
   * Calculate individual confidence factors
   */
  private async calculateConfidenceFactors(
    classification: QueryClassification,
    intentAnalysis: IntentAnalysis,
    contextData?: ContextData
  ): Promise<ConfidenceFactors> {
    const signalStrength = this.calculateSignalStrength(classification, intentAnalysis);
    const signalConsistency = this.calculateSignalConsistency(classification, intentAnalysis);
    const historicalAccuracy = this.getHistoricalAccuracy(['classification', 'intent_analysis']);
    const patternReliability = this.calculatePatternReliability(classification);
    const contextualSupport = this.calculateContextualSupport(contextData);
    const uncertaintyPenalty = this.calculateUncertaintyPenalty(classification, intentAnalysis);

    return {
      signalStrength,
      signalConsistency,
      historicalAccuracy,
      patternReliability,
      contextualSupport,
      uncertaintyPenalty
    };
  }

  /**
   * Calculate signal strength based on indicator quality
   */
  private calculateSignalStrength(
    classification: QueryClassification,
    intentAnalysis: IntentAnalysis
  ): number {
    // Average confidence across all indicators
    const classificationConfidence = classification.confidence || 0;
    const intentConfidence = intentAnalysis.overallConfidence || 0;
    
    // Weight by number of indicators (more indicators = more reliable)
    const indicatorCount = classification.indicators?.length || 0;
    const indicatorBonus = Math.min(indicatorCount * 0.1, 0.3);
    
    // Calculate average of layer confidences
    const layerConfidences = [
      intentAnalysis.surfaceLayer?.confidence || 0,
      intentAnalysis.deepLayer?.confidence || 0,
      intentAnalysis.contextualLayer?.confidence || 0
    ];
    const averageLayerConfidence = layerConfidences.reduce((sum, conf) => sum + conf, 0) / layerConfidences.length;
    
    const baseSignalStrength = (classificationConfidence + intentConfidence + averageLayerConfidence) / 3;
    
    return Math.min(baseSignalStrength + indicatorBonus, 1.0);
  }

  /**
   * Calculate signal consistency across different analysis layers
   */
  private calculateSignalConsistency(
    classification: QueryClassification,
    intentAnalysis: IntentAnalysis
  ): number {
    const layers = [
      intentAnalysis.surfaceLayer,
      intentAnalysis.deepLayer,
      intentAnalysis.contextualLayer
    ].filter(layer => layer && layer.confidence > 0);

    if (layers.length < 2) {
      return 0.5; // Neutral score if insufficient data
    }

    // Check consistency of intent types
    const intentTypes = layers.map(layer => layer.type);
    const uniqueIntents = new Set(intentTypes);
    const intentConsistency = 1 - (uniqueIntents.size - 1) / intentTypes.length;

    // Check consistency of confidence levels
    const confidences = layers.map(layer => layer.confidence);
    const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
    const confidenceVariance = confidences.reduce((sum, conf) => sum + Math.pow(conf - avgConfidence, 2), 0) / confidences.length;
    const confidenceConsistency = Math.max(0, 1 - confidenceVariance * 2);

    // Combined consistency score
    return (intentConsistency + confidenceConsistency) / 2;
  }

  /**
   * Get historical accuracy for components
   */
  private getHistoricalAccuracy(componentNames: string[]): number {
    let totalAccuracy = 0;
    let validComponents = 0;

    for (const componentName of componentNames) {
      const history = this.historicalAccuracy.get(componentName);
      if (history && history.totalPredictions > 5) { // Need sufficient data
        totalAccuracy += history.accuracy;
        validComponents++;
      }
    }

    if (validComponents === 0) {
      return 0.8; // Default high accuracy for new components
    }

    return totalAccuracy / validComponents;
  }

  /**
   * Calculate pattern reliability based on match quality
   */
  private calculatePatternReliability(classification: QueryClassification): number {
    if (!classification.indicators || classification.indicators.length === 0) {
      return 0.5;
    }

    // Analyze indicator types and weights
    const indicatorsByType = classification.indicators.reduce((acc, indicator) => {
      acc[indicator.type] = (acc[indicator.type] || 0) + indicator.confidence * indicator.weight;
      return acc;
    }, {} as Record<string, number>);

    // Strong patterns get higher reliability
    const strongPatterns = Object.values(indicatorsByType).filter(score => score > 0.6);
    const reliabilityScore = strongPatterns.length / Object.keys(indicatorsByType).length;

    return Math.min(reliabilityScore * 1.2, 1.0); // Boost for multiple strong patterns
  }

  /**
   * Calculate contextual support from context data
   */
  private calculateContextualSupport(contextData?: ContextData): number {
    if (!contextData || !contextData.selectedMessages) {
      return 0.3; // Low support without context
    }

    // Quality of context selection
    const qualityScore = contextData.qualityScore || 0.5;
    
    // Number of relevant messages (more = better support)
    const messageCount = contextData.selectedMessages.length;
    const messageBonus = Math.min(messageCount * 0.1, 0.3);
    
    // Average relevance of selected messages
    const avgRelevance = contextData.selectedMessages.length > 0
      ? contextData.selectedMessages.reduce((sum, msg) => sum + msg.relevanceScore, 0) / contextData.selectedMessages.length
      : 0;

    return Math.min(qualityScore + messageBonus + avgRelevance * 0.2, 1.0);
  }

  /**
   * Calculate uncertainty penalty for conflicting signals
   */
  private calculateUncertaintyPenalty(
    classification: QueryClassification,
    intentAnalysis: IntentAnalysis
  ): number {
    let penalty = 0;

    // Penalty for low classification confidence
    if (classification.confidence < this.confidenceThresholds.medium) {
      penalty += 0.2;
    }

    // Penalty for conflicting intent layers
    const layers = [
      intentAnalysis.surfaceLayer,
      intentAnalysis.deepLayer,
      intentAnalysis.contextualLayer
    ].filter(layer => layer);

    if (layers.length >= 2) {
      const types = layers.map(layer => layer.type);
      const uniqueTypes = new Set(types);
      if (uniqueTypes.size === types.length) {
        penalty += 0.15; // All different types = high uncertainty
      }
    }

    // Penalty for low overall intent confidence
    if (intentAnalysis.overallConfidence < this.confidenceThresholds.medium) {
      penalty += 0.1;
    }

    return Math.min(penalty, 0.5); // Cap penalty at 50%
  }

  /**
   * Assess risk based on confidence factors
   */
  private assessRisk(factors: ConfidenceFactors, overallConfidence: number): RiskAssessment {
    const riskFactors: string[] = [];
    const mitigationStrategies: string[] = [];

    // Analyze risk factors
    if (factors.signalStrength < 0.5) {
      riskFactors.push('Weak signal strength');
      mitigationStrategies.push('Gather more input signals');
    }

    if (factors.signalConsistency < 0.4) {
      riskFactors.push('Inconsistent signals across layers');
      mitigationStrategies.push('Re-analyze with focus on consistency');
    }

    if (factors.historicalAccuracy < 0.6) {
      riskFactors.push('Low historical accuracy');
      mitigationStrategies.push('Use fallback strategies');
    }

    if (factors.uncertaintyPenalty > 0.3) {
      riskFactors.push('High uncertainty detected');
      mitigationStrategies.push('Request clarification or use conservative approach');
    }

    // Determine risk level
    let level: 'low' | 'medium' | 'high';
    if (overallConfidence >= this.confidenceThresholds.high) {
      level = 'low';
    } else if (overallConfidence >= this.confidenceThresholds.medium) {
      level = 'medium';
    } else {
      level = 'high';
    }

    // Calculate confidence range
    const uncertainty = factors.uncertaintyPenalty * 0.3;
    const confidenceRange: [number, number] = [
      Math.max(0, overallConfidence - uncertainty),
      Math.min(1, overallConfidence + uncertainty)
    ];

    return {
      level,
      factors: riskFactors,
      mitigationStrategies,
      confidenceRange
    };
  }

  /**
   * Calculate overall reliability score
   */
  private calculateReliabilityScore(factors: ConfidenceFactors): number {
    // Reliability focuses on consistency and historical performance
    const reliabilityWeights = {
      consistency: 0.4,
      historical: 0.4,
      pattern: 0.2
    };

    return (
      factors.signalConsistency * reliabilityWeights.consistency +
      factors.historicalAccuracy * reliabilityWeights.historical +
      factors.patternReliability * reliabilityWeights.pattern
    );
  }

  /**
   * Generate recommendations based on confidence analysis
   */
  private generateRecommendations(
    factors: ConfidenceFactors,
    overallConfidence: number
  ): string[] {
    const recommendations: string[] = [];

    if (overallConfidence < this.confidenceThresholds.medium) {
      recommendations.push('Consider using fallback strategies');
    }

    if (factors.signalConsistency < 0.5) {
      recommendations.push('Re-analyze query with focus on consistency');
    }

    if (factors.contextualSupport < 0.4) {
      recommendations.push('Gather more context information');
    }

    if (factors.patternReliability < 0.5) {
      recommendations.push('Review pattern matching rules');
    }

    if (factors.uncertaintyPenalty > 0.3) {
      recommendations.push('Request user clarification');
    }

    if (recommendations.length === 0) {
      recommendations.push('Confidence analysis indicates reliable results');
    }

    return recommendations;
  }

  /**
   * Get confidence level description
   */
  private getConfidenceLevel(confidence: number): string {
    if (confidence >= this.confidenceThresholds.high) return 'high';
    if (confidence >= this.confidenceThresholds.medium) return 'medium';
    if (confidence >= this.confidenceThresholds.low) return 'low';
    return 'unreliable';
  }

  /**
   * Update historical accuracy based on validation results
   */
  updateHistoricalAccuracy(
    componentName: string,
    wasCorrect: boolean,
    confidence: number
  ): void {
    let history = this.historicalAccuracy.get(componentName);
    
    if (!history) {
      history = {
        componentName,
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0.8, // Default starting accuracy
        lastUpdated: new Date(),
        recentTrend: 'stable'
      };
    }

    history.totalPredictions++;
    if (wasCorrect) {
      history.correctPredictions++;
    }

    const previousAccuracy = history.accuracy;
    history.accuracy = history.correctPredictions / history.totalPredictions;
    history.lastUpdated = new Date();

    // Determine trend
    if (history.accuracy > previousAccuracy + 0.05) {
      history.recentTrend = 'improving';
    } else if (history.accuracy < previousAccuracy - 0.05) {
      history.recentTrend = 'declining';
    } else {
      history.recentTrend = 'stable';
    }

    this.historicalAccuracy.set(componentName, history);

    console.log(`📊 Historical accuracy updated for ${componentName}:`, {
      accuracy: history.accuracy.toFixed(3),
      total: history.totalPredictions,
      correct: history.correctPredictions,
      trend: history.recentTrend
    });
  }

  /**
   * Initialize historical data for components
   */
  private initializeHistoricalData(): void {
    const components = [
      'classification',
      'intent_analysis',
      'pattern_matching',
      'context_retrieval',
      'surface_analysis',
      'deep_analysis',
      'contextual_analysis'
    ];

    for (const component of components) {
      this.historicalAccuracy.set(component, {
        componentName: component,
        totalPredictions: 0,
        correctPredictions: 0,
        accuracy: 0.8, // Optimistic starting point
        lastUpdated: new Date(),
        recentTrend: 'stable'
      });
    }
  }

  /**
   * Get confidence statistics for monitoring
   */
  getConfidenceStats(): {
    componentAccuracy: Record<string, number>;
    averageAccuracy: number;
    totalPredictions: number;
    thresholds: typeof this.confidenceThresholds;
  } {
    const componentAccuracy: Record<string, number> = {};
    let totalPredictions = 0;
    let totalAccuracy = 0;
    let validComponents = 0;

    for (const [componentName, history] of this.historicalAccuracy) {
      componentAccuracy[componentName] = history.accuracy;
      totalPredictions += history.totalPredictions;
      
      if (history.totalPredictions > 0) {
        totalAccuracy += history.accuracy;
        validComponents++;
      }
    }

    const averageAccuracy = validComponents > 0 ? totalAccuracy / validComponents : 0;

    return {
      componentAccuracy,
      averageAccuracy,
      totalPredictions,
      thresholds: this.confidenceThresholds
    };
  }

  /**
   * Update confidence thresholds based on performance data
   */
  updateConfidenceThresholds(newThresholds: Partial<typeof this.confidenceThresholds>): void {
    this.confidenceThresholds = { ...this.confidenceThresholds, ...newThresholds };
    console.log('⚙️ Confidence thresholds updated:', this.confidenceThresholds);
  }
}