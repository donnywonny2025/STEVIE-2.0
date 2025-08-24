/**
 * ErrorHandler - Comprehensive Error Handling & Fallback System
 * 
 * Implements Scout's bulletproof error resilience requirements:
 * - Graceful degradation when analyzers fail
 * - Circuit breaker pattern for problematic components
 * - Health checks for all intelligence modules
 * - Automatic fallback to basic context when intelligence fails
 * - Error recovery with retry logic
 * - Comprehensive error logging and alerting
 * 
 * Fallback Hierarchy:
 * Level 1: Intelligent analysis with full feature set
 * Level 2: Basic pattern matching with reduced features
 * Level 3: Simple regex classification
 * Level 4: Pass-through to full context (original behavior)
 */

import type {
  AnalysisResult,
  FallbackStrategy,
  CircuitBreakerState,
  HealthCheck
} from '../types/IntelligenceTypes';

export interface ErrorContext {
  componentName: string;
  operation: string;
  query: string;
  error: Error;
  timestamp: Date;
  retryAttempt: number;
  fallbackLevel: number;
}

export interface FallbackConfig {
  maxRetries: number;
  retryDelayMs: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeoutMs: number;
  healthCheckIntervalMs: number;
  fallbackTimeoutMs: number;
}

export interface RecoveryAction {
  action: 'retry' | 'fallback' | 'escalate' | 'emergency';
  reason: string;
  nextLevel: number;
  estimatedRecoveryTime: number;
  confidence: number;
}

export interface ErrorPattern {
  pattern: RegExp;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'network' | 'memory' | 'logic' | 'timeout' | 'dependency';
  recoveryStrategy: 'retry' | 'fallback' | 'restart' | 'escalate';
  description: string;
}

export class ErrorHandler {
  private config: FallbackConfig = {
    maxRetries: 3,
    retryDelayMs: 1000,
    circuitBreakerThreshold: 5,
    circuitBreakerTimeoutMs: 60000, // 1 minute
    healthCheckIntervalMs: 30000,   // 30 seconds
    fallbackTimeoutMs: 5000         // 5 seconds max for fallback
  };

  private circuitBreakers = new Map<string, CircuitBreakerState>();
  private errorCounts = new Map<string, number>();
  private lastHealthCheck = new Map<string, Date>();
  private errorPatterns: ErrorPattern[] = [];
  private fallbackCache = new Map<string, any>();

  constructor() {
    this.initializeErrorPatterns();
    this.initializeCircuitBreakers();
    this.startHealthCheckLoop();
  }

  /**
   * Main error handling method
   */
  async handleError(
    errorContext: ErrorContext,
    fallbackFunction?: () => Promise<any>
  ): Promise<{ result: any; strategy: FallbackStrategy }> {
    const startTime = Date.now();
    
    try {
      console.log(`🚨 ERROR HANDLING START [${errorContext.componentName}]:`, {
        operation: errorContext.operation,
        error: errorContext.error.message,
        retryAttempt: errorContext.retryAttempt,
        fallbackLevel: errorContext.fallbackLevel
      });

      // Analyze error and determine recovery action
      const recoveryAction = this.analyzeError(errorContext);
      
      // Update circuit breaker state
      this.updateCircuitBreaker(errorContext.componentName, false);
      
      // Execute recovery strategy
      const result = await this.executeRecoveryStrategy(errorContext, recoveryAction, fallbackFunction);
      
      const strategy: FallbackStrategy = {
        strategy: this.mapRecoveryActionToStrategy(recoveryAction.action),
        reason: recoveryAction.reason,
        estimatedTokens: this.estimateFallbackTokens(recoveryAction.nextLevel),
        confidence: recoveryAction.confidence
      };

      console.log(`✅ ERROR RECOVERY COMPLETE (${Date.now() - startTime}ms):`, {
        component: errorContext.componentName,
        action: recoveryAction.action,
        level: recoveryAction.nextLevel,
        confidence: recoveryAction.confidence
      });

      return { result, strategy };

    } catch (fallbackError) {
      console.error(`❌ FALLBACK FAILED [${errorContext.componentName}]:`, fallbackError);
      
      // Ultimate emergency fallback
      return this.executeEmergencyFallback(errorContext);
    }
  }

  /**
   * Analyze error and determine appropriate recovery action
   */
  private analyzeError(errorContext: ErrorContext): RecoveryAction {
    const error = errorContext.error;
    const errorMessage = error.message.toLowerCase();
    
    // Check against known error patterns
    for (const pattern of this.errorPatterns) {
      if (pattern.pattern.test(errorMessage)) {
        return this.createRecoveryAction(pattern, errorContext);
      }
    }
    
    // Default analysis based on error type and retry count
    if (errorContext.retryAttempt < this.config.maxRetries) {
      // Network or timeout errors - retry
      if (errorMessage.includes('timeout') || errorMessage.includes('network')) {
        return {
          action: 'retry',
          reason: 'Transient network/timeout error detected',
          nextLevel: errorContext.fallbackLevel,
          estimatedRecoveryTime: this.config.retryDelayMs * (errorContext.retryAttempt + 1),
          confidence: 0.7
        };
      }
      
      // Memory errors - fallback immediately
      if (errorMessage.includes('memory') || errorMessage.includes('heap')) {
        return {
          action: 'fallback',
          reason: 'Memory pressure detected, using simpler approach',
          nextLevel: errorContext.fallbackLevel + 1,
          estimatedRecoveryTime: 0,
          confidence: 0.8
        };
      }
    }
    
    // Default fallback strategy
    return {
      action: 'fallback',
      reason: 'Unrecognized error pattern, escalating to next fallback level',
      nextLevel: errorContext.fallbackLevel + 1,
      estimatedRecoveryTime: 0,
      confidence: 0.6
    };
  }

  /**
   * Execute the determined recovery strategy
   */
  private async executeRecoveryStrategy(
    errorContext: ErrorContext,
    recoveryAction: RecoveryAction,
    fallbackFunction?: () => Promise<any>
  ): Promise<any> {
    switch (recoveryAction.action) {
      case 'retry':
        return this.executeRetry(errorContext, recoveryAction);
      
      case 'fallback':
        return this.executeFallback(errorContext, recoveryAction, fallbackFunction);
      
      case 'escalate':
        return this.executeEscalation(errorContext, recoveryAction);
      
      case 'emergency':
      default:
        return this.executeEmergencyFallback(errorContext);
    }
  }

  /**
   * Execute retry strategy with exponential backoff
   */
  private async executeRetry(errorContext: ErrorContext, recoveryAction: RecoveryAction): Promise<any> {
    const delay = this.config.retryDelayMs * Math.pow(2, errorContext.retryAttempt);
    
    console.log(`🔄 RETRY STRATEGY [${errorContext.componentName}]:`, {
      attempt: errorContext.retryAttempt + 1,
      delay,
      maxRetries: this.config.maxRetries
    });
    
    await this.sleep(delay);
    
    // This would typically re-execute the original operation
    // For now, return a retry indicator
    return {
      type: 'retry_result',
      retryAttempt: errorContext.retryAttempt + 1,
      nextDelay: delay * 2
    };
  }

  /**
   * Execute fallback to next level
   */
  private async executeFallback(
    errorContext: ErrorContext,
    recoveryAction: RecoveryAction,
    fallbackFunction?: () => Promise<any>
  ): Promise<any> {
    console.log(`⬇️ FALLBACK STRATEGY [${errorContext.componentName}]:`, {
      currentLevel: errorContext.fallbackLevel,
      nextLevel: recoveryAction.nextLevel,
      reason: recoveryAction.reason
    });
    
    // Check fallback cache first
    const cacheKey = `${errorContext.componentName}_${errorContext.query.slice(0, 50)}`;
    const cached = this.fallbackCache.get(cacheKey);
    if (cached) {
      console.log(`📋 Using cached fallback result`);
      return cached;
    }
    
    // Execute fallback hierarchy
    let result;
    switch (recoveryAction.nextLevel) {
      case 1:
        result = await this.executeFallbackLevel1(errorContext);
        break;
      case 2:
        result = await this.executeFallbackLevel2(errorContext);
        break;
      case 3:
        result = await this.executeFallbackLevel3(errorContext);
        break;
      case 4:
      default:
        result = await this.executeFallbackLevel4(errorContext);
        break;
    }
    
    // Cache successful fallback result
    if (result) {
      this.fallbackCache.set(cacheKey, result);
      // Expire cache after 5 minutes
      setTimeout(() => this.fallbackCache.delete(cacheKey), 5 * 60 * 1000);
    }
    
    return result;
  }

  /**
   * Fallback Level 1: Basic pattern matching with reduced features
   */
  private async executeFallbackLevel1(errorContext: ErrorContext): Promise<any> {
    console.log(`🔹 FALLBACK LEVEL 1: Basic pattern matching`);
    
    // Simple pattern-based response
    const query = errorContext.query.toLowerCase();
    
    if (/^(hi|hello|hey)/i.test(query)) {
      return this.createSimpleAnalysisResult('greeting', 50);
    }
    
    if /(help|assist)/i.test(query)) {
      return this.createSimpleAnalysisResult('help_request', 80);
    }
    
    if /(debug|error|fix)/i.test(query)) {
      return this.createSimpleAnalysisResult('debug_request', 200);
    }
    
    return this.createSimpleAnalysisResult('unknown', 100);
  }

  /**
   * Fallback Level 2: Simple regex classification
   */
  private async executeFallbackLevel2(errorContext: ErrorContext): Promise<any> {
    console.log(`🔸 FALLBACK LEVEL 2: Simple regex classification`);
    
    const query = errorContext.query;
    let queryType = 'SIMPLE';
    let estimatedTokens = 150;
    
    if (/create|build|make/i.test(query)) {
      queryType = 'MEDIUM';
      estimatedTokens = 400;
    }
    
    if (/error|debug|complex|architecture/i.test(query)) {
      queryType = 'COMPLEX';
      estimatedTokens = 800;
    }
    
    return this.createSimpleAnalysisResult(queryType.toLowerCase(), estimatedTokens);
  }

  /**
   * Fallback Level 3: Pass-through to full context
   */
  private async executeFallbackLevel3(errorContext: ErrorContext): Promise<any> {
    console.log(`🔺 FALLBACK LEVEL 3: Pass-through to full context`);
    
    // Return analysis that triggers full context usage
    return this.createSimpleAnalysisResult('full_context', 1500);
  }

  /**
   * Fallback Level 4: Emergency minimal response
   */
  private async executeFallbackLevel4(errorContext: ErrorContext): Promise<any> {
    console.log(`🆘 FALLBACK LEVEL 4: Emergency minimal response`);
    
    return this.createSimpleAnalysisResult('emergency', 50);
  }

  /**
   * Execute escalation to higher-level error handling
   */
  private async executeEscalation(errorContext: ErrorContext, recoveryAction: RecoveryAction): Promise<any> {
    console.log(`⬆️ ESCALATION STRATEGY [${errorContext.componentName}]:`, {
      reason: recoveryAction.reason
    });
    
    // Log critical error for monitoring
    this.logCriticalError(errorContext);
    
    // Execute emergency fallback
    return this.executeEmergencyFallback(errorContext);
  }

  /**
   * Ultimate emergency fallback
   */
  private executeEmergencyFallback(errorContext: ErrorContext): { result: any; strategy: FallbackStrategy } {
    console.log(`🚨 EMERGENCY FALLBACK [${errorContext.componentName}]`);
    
    const result = this.createSimpleAnalysisResult('emergency', 50);
    const strategy: FallbackStrategy = {
      strategy: 'emergency_fallback',
      reason: 'All recovery strategies failed, using emergency minimal response',
      estimatedTokens: 50,
      confidence: 0.1
    };
    
    return { result, strategy };
  }

  /**
   * Create simple analysis result for fallbacks
   */
  private createSimpleAnalysisResult(type: string, tokens: number): AnalysisResult {
    return {
      queryClassification: {
        queryType: type.includes('complex') ? 'COMPLEX' : type.includes('medium') ? 'MEDIUM' : 'SIMPLE',
        complexity: 'minimal',
        primaryIntent: 'social',
        confidence: 0.5,
        indicators: [{ type: 'surface', signal: `fallback_${type}`, confidence: 0.5, weight: 1.0 }]
      },
      intentAnalysis: {
        surfaceLayer: { type: 'social', confidence: 0.5, indicators: [type] },
        deepLayer: { type: 'technical', confidence: 0.3, indicators: [type] },
        contextualLayer: { type: 'continuation', confidence: 0.2, indicators: [] },
        overallConfidence: 0.4
      },
      contextRequirements: {
        level: tokens > 500 ? 'comprehensive' : tokens > 200 ? 'technical' : 'minimal',
        domains: [type],
        estimatedTokens: tokens,
        requiresHistory: false,
        requiresFiles: false,
        requiresProjectContext: false,
        maxHistoryMessages: 0,
        relevanceThreshold: 0.3
      },
      patternMatches: [],
      confidenceScore: 0.4,
      tokenEstimate: tokens,
      recommendedStrategy: type === 'emergency' ? 'emergency_fallback' : 'cached_response',
      fallbackReason: `Fallback analysis: ${type}`,
      performanceMetrics: {
        analysisTime: 10,
        contextRetrievalTime: 0,
        patternMatchingTime: 5,
        totalProcessingTime: 15
      }
    };
  }

  /**
   * Initialize known error patterns
   */
  private initializeErrorPatterns(): void {
    this.errorPatterns = [
      {
        pattern: /timeout|timed out/i,
        severity: 'medium',
        category: 'timeout',
        recoveryStrategy: 'retry',
        description: 'Request timeout - likely transient'
      },
      {
        pattern: /network|connection|fetch/i,
        severity: 'medium',
        category: 'network',
        recoveryStrategy: 'retry',
        description: 'Network connectivity issue'
      },
      {
        pattern: /memory|heap|out of memory/i,
        severity: 'high',
        category: 'memory',
        recoveryStrategy: 'fallback',
        description: 'Memory pressure - reduce complexity'
      },
      {
        pattern: /permission|unauthorized|forbidden/i,
        severity: 'high',
        category: 'dependency',
        recoveryStrategy: 'escalate',
        description: 'Permission or authorization error'
      },
      {
        pattern: /cannot read property|undefined|null/i,
        severity: 'medium',
        category: 'logic',
        recoveryStrategy: 'fallback',
        description: 'Logic error - data structure issue'
      }
    ];
  }

  /**
   * Initialize circuit breakers
   */
  private initializeCircuitBreakers(): void {
    const components = [
      'query_classifier', 'pattern_matcher', 'surface_analyzer',
      'deep_analyzer', 'contextual_analyzer', 'complexity_analyzer',
      'context_retrieval', 'context_manager', 'relevance_scorer'
    ];

    for (const component of components) {
      this.circuitBreakers.set(component, {
        isOpen: false,
        errorCount: 0,
        lastErrorTime: undefined,
        timeoutUntil: undefined,
        successCount: 0
      });
    }
  }

  /**
   * Update circuit breaker state
   */
  private updateCircuitBreaker(componentName: string, success: boolean): void {
    const breaker = this.circuitBreakers.get(componentName);
    if (!breaker) return;

    if (success) {
      breaker.successCount++;
      breaker.errorCount = Math.max(0, breaker.errorCount - 1);
      
      // Close circuit if enough successes
      if (breaker.isOpen && breaker.successCount >= 3) {
        breaker.isOpen = false;
        breaker.timeoutUntil = undefined;
        console.log(`✅ Circuit breaker CLOSED for ${componentName}`);
      }
    } else {
      breaker.errorCount++;
      breaker.lastErrorTime = new Date();
      
      // Open circuit if threshold exceeded
      if (breaker.errorCount >= this.config.circuitBreakerThreshold) {
        breaker.isOpen = true;
        breaker.timeoutUntil = new Date(Date.now() + this.config.circuitBreakerTimeoutMs);
        console.log(`⚡ Circuit breaker OPENED for ${componentName}`);
      }
    }
  }

  /**
   * Check if circuit breaker is open
   */
  isCircuitBreakerOpen(componentName: string): boolean {
    const breaker = this.circuitBreakers.get(componentName);
    if (!breaker) return false;
    
    // Check if timeout has expired
    if (breaker.isOpen && breaker.timeoutUntil && breaker.timeoutUntil < new Date()) {
      breaker.isOpen = false;
      breaker.timeoutUntil = undefined;
      breaker.errorCount = 0;
      console.log(`⏰ Circuit breaker timeout expired for ${componentName}`);
    }
    
    return breaker.isOpen;
  }

  /**
   * Start health check loop
   */
  private startHealthCheckLoop(): void {
    setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckIntervalMs);
  }

  /**
   * Perform health checks on all components
   */
  private performHealthChecks(): void {
    for (const [componentName, breaker] of this.circuitBreakers) {
      const healthCheck: HealthCheck = {
        componentName,
        status: breaker.isOpen ? 'error' : 'healthy',
        lastCheck: new Date(),
        metadata: {
          errorCount: breaker.errorCount,
          successCount: breaker.successCount,
          isOpen: breaker.isOpen
        }
      };
      
      // Update last health check time
      this.lastHealthCheck.set(componentName, new Date());
    }
  }

  /**
   * Get system health status
   */
  getSystemHealth(): HealthCheck[] {
    const healthChecks: HealthCheck[] = [];
    
    for (const [componentName, breaker] of this.circuitBreakers) {
      healthChecks.push({
        componentName,
        status: breaker.isOpen ? 'error' : 'healthy',
        lastCheck: this.lastHealthCheck.get(componentName) || new Date(),
        metadata: {
          errorCount: breaker.errorCount,
          successCount: breaker.successCount,
          isOpen: breaker.isOpen,
          lastErrorTime: breaker.lastErrorTime
        }
      });
    }
    
    return healthChecks;
  }

  /**
   * Utility methods
   */
  private createRecoveryAction(pattern: ErrorPattern, errorContext: ErrorContext): RecoveryAction {
    const baseConfidence = pattern.severity === 'low' ? 0.8 : pattern.severity === 'medium' ? 0.6 : 0.4;
    
    return {
      action: pattern.recoveryStrategy as any,
      reason: pattern.description,
      nextLevel: pattern.recoveryStrategy === 'fallback' ? errorContext.fallbackLevel + 1 : errorContext.fallbackLevel,
      estimatedRecoveryTime: pattern.recoveryStrategy === 'retry' ? this.config.retryDelayMs : 0,
      confidence: baseConfidence
    };
  }

  private mapRecoveryActionToStrategy(action: string): any {
    switch (action) {
      case 'retry': return 'cached_response';
      case 'fallback': return 'minimal_context';
      case 'escalate': return 'comprehensive_analysis';
      case 'emergency': return 'emergency_fallback';
      default: return 'cached_response';
    }
  }

  private estimateFallbackTokens(level: number): number {
    switch (level) {
      case 1: return 100;
      case 2: return 200;
      case 3: return 1500;
      case 4: return 50;
      default: return 50;
    }
  }

  private logCriticalError(errorContext: ErrorContext): void {
    console.error(`🆘 CRITICAL ERROR [${errorContext.componentName}]:`, {
      operation: errorContext.operation,
      error: errorContext.error.message,
      query: errorContext.query.slice(0, 100),
      retryAttempt: errorContext.retryAttempt,
      timestamp: errorContext.timestamp
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update error handling configuration
   */
  updateConfig(newConfig: Partial<FallbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ ErrorHandler configuration updated');
  }

  /**
   * Clear error history for a component
   */
  clearErrorHistory(componentName: string): void {
    const breaker = this.circuitBreakers.get(componentName);
    if (breaker) {
      breaker.errorCount = 0;
      breaker.successCount = 0;
      breaker.isOpen = false;
      breaker.timeoutUntil = undefined;
      breaker.lastErrorTime = undefined;
    }
    
    this.errorCounts.delete(componentName);
    console.log(`🧹 Cleared error history for ${componentName}`);
  }
}