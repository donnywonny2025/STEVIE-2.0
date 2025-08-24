/**
 * MetricsDashboard - Comprehensive Metrics Collection and Visualization
 * 
 * Provides a centralized dashboard for monitoring all intelligence system
 * metrics including performance, token efficiency, cache hit rates, and
 * error tracking with real-time updates and alerting capabilities.
 * 
 * Key Features:
 * - Real-time metrics aggregation
 * - Performance trend analysis
 * - Visual dashboards and charts
 * - Customizable alerting rules
 * - Historical data analysis
 * - Export capabilities
 */

import type { 
  CacheStats, 
  PerformanceMetrics, 
  TokenMetrics,
  LogMetrics,
  AlertRule,
  MetricSnapshot,
  DashboardWidget
} from '../types/IntelligenceTypes';

import { performanceMonitor } from './PerformanceMonitor';
import { tokenTracker } from './TokenTracker';
import { intelligenceLogger } from './IntelligenceLogger';
import { cacheManager } from '../performance/CacheManager';

export interface DashboardConfig {
  refreshInterval: number;
  retentionHours: number;
  enableRealtime: boolean;
  enableAlerts: boolean;
  maxDataPoints: number;
}

export interface SystemMetrics {
  timestamp: Date;
  performance: PerformanceMetrics;
  tokens: TokenMetrics;
  cache: Record<string, CacheStats>;
  logs: LogMetrics;
  system: {
    uptime: number;
    memoryUsage: number;
    activeOperations: number;
    errorRate: number;
  };
}

export interface AlertConfig {
  rules: AlertRule[];
  channels: AlertChannel[];
  cooldownMs: number;
  enableEmailAlerts: boolean;
  enableSlackAlerts: boolean;
}

export interface AlertChannel {
  type: 'console' | 'email' | 'slack' | 'webhook';
  config: Record<string, any>;
  enabled: boolean;
}

export interface MetricTrend {
  metric: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  period: string;
}

export class MetricsDashboard {
  private config: DashboardConfig;
  private alertConfig: AlertConfig;
  private metrics: SystemMetrics[] = [];
  private widgets: Map<string, DashboardWidget> = new Map();
  private alertCooldowns = new Map<string, number>();
  private refreshInterval?: NodeJS.Timeout;
  private subscribers: Array<(metrics: SystemMetrics) => void> = [];

  constructor(config: Partial<DashboardConfig> = {}) {
    this.config = {
      refreshInterval: 5000, // 5 seconds
      retentionHours: 24,
      enableRealtime: true,
      enableAlerts: true,
      maxDataPoints: 1000,
      ...config
    };

    this.alertConfig = {
      rules: this.getDefaultAlertRules(),
      channels: [
        { type: 'console', config: {}, enabled: true }
      ],
      cooldownMs: 5 * 60 * 1000, // 5 minutes
      enableEmailAlerts: false,
      enableSlackAlerts: false
    };

    this.initializeWidgets();
    this.startMetricsCollection();
  }

  /**
   * Core metrics collection
   */
  async collectMetrics(): Promise<SystemMetrics> {
    const timestamp = new Date();
    
    const [performance, tokens, cache, logs] = await Promise.all([
      performanceMonitor.getMetrics(),
      tokenTracker.getMetrics(),
      cacheManager.getCacheStats(),
      intelligenceLogger.getMetrics()
    ]);

    const systemMetrics = {
      uptime: process.uptime() * 1000,
      memoryUsage: process.memoryUsage().heapUsed,
      activeOperations: intelligenceLogger.getActiveOperations().length,
      errorRate: this.calculateErrorRate(logs)
    };

    const snapshot: SystemMetrics = {
      timestamp,
      performance,
      tokens,
      cache,
      logs,
      system: systemMetrics
    };

    this.addMetricSnapshot(snapshot);
    this.processAlerts(snapshot);
    this.notifySubscribers(snapshot);

    return snapshot;
  }

  /**
   * Dashboard widget management
   */
  addWidget(id: string, widget: DashboardWidget): void {
    this.widgets.set(id, widget);
    
    intelligenceLogger.info(`📊 Dashboard widget added: ${id}`, {
      component: 'MetricsDashboard',
      widgetType: widget.type,
      title: widget.title
    });
  }

  removeWidget(id: string): boolean {
    const removed = this.widgets.delete(id);
    
    if (removed) {
      intelligenceLogger.info(`📊 Dashboard widget removed: ${id}`, {
        component: 'MetricsDashboard'
      });
    }
    
    return removed;
  }

  getWidget(id: string): DashboardWidget | undefined {
    return this.widgets.get(id);
  }

  getAllWidgets(): DashboardWidget[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Real-time dashboard data
   */
  getCurrentSnapshot(): SystemMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  getHistoricalData(hours: number = 1): SystemMetrics[] {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.metrics.filter(m => m.timestamp >= cutoff);
  }

  getPerformanceTrends(hours: number = 1): MetricTrend[] {
    const data = this.getHistoricalData(hours);
    if (data.length < 2) return [];

    const trends: MetricTrend[] = [];
    const current = data[data.length - 1];
    const previous = data[0];

    // Response time trend
    const responseTimeChange = current.performance.avgResponseTime - previous.performance.avgResponseTime;
    trends.push({
      metric: 'Response Time',
      trend: responseTimeChange > 5 ? 'up' : responseTimeChange < -5 ? 'down' : 'stable',
      change: responseTimeChange,
      period: `${hours}h`
    });

    // Token efficiency trend
    const efficiencyChange = current.tokens.currentEfficiency - previous.tokens.currentEfficiency;
    trends.push({
      metric: 'Token Efficiency',
      trend: efficiencyChange > 0.01 ? 'up' : efficiencyChange < -0.01 ? 'down' : 'stable',
      change: efficiencyChange * 100,
      period: `${hours}h`
    });

    // Error rate trend
    const errorRateChange = current.system.errorRate - previous.system.errorRate;
    trends.push({
      metric: 'Error Rate',
      trend: errorRateChange > 0.01 ? 'up' : errorRateChange < -0.01 ? 'down' : 'stable',
      change: errorRateChange * 100,
      period: `${hours}h`
    });

    return trends;
  }

  /**
   * Performance analytics
   */
  getPerformanceAnalytics(): {
    responseTimePercentiles: Record<string, number>;
    peakHours: Array<{ hour: number; avgResponseTime: number }>;
    slowestOperations: Array<{ operation: string; avgTime: number; count: number }>;
    cacheEffectiveness: Record<string, number>;
  } {
    const recentData = this.getHistoricalData(24);
    
    // Calculate percentiles
    const responseTimes = recentData.map(d => d.performance.avgResponseTime).sort((a, b) => a - b);
    const responseTimePercentiles = {
      p50: this.percentile(responseTimes, 0.5),
      p75: this.percentile(responseTimes, 0.75),
      p90: this.percentile(responseTimes, 0.9),
      p95: this.percentile(responseTimes, 0.95),
      p99: this.percentile(responseTimes, 0.99)
    };

    // Peak hours analysis
    const hourlyData = new Map<number, number[]>();
    recentData.forEach(d => {
      const hour = d.timestamp.getHours();
      if (!hourlyData.has(hour)) hourlyData.set(hour, []);
      hourlyData.get(hour)!.push(d.performance.avgResponseTime);
    });

    const peakHours = Array.from(hourlyData.entries())
      .map(([hour, times]) => ({
        hour,
        avgResponseTime: times.reduce((a, b) => a + b, 0) / times.length
      }))
      .sort((a, b) => b.avgResponseTime - a.avgResponseTime)
      .slice(0, 5);

    // Cache effectiveness
    const latestCache = recentData[recentData.length - 1]?.cache || {};
    const cacheEffectiveness: Record<string, number> = {};
    
    Object.entries(latestCache).forEach(([layer, stats]) => {
      cacheEffectiveness[layer] = stats.hitRate || 0;
    });

    return {
      responseTimePercentiles,
      peakHours,
      slowestOperations: [], // Would need more detailed operation tracking
      cacheEffectiveness
    };
  }

  /**
   * Token usage analytics
   */
  getTokenAnalytics(): {
    dailyUsage: Array<{ date: string; tokens: number; savings: number }>;
    efficiencyTrend: Array<{ timestamp: Date; efficiency: number }>;
    topSavingStrategies: Array<{ strategy: string; savings: number; count: number }>;
  } {
    const recentData = this.getHistoricalData(24 * 7); // 7 days

    // Daily usage aggregation
    const dailyUsage = new Map<string, { tokens: number; savings: number }>();
    recentData.forEach(d => {
      const date = d.timestamp.toISOString().split('T')[0];
      if (!dailyUsage.has(date)) {
        dailyUsage.set(date, { tokens: 0, savings: 0 });
      }
      const day = dailyUsage.get(date)!;
      day.tokens += d.tokens.tokensUsed;
      day.savings += d.tokens.tokensSaved;
    });

    const dailyUsageArray = Array.from(dailyUsage.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Efficiency trend
    const efficiencyTrend = recentData.map(d => ({
      timestamp: d.timestamp,
      efficiency: d.tokens.currentEfficiency
    }));

    return {
      dailyUsage: dailyUsageArray,
      efficiencyTrend,
      topSavingStrategies: [] // Would need strategy tracking
    };
  }

  /**
   * Alert system
   */
  addAlertRule(rule: AlertRule): void {
    this.alertConfig.rules.push(rule);
    
    intelligenceLogger.info(`🚨 Alert rule added: ${rule.name}`, {
      component: 'MetricsDashboard',
      condition: rule.condition,
      severity: rule.severity
    });
  }

  removeAlertRule(ruleName: string): boolean {
    const index = this.alertConfig.rules.findIndex(r => r.name === ruleName);
    if (index > -1) {
      this.alertConfig.rules.splice(index, 1);
      intelligenceLogger.info(`🚨 Alert rule removed: ${ruleName}`);
      return true;
    }
    return false;
  }

  private processAlerts(metrics: SystemMetrics): void {
    if (!this.config.enableAlerts) return;

    for (const rule of this.alertConfig.rules) {
      if (this.isInCooldown(rule.name)) continue;

      if (this.evaluateAlertCondition(rule, metrics)) {
        this.triggerAlert(rule, metrics);
        this.setCooldown(rule.name);
      }
    }
  }

  private evaluateAlertCondition(rule: AlertRule, metrics: SystemMetrics): boolean {
    try {
      // Simple condition evaluation - could be enhanced with expression parser
      const value = this.getMetricValue(rule.condition.metric, metrics);
      
      switch (rule.condition.operator) {
        case '>':
          return value > rule.condition.threshold;
        case '<':
          return value < rule.condition.threshold;
        case '>=':
          return value >= rule.condition.threshold;
        case '<=':
          return value <= rule.condition.threshold;
        case '==':
          return value === rule.condition.threshold;
        default:
          return false;
      }
    } catch (error) {
      intelligenceLogger.error(`Failed to evaluate alert condition for ${rule.name}`, error);
      return false;
    }
  }

  private getMetricValue(metric: string, metrics: SystemMetrics): number {
    const parts = metric.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      value = value[part];
      if (value === undefined) return 0;
    }
    
    return typeof value === 'number' ? value : 0;
  }

  private triggerAlert(rule: AlertRule, metrics: SystemMetrics): void {
    const alertMessage = `🚨 ALERT [${rule.severity.toUpperCase()}]: ${rule.name}
Condition: ${rule.condition.metric} ${rule.condition.operator} ${rule.condition.threshold}
Current Value: ${this.getMetricValue(rule.condition.metric, metrics)}
Time: ${metrics.timestamp.toISOString()}`;

    intelligenceLogger.warn(alertMessage, {
      component: 'MetricsDashboard',
      alertRule: rule.name,
      severity: rule.severity
    });

    // Send to configured channels
    for (const channel of this.alertConfig.channels) {
      if (channel.enabled) {
        this.sendAlert(channel, rule, metrics, alertMessage);
      }
    }
  }

  private sendAlert(channel: AlertChannel, rule: AlertRule, metrics: SystemMetrics, message: string): void {
    switch (channel.type) {
      case 'console':
        console.warn(message);
        break;
      case 'email':
        // Email implementation would go here
        break;
      case 'slack':
        // Slack implementation would go here
        break;
      case 'webhook':
        // Webhook implementation would go here
        break;
    }
  }

  private isInCooldown(ruleName: string): boolean {
    const lastTriggered = this.alertCooldowns.get(ruleName);
    return lastTriggered ? (Date.now() - lastTriggered) < this.alertConfig.cooldownMs : false;
  }

  private setCooldown(ruleName: string): void {
    this.alertCooldowns.set(ruleName, Date.now());
  }

  /**
   * Data management
   */
  private addMetricSnapshot(snapshot: SystemMetrics): void {
    this.metrics.push(snapshot);
    
    // Trim old data
    if (this.metrics.length > this.config.maxDataPoints) {
      this.metrics = this.metrics.slice(-this.config.maxDataPoints);
    }

    // Remove data outside retention period
    const retentionMs = this.config.retentionHours * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - retentionMs);
    this.metrics = this.metrics.filter(m => m.timestamp >= cutoff);
  }

  private startMetricsCollection(): void {
    if (!this.config.enableRealtime) return;

    this.refreshInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        intelligenceLogger.error('Failed to collect metrics', error);
      }
    }, this.config.refreshInterval);

    intelligenceLogger.info(`📊 Metrics collection started (${this.config.refreshInterval}ms interval)`);
  }

  /**
   * Subscription management
   */
  subscribe(callback: (metrics: SystemMetrics) => void): () => void {
    this.subscribers.push(callback);
    
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private notifySubscribers(metrics: SystemMetrics): void {
    for (const subscriber of this.subscribers) {
      try {
        subscriber(metrics);
      } catch (error) {
        intelligenceLogger.error('Error notifying metrics subscriber', error);
      }
    }
  }

  /**
   * Utility methods
   */
  private calculateErrorRate(logs: LogMetrics): number {
    const total = logs.totalLogs;
    return total > 0 ? logs.errorCount / total : 0;
  }

  private percentile(arr: number[], percentile: number): number {
    if (arr.length === 0) return 0;
    const index = Math.ceil(arr.length * percentile) - 1;
    return arr[Math.max(0, Math.min(index, arr.length - 1))];
  }

  private initializeWidgets(): void {
    // Default dashboard widgets
    this.addWidget('performance-overview', {
      id: 'performance-overview',
      type: 'chart',
      title: 'Performance Overview',
      config: {
        metrics: ['performance.avgResponseTime', 'performance.operationsPerSecond'],
        chartType: 'line',
        timeRange: '1h'
      }
    });

    this.addWidget('token-efficiency', {
      id: 'token-efficiency',
      type: 'gauge',
      title: 'Token Efficiency',
      config: {
        metric: 'tokens.currentEfficiency',
        target: 0.97,
        format: 'percentage'
      }
    });

    this.addWidget('cache-hit-rates', {
      id: 'cache-hit-rates',
      type: 'bar',
      title: 'Cache Hit Rates',
      config: {
        metrics: ['cache.pattern.hitRate', 'cache.analysis.hitRate', 'cache.context.hitRate'],
        format: 'percentage'
      }
    });
  }

  private getDefaultAlertRules(): AlertRule[] {
    return [
      {
        name: 'High Response Time',
        condition: {
          metric: 'performance.avgResponseTime',
          operator: '>',
          threshold: 100
        },
        severity: 'warning',
        description: 'Average response time exceeds 100ms'
      },
      {
        name: 'Low Token Efficiency',
        condition: {
          metric: 'tokens.currentEfficiency',
          operator: '<',
          threshold: 0.9
        },
        severity: 'warning',
        description: 'Token efficiency below 90%'
      },
      {
        name: 'High Error Rate',
        condition: {
          metric: 'system.errorRate',
          operator: '>',
          threshold: 0.05
        },
        severity: 'critical',
        description: 'Error rate exceeds 5%'
      }
    ];
  }

  /**
   * Export functionality
   */
  exportMetrics(format: 'json' | 'csv' = 'json', hours: number = 24): string {
    const data = this.getHistoricalData(hours);
    
    if (format === 'json') {
      return JSON.stringify(data, null, 2);
    } else {
      // CSV export
      const headers = [
        'timestamp', 'responseTime', 'tokenEfficiency', 'errorRate', 
        'cacheHitRate', 'memoryUsage', 'activeOperations'
      ];
      
      const rows = data.map(d => [
        d.timestamp.toISOString(),
        d.performance.avgResponseTime,
        d.tokens.currentEfficiency,
        d.system.errorRate,
        d.cache.pattern?.hitRate || 0,
        d.system.memoryUsage,
        d.system.activeOperations
      ]);
      
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
  }

  /**
   * Shutdown cleanup
   */
  async shutdown(): Promise<void> {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
    
    this.subscribers = [];
    this.alertCooldowns.clear();
    
    intelligenceLogger.info('📊 Metrics Dashboard shutdown complete');
  }
}

// Export singleton instance
export const metricsDashboard = new MetricsDashboard();