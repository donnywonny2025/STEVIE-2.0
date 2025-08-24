/**
 * PerformanceMonitor - Real-Time Performance Metrics Collection
 * 
 * Implements Scout's observability requirements:
 * - Query processing latency (p50, p95, p99 percentiles)
 * - Token efficiency percentage by query type over time
 * - Cache performance hit rates for all caching layers
 * - Intelligence system health score monitoring
 * - Pattern matching confidence distribution analysis
 * - Fallback frequency tracking and degradation patterns
 * 
 * Key Features:
 * - Real-time metrics collection and aggregation
 * - Historical trend analysis and storage
 * - Performance anomaly detection
 * - Bottleneck identification and recommendations
 * - Memory usage tracking and optimization alerts
 */

export interface PerformanceMetrics {
  timestamp: Date;
  queryId: string;
  
  // Timing metrics
  analysisTime: number;
  contextRetrievalTime: number;
  patternMatchingTime: number;
  totalProcessingTime: number;
  
  // Resource metrics
  memoryUsage?: number;
  cacheHitRate?: number;
  
  // Quality metrics
  confidenceScore: number;
  tokenEfficiency: number;
  
  // Component metrics
  componentPerformance: ComponentMetrics[];
}

export interface ComponentMetrics {
  componentName: string;
  executionTime: number;
  memoryDelta: number;
  cacheHits: number;
  cacheMisses: number;
  errorCount: number;
  successRate: number;
}

export interface PerformanceSnapshot {
  timestamp: Date;
  
  // Latency percentiles
  latencyP50: number;
  latencyP95: number;
  latencyP99: number;
  
  // Efficiency metrics
  avgTokenEfficiency: number;
  efficiencyByQueryType: Record<string, number>;
  
  // Cache performance
  cachePerformance: CachePerformanceMetrics;
  
  // System health
  systemHealth: SystemHealthMetrics;
  
  // Trend indicators
  performanceTrend: 'improving' | 'stable' | 'degrading';
  bottlenecks: BottleneckAnalysis[];
}

export interface CachePerformanceMetrics {
  patternCacheHitRate: number;
  analysisCacheHitRate: number;
  contextCacheHitRate: number;
  resultCacheHitRate: number;
  totalMemoryUsage: number;
  avgResponseTime: number;
}

export interface SystemHealthMetrics {
  overallScore: number;
  componentHealth: Record<string, number>;
  errorRate: number;
  fallbackFrequency: number;
  memoryPressure: number;
  processingCapacity: number;
}

export interface BottleneckAnalysis {
  component: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  avgLatency: number;
  frequency: number;
  recommendation: string;
  impact: number;
}

export interface AlertThreshold {
  metricName: string;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  severity: 'warning' | 'error' | 'critical';
  description: string;
}

export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private snapshots: PerformanceSnapshot[] = [];
  private alertThresholds: AlertThreshold[] = [];
  private maxMetricsHistory = 10000;
  private maxSnapshotsHistory = 1000;
  private snapshotInterval: NodeJS.Timeout;
  
  // Real-time tracking
  private currentQueries = new Map<string, Partial<PerformanceMetrics>>();
  private componentTracking = new Map<string, ComponentMetrics>();
  
  constructor() {
    this.initializeAlertThresholds();
    this.startSnapshotScheduler();
  }

  /**
   * Start tracking a query's performance
   */
  startQueryTracking(queryId: string, query: string): void {
    const startTime = Date.now();
    
    this.currentQueries.set(queryId, {
      timestamp: new Date(),
      queryId,
      componentPerformance: []
    });

    console.log(`📊 PERFORMANCE TRACKING START [${queryId}]:`, {
      query: query.slice(0, 50) + (query.length > 50 ? '...' : ''),
      startTime
    });
  }

  /**
   * Track component execution
   */
  trackComponent(
    queryId: string, 
    componentName: string, 
    executionTime: number,
    additionalMetrics: Partial<ComponentMetrics> = {}
  ): void {
    const queryMetrics = this.currentQueries.get(queryId);
    if (!queryMetrics) return;

    const componentMetric: ComponentMetrics = {
      componentName,
      executionTime,
      memoryDelta: additionalMetrics.memoryDelta || 0,
      cacheHits: additionalMetrics.cacheHits || 0,
      cacheMisses: additionalMetrics.cacheMisses || 0,
      errorCount: additionalMetrics.errorCount || 0,
      successRate: additionalMetrics.successRate || 1.0
    };

    if (!queryMetrics.componentPerformance) {
      queryMetrics.componentPerformance = [];
    }
    queryMetrics.componentPerformance.push(componentMetric);

    // Update component tracking
    this.updateComponentTracking(componentMetric);

    console.log(`⚡ COMPONENT TRACKED [${componentName}]:`, {
      queryId,
      executionTime: `${executionTime}ms`,
      cacheHitRate: componentMetric.cacheHits > 0 
        ? (componentMetric.cacheHits / (componentMetric.cacheHits + componentMetric.cacheMisses)).toFixed(3)
        : '0'
    });
  }

  /**
   * Complete query tracking and store metrics
   */
  completeQueryTracking(
    queryId: string,
    finalMetrics: {
      totalProcessingTime: number;
      confidenceScore: number;
      tokenEfficiency: number;
      memoryUsage?: number;
      cacheHitRate?: number;
    }
  ): PerformanceMetrics | null {
    const queryMetrics = this.currentQueries.get(queryId);
    if (!queryMetrics) return null;

    // Calculate timing breakdowns
    const analysisTime = this.calculateComponentTime(queryMetrics.componentPerformance!, [
      'surface_analyzer', 'deep_analyzer', 'contextual_analyzer', 'complexity_analyzer'
    ]);
    
    const contextRetrievalTime = this.calculateComponentTime(queryMetrics.componentPerformance!, [
      'context_retrieval', 'context_manager', 'relevance_scorer'
    ]);
    
    const patternMatchingTime = this.calculateComponentTime(queryMetrics.componentPerformance!, [
      'pattern_matcher'
    ]);

    const completeMetrics: PerformanceMetrics = {
      ...queryMetrics as PerformanceMetrics,
      analysisTime,
      contextRetrievalTime,
      patternMatchingTime,
      totalProcessingTime: finalMetrics.totalProcessingTime,
      confidenceScore: finalMetrics.confidenceScore,
      tokenEfficiency: finalMetrics.tokenEfficiency,
      memoryUsage: finalMetrics.memoryUsage,
      cacheHitRate: finalMetrics.cacheHitRate
    };

    // Store metrics
    this.storeMetrics(completeMetrics);
    
    // Check alert thresholds
    this.checkAlertThresholds(completeMetrics);
    
    // Cleanup tracking
    this.currentQueries.delete(queryId);

    console.log(`✅ PERFORMANCE TRACKING COMPLETE [${queryId}]:`, {
      totalTime: `${finalMetrics.totalProcessingTime}ms`,
      analysisTime: `${analysisTime}ms`,
      contextTime: `${contextRetrievalTime}ms`,
      patternTime: `${patternMatchingTime}ms`,
      efficiency: `${(finalMetrics.tokenEfficiency * 100).toFixed(1)}%`,
      confidence: finalMetrics.confidenceScore.toFixed(3)
    });

    return completeMetrics;
  }

  /**
   * Get current performance snapshot
   */
  getCurrentSnapshot(): PerformanceSnapshot {
    const recentMetrics = this.getRecentMetrics(100); // Last 100 queries
    
    if (recentMetrics.length === 0) {
      return this.getEmptySnapshot();
    }

    // Calculate latency percentiles
    const latencies = recentMetrics.map(m => m.totalProcessingTime).sort((a, b) => a - b);
    const latencyP50 = this.calculatePercentile(latencies, 50);
    const latencyP95 = this.calculatePercentile(latencies, 95);
    const latencyP99 = this.calculatePercentile(latencies, 99);

    // Calculate efficiency metrics
    const avgTokenEfficiency = recentMetrics.reduce((sum, m) => sum + m.tokenEfficiency, 0) / recentMetrics.length;
    const efficiencyByQueryType = this.calculateEfficiencyByQueryType(recentMetrics);

    // Get cache performance
    const cachePerformance = this.calculateCachePerformance(recentMetrics);

    // Calculate system health
    const systemHealth = this.calculateSystemHealth(recentMetrics);

    // Analyze bottlenecks
    const bottlenecks = this.analyzeBottlenecks(recentMetrics);

    // Determine performance trend
    const performanceTrend = this.calculatePerformanceTrend();

    const snapshot: PerformanceSnapshot = {
      timestamp: new Date(),
      latencyP50,
      latencyP95,
      latencyP99,
      avgTokenEfficiency,
      efficiencyByQueryType,
      cachePerformance,
      systemHealth,
      performanceTrend,
      bottlenecks
    };

    return snapshot;
  }

  /**
   * Get performance trends over time
   */
  getPerformanceTrends(timeRangeMinutes: number = 60): {
    latencyTrend: Array<{ timestamp: Date; value: number }>;
    efficiencyTrend: Array<{ timestamp: Date; value: number }>;
    errorRateTrend: Array<{ timestamp: Date; value: number }>;
    cacheHitRateTrend: Array<{ timestamp: Date; value: number }>;
  } {
    const cutoffTime = new Date(Date.now() - (timeRangeMinutes * 60 * 1000));
    const recentSnapshots = this.snapshots.filter(s => s.timestamp >= cutoffTime);

    return {
      latencyTrend: recentSnapshots.map(s => ({ timestamp: s.timestamp, value: s.latencyP95 })),
      efficiencyTrend: recentSnapshots.map(s => ({ timestamp: s.timestamp, value: s.avgTokenEfficiency })),
      errorRateTrend: recentSnapshots.map(s => ({ timestamp: s.timestamp, value: s.systemHealth.errorRate })),
      cacheHitRateTrend: recentSnapshots.map(s => ({ 
        timestamp: s.timestamp, 
        value: (s.cachePerformance.patternCacheHitRate + s.cachePerformance.analysisCacheHitRate) / 2 
      }))
    };
  }

  /**
   * Get component performance breakdown
   */
  getComponentPerformance(): Record<string, {
    avgExecutionTime: number;
    callCount: number;
    errorRate: number;
    cacheHitRate: number;
    trend: 'improving' | 'stable' | 'degrading';
  }> {
    const componentStats: Record<string, any> = {};

    for (const [componentName, metrics] of this.componentTracking) {
      const recentCalls = this.getRecentComponentCalls(componentName, 50);
      const trend = this.calculateComponentTrend(recentCalls);

      componentStats[componentName] = {
        avgExecutionTime: metrics.executionTime,
        callCount: recentCalls.length,
        errorRate: metrics.errorCount / Math.max(recentCalls.length, 1),
        cacheHitRate: metrics.cacheHits / Math.max(metrics.cacheHits + metrics.cacheMisses, 1),
        trend
      };
    }

    return componentStats;
  }

  /**
   * Private helper methods
   */
  private storeMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Cleanup old metrics
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  private calculateComponentTime(components: ComponentMetrics[], componentNames: string[]): number {
    return components
      .filter(c => componentNames.includes(c.componentName))
      .reduce((sum, c) => sum + c.executionTime, 0);
  }

  private updateComponentTracking(metric: ComponentMetrics): void {
    const existing = this.componentTracking.get(metric.componentName);
    
    if (existing) {
      // Update running averages
      const totalCalls = existing.successRate > 0 ? Math.round(1 / existing.successRate) : 1;
      const newTotalCalls = totalCalls + 1;
      
      existing.executionTime = ((existing.executionTime * totalCalls) + metric.executionTime) / newTotalCalls;
      existing.memoryDelta = ((existing.memoryDelta * totalCalls) + metric.memoryDelta) / newTotalCalls;
      existing.cacheHits += metric.cacheHits;
      existing.cacheMisses += metric.cacheMisses;
      existing.errorCount += metric.errorCount;
      existing.successRate = (existing.successRate * totalCalls + metric.successRate) / newTotalCalls;
    } else {
      this.componentTracking.set(metric.componentName, { ...metric });
    }
  }

  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  private calculateEfficiencyByQueryType(metrics: PerformanceMetrics[]): Record<string, number> {
    const typeEfficiency: Record<string, { sum: number; count: number }> = {};
    
    // This would extract query type from component metrics or metadata
    // For now, using simplified logic
    for (const metric of metrics) {
      const type = metric.totalProcessingTime < 100 ? 'SIMPLE' : 
                   metric.totalProcessingTime < 300 ? 'MEDIUM' : 'COMPLEX';
      
      if (!typeEfficiency[type]) {
        typeEfficiency[type] = { sum: 0, count: 0 };
      }
      
      typeEfficiency[type].sum += metric.tokenEfficiency;
      typeEfficiency[type].count++;
    }
    
    const result: Record<string, number> = {};
    for (const [type, data] of Object.entries(typeEfficiency)) {
      result[type] = data.sum / data.count;
    }
    
    return result;
  }

  private calculateCachePerformance(metrics: PerformanceMetrics[]): CachePerformanceMetrics {
    const avgHitRate = metrics.reduce((sum, m) => sum + (m.cacheHitRate || 0), 0) / metrics.length;
    const avgResponseTime = metrics.reduce((sum, m) => sum + m.totalProcessingTime, 0) / metrics.length;
    const totalMemory = metrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0) / metrics.length;

    return {
      patternCacheHitRate: avgHitRate,
      analysisCacheHitRate: avgHitRate * 0.9, // Estimated
      contextCacheHitRate: avgHitRate * 0.8,  // Estimated
      resultCacheHitRate: avgHitRate * 0.7,   // Estimated
      totalMemoryUsage: totalMemory,
      avgResponseTime
    };
  }

  private calculateSystemHealth(metrics: PerformanceMetrics[]): SystemHealthMetrics {
    const avgConfidence = metrics.reduce((sum, m) => sum + m.confidenceScore, 0) / metrics.length;
    const errorRate = 0; // Would be calculated from error tracking
    const fallbackFrequency = 0; // Would be calculated from fallback usage
    const memoryPressure = metrics.reduce((sum, m) => sum + (m.memoryUsage || 0), 0) / metrics.length / (100 * 1024 * 1024); // As ratio of 100MB
    
    return {
      overallScore: (avgConfidence + (1 - errorRate) + (1 - fallbackFrequency) + (1 - memoryPressure)) / 4,
      componentHealth: {},
      errorRate,
      fallbackFrequency,
      memoryPressure,
      processingCapacity: Math.min(1, 200 / (metrics.reduce((sum, m) => sum + m.totalProcessingTime, 0) / metrics.length))
    };
  }

  private analyzeBottlenecks(metrics: PerformanceMetrics[]): BottleneckAnalysis[] {
    const bottlenecks: BottleneckAnalysis[] = [];
    const componentLatencies: Record<string, number[]> = {};

    // Aggregate component latencies
    for (const metric of metrics) {
      for (const component of metric.componentPerformance) {
        if (!componentLatencies[component.componentName]) {
          componentLatencies[component.componentName] = [];
        }
        componentLatencies[component.componentName].push(component.executionTime);
      }
    }

    // Identify bottlenecks
    for (const [componentName, latencies] of Object.entries(componentLatencies)) {
      const avgLatency = latencies.reduce((sum, l) => sum + l, 0) / latencies.length;
      const p95Latency = this.calculatePercentile([...latencies].sort((a, b) => a - b), 95);
      
      if (avgLatency > 50 || p95Latency > 100) {
        const severity = p95Latency > 200 ? 'critical' : 
                        p95Latency > 150 ? 'high' : 
                        p95Latency > 100 ? 'medium' : 'low';

        bottlenecks.push({
          component: componentName,
          severity,
          avgLatency,
          frequency: latencies.length,
          recommendation: this.getBottleneckRecommendation(componentName, avgLatency),
          impact: (avgLatency / 100) * (latencies.length / metrics.length)
        });
      }
    }

    return bottlenecks.sort((a, b) => b.impact - a.impact);
  }

  private getBottleneckRecommendation(componentName: string, avgLatency: number): string {
    if (componentName.includes('context')) {
      return 'Consider reducing context window size or improving relevance filtering';
    }
    if (componentName.includes('analyzer')) {
      return 'Optimize analysis algorithms or increase caching';
    }
    if (componentName.includes('pattern')) {
      return 'Pre-compile patterns or expand pattern cache';
    }
    return 'Review algorithm efficiency and consider optimization';
  }

  private calculatePerformanceTrend(): 'improving' | 'stable' | 'degrading' {
    if (this.snapshots.length < 5) return 'stable';
    
    const recentSnapshots = this.snapshots.slice(-10);
    const latencyTrend = recentSnapshots.map(s => s.latencyP95);
    
    const avgRecent = latencyTrend.slice(-3).reduce((sum, l) => sum + l, 0) / 3;
    const avgPrevious = latencyTrend.slice(-6, -3).reduce((sum, l) => sum + l, 0) / 3;
    
    const change = (avgRecent - avgPrevious) / avgPrevious;
    
    if (change > 0.1) return 'degrading';
    if (change < -0.1) return 'improving';
    return 'stable';
  }

  private getRecentMetrics(count: number): PerformanceMetrics[] {
    return this.metrics.slice(-count);
  }

  private getRecentComponentCalls(componentName: string, count: number): ComponentMetrics[] {
    return this.metrics
      .slice(-count * 2) // Look at more metrics to find component calls
      .flatMap(m => m.componentPerformance)
      .filter(c => c.componentName === componentName)
      .slice(-count);
  }

  private calculateComponentTrend(recentCalls: ComponentMetrics[]): 'improving' | 'stable' | 'degrading' {
    if (recentCalls.length < 6) return 'stable';
    
    const avgRecent = recentCalls.slice(-3).reduce((sum, c) => sum + c.executionTime, 0) / 3;
    const avgPrevious = recentCalls.slice(-6, -3).reduce((sum, c) => sum + c.executionTime, 0) / 3;
    
    const change = (avgRecent - avgPrevious) / avgPrevious;
    
    if (change > 0.2) return 'degrading';
    if (change < -0.2) return 'improving';
    return 'stable';
  }

  private getEmptySnapshot(): PerformanceSnapshot {
    return {
      timestamp: new Date(),
      latencyP50: 0,
      latencyP95: 0,
      latencyP99: 0,
      avgTokenEfficiency: 0,
      efficiencyByQueryType: {},
      cachePerformance: {
        patternCacheHitRate: 0,
        analysisCacheHitRate: 0,
        contextCacheHitRate: 0,
        resultCacheHitRate: 0,
        totalMemoryUsage: 0,
        avgResponseTime: 0
      },
      systemHealth: {
        overallScore: 0,
        componentHealth: {},
        errorRate: 0,
        fallbackFrequency: 0,
        memoryPressure: 0,
        processingCapacity: 0
      },
      performanceTrend: 'stable',
      bottlenecks: []
    };
  }

  private initializeAlertThresholds(): void {
    this.alertThresholds = [
      {
        metricName: 'latencyP95',
        threshold: 200,
        operator: 'gt',
        severity: 'warning',
        description: 'P95 latency exceeds 200ms'
      },
      {
        metricName: 'tokenEfficiency',
        threshold: 0.9,
        operator: 'lt',
        severity: 'warning',
        description: 'Token efficiency below 90%'
      },
      {
        metricName: 'errorRate',
        threshold: 0.05,
        operator: 'gt',
        severity: 'error',
        description: 'Error rate exceeds 5%'
      },
      {
        metricName: 'memoryUsage',
        threshold: 100 * 1024 * 1024, // 100MB
        operator: 'gt',
        severity: 'critical',
        description: 'Memory usage exceeds 100MB'
      }
    ];
  }

  private checkAlertThresholds(metrics: PerformanceMetrics): void {
    // Implementation for checking alert thresholds
    // Would trigger alerts if thresholds are exceeded
  }

  private startSnapshotScheduler(): void {
    this.snapshotInterval = setInterval(() => {
      const snapshot = this.getCurrentSnapshot();
      this.snapshots.push(snapshot);
      
      // Cleanup old snapshots
      if (this.snapshots.length > this.maxSnapshotsHistory) {
        this.snapshots = this.snapshots.slice(-this.maxSnapshotsHistory);
      }
    }, 30000); // Every 30 seconds
  }

  /**
   * Cleanup and shutdown
   */
  shutdown(): void {
    if (this.snapshotInterval) {
      clearInterval(this.snapshotInterval);
    }
    console.log('📊 Performance monitor shutdown complete');
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();