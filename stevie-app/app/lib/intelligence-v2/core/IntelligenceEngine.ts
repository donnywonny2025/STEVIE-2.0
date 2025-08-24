/**
 * IntelligenceEngine - Main Orchestrator for STEVIE Intelligence System
 * 
 * Coordinates all intelligence components while maintaining the critical 97% token efficiency.
 * Implements Scout's proven multi-pass analysis approach with clean modular architecture.
 * 
 * Key Responsibilities:
 * - Orchestrate query analysis pipeline
 * - Coordinate context retrieval and optimization
 * - Manage fallback strategies and error handling
 * - Track performance metrics and token usage
 * - Ensure seamless degradation when components fail
 */

import type {
  AnalysisResult,
  ChatContext,
  IntelligenceConfig,
  PerformanceMetrics,
  FallbackStrategy,
  HealthCheck,
  SavingsAnalytics,
  CircuitBreakerState
} from '../types/IntelligenceTypes';

// Import specialized components (lazy-loaded for performance)
import { QueryClassifier } from './QueryClassifier';
import { PatternMatcher } from './PatternMatcher';
import { ConfidenceScorer } from './ConfidenceScorer';

// Component imports (dynamically loaded)
let SurfaceIntentAnalyzer: any;
let DeepIntentAnalyzer: any;
let ContextualIntentAnalyzer: any;
let ComplexityAnalyzer: any;
let ContextRetrieval: any;
let ContextManager: any;
let RelevanceScorer: any;
let TokenTracker: any;
let PerformanceMonitor: any;
let IntelligenceLogger: any;

export interface EngineComponents {
  queryClassifier: QueryClassifier;
  patternMatcher: PatternMatcher;
  confidenceScorer: ConfidenceScorer;
  // Analyzers loaded on demand
  surfaceAnalyzer?: any;
  deepAnalyzer?: any;
  contextualAnalyzer?: any;
  complexityAnalyzer?: any;
  // Context components loaded on demand
  contextRetrieval?: any;
  contextManager?: any;
  relevanceScorer?: any;
  // Monitoring components
  tokenTracker?: any;
  performanceMonitor?: any;
  logger?: any;
}

export class IntelligenceEngine {
  private config: IntelligenceConfig;
  private components: EngineComponents;
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private healthChecks: Map<string, HealthCheck> = new Map();
  private isInitialized = false;
  
  constructor(config: IntelligenceConfig) {
    this.config = config;
    
    // Initialize core components immediately (lightweight)
    this.components = {
      queryClassifier: new QueryClassifier(config.patterns),
      patternMatcher: new PatternMatcher(config.patterns),
      confidenceScorer: new ConfidenceScorer()
    };
    
    // Initialize circuit breakers for all components
    this.initializeCircuitBreakers();
  }

  /**
   * Main analysis method - orchestrates the complete intelligence pipeline
   */
  async analyzeQuery(query: string, context: ChatContext): Promise<AnalysisResult> {
    const startTime = Date.now();
    const queryId = this.generateQueryId();
    
    try {
      // Start performance tracking
      await this.startPerformanceTracking(queryId, query);
      
      console.log(`🚀 INTELLIGENCE ENGINE START [${queryId}]:`, { 
        query: query.slice(0, 100) + (query.length > 100 ? '...' : ''),
        contextLength: context.messages?.length || 0
      });

      // Phase 1: Quick pattern matching (fastest path - maintains 97% efficiency)
      const patternMatch = await this.executeWithFallback(
        'pattern_matching',
        () => this.components.patternMatcher.matchPatterns(query),
        null
      );

      if (patternMatch?.isComplete) {
        console.log(`✅ PATTERN MATCH COMPLETE [${queryId}]:`, {
          pattern: patternMatch.patternType,
          tokens: patternMatch.estimatedTokens,
          strategy: 'cached_response'
        });
        
        return this.buildPatternBasedResult(patternMatch, queryId, startTime);
      }

      // Phase 2: Query classification
      const classification = await this.executeWithFallback(
        'query_classification',
        () => this.components.queryClassifier.classifyQuery(query, context),
        { queryType: 'SIMPLE', complexity: 'minimal', confidence: 0.3 }
      );

      // Phase 3: Multi-layer intent analysis (lazy-loaded analyzers)
      const intentAnalysis = await this.executeIntentAnalysis(query, context, classification);

      // Phase 4: Context requirements determination
      const contextRequirements = await this.executeWithFallback(
        'context_requirements',
        () => this.determineContextRequirements(query, classification, intentAnalysis),
        { level: 'minimal', estimatedTokens: 50, requiresHistory: false, requiresFiles: false }
      );

      // Phase 5: Context retrieval (only if needed)
      const contextData = await this.executeContextRetrieval(query, context, contextRequirements);

      // Phase 6: Confidence scoring and final analysis
      const confidenceScore = await this.executeWithFallback(
        'confidence_scoring',
        () => this.components.confidenceScorer.calculateOverallConfidence(
          classification, intentAnalysis, contextData
        ),
        0.5
      );

      // Build final result
      const result: AnalysisResult = {
        queryClassification: classification,
        intentAnalysis,
        contextRequirements,
        patternMatches: patternMatch ? [patternMatch] : [],
        confidenceScore,
        tokenEstimate: contextRequirements.estimatedTokens,
        recommendedStrategy: this.determineProcessingStrategy(classification, contextRequirements),
        performanceMetrics: await this.getPerformanceMetrics(queryId, startTime)
      };

      // Track token savings
      await this.trackTokenSavings(queryId, result);

      console.log(`✅ INTELLIGENCE ANALYSIS COMPLETE [${queryId}]:`, {
        queryType: classification.queryType,
        strategy: result.recommendedStrategy,
        tokens: result.tokenEstimate,
        confidence: result.confidenceScore,
        processingTime: `${Date.now() - startTime}ms`
      });

      return result;

    } catch (error) {
      console.error(`❌ INTELLIGENCE ENGINE ERROR [${queryId}]:`, error);
      
      // Emergency fallback - never let the system break
      return this.buildEmergencyFallback(query, queryId, startTime, error);
    }
  }

  /**
   * Execute intent analysis with lazy-loaded analyzers
   */
  private async executeIntentAnalysis(query: string, context: ChatContext, classification: any) {
    // Load analyzers on demand (performance optimization)
    if (!this.components.surfaceAnalyzer) {
      await this.loadAnalyzers();
    }

    const [surfaceLayer, deepLayer, contextualLayer] = await Promise.all([
      this.executeWithFallback(
        'surface_analysis',
        () => this.components.surfaceAnalyzer?.analyze(query),
        { type: 'social', confidence: 0.3, indicators: [] }
      ),
      this.executeWithFallback(
        'deep_analysis',
        () => this.components.deepAnalyzer?.analyze(query),
        { type: 'technical', confidence: 0.3, indicators: [] }
      ),
      this.executeWithFallback(
        'contextual_analysis',
        () => this.components.contextualAnalyzer?.analyze(query, context.messages),
        { type: 'continuation', confidence: 0.2, indicators: [] }
      )
    ]);

    return {
      surfaceLayer,
      deepLayer,
      contextualLayer,
      overallConfidence: (surfaceLayer.confidence + deepLayer.confidence + contextualLayer.confidence) / 3
    };
  }

  /**
   * Execute context retrieval if required
   */
  private async executeContextRetrieval(query: string, context: ChatContext, requirements: any) {
    if (requirements.level === 'minimal') {
      return { selectedMessages: [], estimatedTokens: 0, selectionStrategy: 'minimal' };
    }

    // Load context components on demand
    if (!this.components.contextRetrieval) {
      await this.loadContextComponents();
    }

    return await this.executeWithFallback(
      'context_retrieval',
      () => this.components.contextRetrieval?.findRelevantContext(query, context.messages, {
        maxMessages: requirements.maxHistoryMessages || 5,
        relevanceThreshold: requirements.relevanceThreshold || 0.3
      }),
      { selectedMessages: [], estimatedTokens: 0, selectionStrategy: 'fallback_empty' }
    );
  }

  /**
   * Execute function with circuit breaker pattern
   */
  private async executeWithFallback<T>(
    componentName: string,
    operation: () => Promise<T> | T,
    fallbackValue: T
  ): Promise<T> {
    const circuitBreaker = this.circuitBreakers.get(componentName);
    
    if (circuitBreaker?.isOpen) {
      console.log(`⚡ Circuit breaker OPEN for ${componentName}, using fallback`);
      return fallbackValue;
    }

    try {
      const result = await operation();
      this.recordSuccess(componentName);
      return result;
    } catch (error) {
      console.error(`❌ Component ${componentName} failed:`, error);
      this.recordFailure(componentName);
      return fallbackValue;
    }
  }

  /**
   * Lazy load analyzer components
   */
  private async loadAnalyzers() {
    try {
      const [
        { SurfaceIntentAnalyzer: Surface },
        { DeepIntentAnalyzer: Deep },
        { ContextualIntentAnalyzer: Contextual },
        { ComplexityAnalyzer: Complexity }
      ] = await Promise.all([
        import('../analyzers/SurfaceIntentAnalyzer'),
        import('../analyzers/DeepIntentAnalyzer'),
        import('../analyzers/ContextualIntentAnalyzer'),
        import('../analyzers/ComplexityAnalyzer')
      ]);

      this.components.surfaceAnalyzer = new Surface();
      this.components.deepAnalyzer = new Deep();
      this.components.contextualAnalyzer = new Contextual();
      this.components.complexityAnalyzer = new Complexity();

      console.log('📦 Analyzers loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load analyzers:', error);
    }
  }

  /**
   * Lazy load context components
   */
  private async loadContextComponents() {
    try {
      const [
        { ContextRetrieval: Retrieval },
        { ContextManager: Manager },
        { RelevanceScorer: Scorer }
      ] = await Promise.all([
        import('../context/ContextRetrieval'),
        import('../context/ContextManager'),
        import('../context/RelevanceScorer')
      ]);

      this.components.contextRetrieval = new Retrieval();
      this.components.contextManager = new Manager();
      this.components.relevanceScorer = new Scorer();

      console.log('📦 Context components loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load context components:', error);
    }
  }

  /**
   * Initialize circuit breakers for all components
   */
  private initializeCircuitBreakers() {
    const components = [
      'pattern_matching', 'query_classification', 'surface_analysis',
      'deep_analysis', 'contextual_analysis', 'context_requirements',
      'context_retrieval', 'confidence_scoring'
    ];

    for (const component of components) {
      this.circuitBreakers.set(component, {
        isOpen: false,
        errorCount: 0,
        successCount: 0
      });
    }
  }

  /**
   * Record component success
   */
  private recordSuccess(componentName: string) {
    const breaker = this.circuitBreakers.get(componentName);
    if (breaker) {
      breaker.successCount++;
      breaker.errorCount = Math.max(0, breaker.errorCount - 1);
      
      // Close circuit if enough successes
      if (breaker.isOpen && breaker.successCount >= 3) {
        breaker.isOpen = false;
        console.log(`✅ Circuit breaker CLOSED for ${componentName}`);
      }
    }
  }

  /**
   * Record component failure
   */
  private recordFailure(componentName: string) {
    const breaker = this.circuitBreakers.get(componentName);
    if (breaker) {
      breaker.errorCount++;
      breaker.lastErrorTime = new Date();
      
      // Open circuit if too many failures
      if (breaker.errorCount >= 3) {
        breaker.isOpen = true;
        breaker.timeoutUntil = new Date(Date.now() + 60000); // 1 minute timeout
        console.log(`⚡ Circuit breaker OPENED for ${componentName}`);
      }
    }
  }

  /**
   * Helper methods for result building
   */
  private buildPatternBasedResult(patternMatch: any, queryId: string, startTime: number): AnalysisResult {
    return {
      queryClassification: {
        queryType: patternMatch.queryType || 'SIMPLE',
        complexity: 'minimal',
        primaryIntent: 'social',
        confidence: patternMatch.confidence || 0.9,
        indicators: [{ type: 'surface', signal: 'pattern_match', confidence: 0.9, weight: 1.0 }]
      },
      intentAnalysis: {
        surfaceLayer: { type: 'social', confidence: 0.9, indicators: ['pattern_match'] },
        deepLayer: { type: 'social', confidence: 0.8, indicators: ['cached_response'] },
        contextualLayer: { type: 'social', confidence: 0.5, indicators: [] },
        overallConfidence: 0.85
      },
      contextRequirements: {
        level: 'minimal',
        domains: ['social'],
        estimatedTokens: patternMatch.estimatedTokens || 50,
        requiresHistory: false,
        requiresFiles: false,
        requiresProjectContext: false,
        maxHistoryMessages: 0,
        relevanceThreshold: 0.3
      },
      patternMatches: [patternMatch],
      confidenceScore: patternMatch.confidence || 0.9,
      tokenEstimate: patternMatch.estimatedTokens || 50,
      recommendedStrategy: 'cached_response',
      performanceMetrics: {
        analysisTime: Date.now() - startTime,
        contextRetrievalTime: 0,
        patternMatchingTime: Date.now() - startTime,
        totalProcessingTime: Date.now() - startTime
      }
    };
  }

  private buildEmergencyFallback(query: string, queryId: string, startTime: number, error: any): AnalysisResult {
    console.log(`🚨 EMERGENCY FALLBACK ACTIVATED [${queryId}]:`, error.message);
    
    return {
      queryClassification: {
        queryType: 'SIMPLE',
        complexity: 'minimal',
        primaryIntent: 'social',
        confidence: 0.3,
        indicators: [{ type: 'surface', signal: 'emergency_fallback', confidence: 0.3, weight: 1.0 }]
      },
      intentAnalysis: {
        surfaceLayer: { type: 'social', confidence: 0.3, indicators: ['emergency'] },
        deepLayer: { type: 'technical', confidence: 0.3, indicators: ['emergency'] },
        contextualLayer: { type: 'continuation', confidence: 0.1, indicators: [] },
        overallConfidence: 0.3
      },
      contextRequirements: {
        level: 'minimal',
        domains: [],
        estimatedTokens: 50,
        requiresHistory: false,
        requiresFiles: false,
        requiresProjectContext: false,
        maxHistoryMessages: 0,
        relevanceThreshold: 0.3
      },
      patternMatches: [],
      confidenceScore: 0.3,
      tokenEstimate: 50,
      recommendedStrategy: 'emergency_fallback',
      fallbackReason: `Emergency fallback: ${error.message}`,
      performanceMetrics: {
        analysisTime: Date.now() - startTime,
        contextRetrievalTime: 0,
        patternMatchingTime: 0,
        totalProcessingTime: Date.now() - startTime
      }
    };
  }

  /**
   * Utility methods
   */
  private generateQueryId(): string {
    return `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async startPerformanceTracking(queryId: string, query: string): Promise<void> {
    // Implementation for performance tracking initialization
  }

  private async getPerformanceMetrics(queryId: string, startTime: number): Promise<PerformanceMetrics> {
    return {
      analysisTime: Date.now() - startTime,
      contextRetrievalTime: 0,
      patternMatchingTime: 0,
      totalProcessingTime: Date.now() - startTime
    };
  }

  private async trackTokenSavings(queryId: string, result: AnalysisResult): Promise<void> {
    // Implementation for token savings tracking
  }

  private determineContextRequirements(query: string, classification: any, intentAnalysis: any): any {
    // Determine context requirements based on analysis
    return {
      level: classification.complexity === 'minimal' ? 'minimal' : 'technical',
      domains: ['technical'],
      estimatedTokens: classification.complexity === 'minimal' ? 50 : 300,
      requiresHistory: classification.queryType !== 'SIMPLE',
      requiresFiles: classification.complexity === 'advanced',
      requiresProjectContext: false,
      maxHistoryMessages: 5,
      relevanceThreshold: 0.3
    };
  }

  private determineProcessingStrategy(classification: any, requirements: any): any {
    if (requirements.level === 'minimal') return 'minimal_context';
    if (requirements.level === 'technical') return 'technical_context';
    return 'comprehensive_analysis';
  }

  /**
   * Health check methods
   */
  async getSystemHealth(): Promise<HealthCheck[]> {
    const checks: HealthCheck[] = [];
    
    for (const [componentName, breaker] of this.circuitBreakers) {
      checks.push({
        componentName,
        status: breaker.isOpen ? 'error' : 'healthy',
        lastCheck: new Date(),
        metadata: {
          errorCount: breaker.errorCount,
          successCount: breaker.successCount,
          isOpen: breaker.isOpen
        }
      });
    }
    
    return checks;
  }

  /**
   * Configuration updates
   */
  updateConfig(newConfig: Partial<IntelligenceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Intelligence Engine configuration updated');
  }
}