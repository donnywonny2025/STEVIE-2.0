/**
 * AlertingSystem - Intelligent Performance Issue Detection and Notification
 * 
 * Advanced alerting system that monitors the intelligence system for performance
 * issues, anomalies, and degradation patterns with intelligent thresholds and
 * machine learning-based anomaly detection.
 * 
 * Key Features:
 * - Adaptive threshold detection
 * - Anomaly pattern recognition
 * - Escalation management
 * - Multiple notification channels
 * - Alert correlation and deduplication
 * - Performance trend analysis
 */

import type { 
  AlertRule,
  AlertEvent,
  SystemMetrics,
  AlertChannel,
  AnomalyDetection,
  EscalationPolicy
} from '../types/IntelligenceTypes';

import { intelligenceLogger } from './IntelligenceLogger';
import { metricsDashboard } from './MetricsDashboard';

export interface AlertConfig {
  enableAnomalyDetection: boolean;
  enableAdaptiveThresholds: boolean;
  correlationWindow: number;
  maxAlertsPerHour: number;
  escalationEnabled: boolean;
  channels: AlertChannel[];
}

export interface AlertContext {
  alertId: string;
  rule: AlertRule;
  currentValue: number;
  threshold: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  severity: 'info' | 'warning' | 'critical' | 'fatal';
  duration: number;
  relatedAlerts: string[];
}

export interface AnomalyResult {
  isAnomaly: boolean;
  score: number;
  confidence: number;
  expectedRange: [number, number];
  actualValue: number;
  type: 'spike' | 'drop' | 'trend' | 'pattern';
}

export interface EscalationLevel {
  level: number;
  delayMinutes: number;
  channels: string[];
  recipients: string[];
}

export class AlertingSystem {
  private config: AlertConfig;
  private activeAlerts = new Map<string, AlertEvent>();
  private alertHistory: AlertEvent[] = [];
  private cooldowns = new Map<string, number>();
  private escalationTimers = new Map<string, NodeJS.Timeout>();
  private metricHistory = new Map<string, number[]>();
  private anomalyBaselines = new Map<string, { mean: number; stdDev: number }>();

  constructor(config: Partial<AlertConfig> = {}) {
    this.config = {
      enableAnomalyDetection: true,
      enableAdaptiveThresholds: true,
      correlationWindow: 5 * 60 * 1000, // 5 minutes
      maxAlertsPerHour: 10,
      escalationEnabled: true,
      channels: [
        {
          type: 'console',
          config: {},
          enabled: true
        }
      ],
      ...config
    };

    this.startMonitoring();
    this.initializeBaselines();
  }

  /**
   * Core alerting methods
   */
  async processMetrics(metrics: SystemMetrics): Promise<void> {
    try {
      // Update metric history for trend analysis
      this.updateMetricHistory(metrics);
      
      // Check for anomalies if enabled
      if (this.config.enableAnomalyDetection) {
        await this.detectAnomalies(metrics);
      }
      
      // Update adaptive thresholds
      if (this.config.enableAdaptiveThresholds) {
        this.updateAdaptiveThresholds(metrics);
      }
      
      // Check active alerts for resolution
      this.checkAlertResolution(metrics);
      
    } catch (error) {
      intelligenceLogger.error('Failed to process metrics for alerting', error, {
        component: 'AlertingSystem'
      });
    }
  }

  /**
   * Alert creation and management
   */
  async createAlert(
    rule: AlertRule, 
    currentValue: number, 
    metrics: SystemMetrics
  ): Promise<string> {
    const alertId = this.generateAlertId();
    const trend = this.calculateTrend(rule.condition.metric, currentValue);
    
    const alertContext: AlertContext = {
      alertId,
      rule,
      currentValue,
      threshold: rule.condition.threshold,
      trend,
      severity: rule.severity,
      duration: 0,
      relatedAlerts: this.findRelatedAlerts(rule, metrics)
    };

    const alertEvent: AlertEvent = {
      id: alertId,
      rule: rule.name,
      timestamp: new Date(),
      resolved: false,
      context: alertContext,
      escalationLevel: 0,
      notificationsSent: 0
    };

    // Check if we should suppress due to correlation
    if (this.shouldSuppressAlert(alertEvent)) {
      intelligenceLogger.debug(`Alert suppressed due to correlation: ${rule.name}`);
      return alertId;
    }

    // Check rate limiting
    if (!this.checkRateLimit()) {
      intelligenceLogger.warn(`Alert rate limit exceeded, suppressing: ${rule.name}`);
      return alertId;
    }

    this.activeAlerts.set(alertId, alertEvent);
    this.alertHistory.push(alertEvent);

    // Send initial notification
    await this.sendAlert(alertEvent);
    
    // Set up escalation if enabled
    if (this.config.escalationEnabled && rule.escalationPolicy) {
      this.scheduleEscalation(alertEvent, rule.escalationPolicy);
    }

    intelligenceLogger.warn(`🚨 Alert created: ${rule.name}`, {
      component: 'AlertingSystem',
      alertId,
      severity: rule.severity,
      currentValue,
      threshold: rule.condition.threshold
    });

    return alertId;
  }

  async resolveAlert(alertId: string, reason?: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.resolutionReason = reason;

    // Cancel any pending escalations
    const escalationTimer = this.escalationTimers.get(alertId);
    if (escalationTimer) {
      clearTimeout(escalationTimer);
      this.escalationTimers.delete(alertId);
    }

    this.activeAlerts.delete(alertId);

    // Send resolution notification
    await this.sendResolutionNotification(alert);

    intelligenceLogger.info(`✅ Alert resolved: ${alert.rule}`, {
      component: 'AlertingSystem',
      alertId,
      reason,
      duration: alert.resolvedAt.getTime() - alert.timestamp.getTime()
    });

    return true;
  }

  /**
   * Anomaly detection system
   */
  private async detectAnomalies(metrics: SystemMetrics): Promise<void> {
    const anomalyChecks = [
      { metric: 'performance.avgResponseTime', value: metrics.performance.avgResponseTime },
      { metric: 'tokens.currentEfficiency', value: metrics.tokens.currentEfficiency },
      { metric: 'system.errorRate', value: metrics.system.errorRate },
      { metric: 'system.memoryUsage', value: metrics.system.memoryUsage }
    ];

    for (const check of anomalyChecks) {
      const anomalyResult = this.analyzeAnomaly(check.metric, check.value);
      
      if (anomalyResult.isAnomaly && anomalyResult.confidence > 0.8) {
        await this.handleAnomaly(check.metric, anomalyResult, metrics);
      }
    }
  }

  private analyzeAnomaly(metric: string, value: number): AnomalyResult {
    const history = this.metricHistory.get(metric) || [];
    const baseline = this.anomalyBaselines.get(metric);
    
    if (history.length < 10 || !baseline) {
      return {
        isAnomaly: false,
        score: 0,
        confidence: 0,
        expectedRange: [value, value],
        actualValue: value,
        type: 'pattern'
      };
    }

    // Z-score based anomaly detection
    const zScore = Math.abs((value - baseline.mean) / baseline.stdDev);
    const isAnomaly = zScore > 2.5; // 2.5 standard deviations
    const confidence = Math.min(zScore / 3, 1); // Normalize to 0-1

    // Determine anomaly type
    let type: 'spike' | 'drop' | 'trend' | 'pattern' = 'pattern';
    if (value > baseline.mean + (2 * baseline.stdDev)) {
      type = 'spike';
    } else if (value < baseline.mean - (2 * baseline.stdDev)) {
      type = 'drop';
    } else if (this.detectTrendAnomaly(history)) {
      type = 'trend';
    }

    const expectedRange: [number, number] = [
      baseline.mean - (2 * baseline.stdDev),
      baseline.mean + (2 * baseline.stdDev)
    ];

    return {
      isAnomaly,
      score: zScore,
      confidence,
      expectedRange,
      actualValue: value,
      type
    };
  }

  private async handleAnomaly(
    metric: string, 
    anomaly: AnomalyResult, 
    metrics: SystemMetrics
  ): Promise<void> {
    const anomalyRule: AlertRule = {
      name: `Anomaly Detected: ${metric}`,
      condition: {
        metric,
        operator: anomaly.type === 'spike' ? '>' : '<',
        threshold: anomaly.type === 'spike' ? anomaly.expectedRange[1] : anomaly.expectedRange[0]
      },
      severity: anomaly.confidence > 0.95 ? 'critical' : 'warning',
      description: `Anomaly detected in ${metric}. Expected: ${anomaly.expectedRange.join('-')}, Actual: ${anomaly.actualValue}`
    };

    await this.createAlert(anomalyRule, anomaly.actualValue, metrics);
  }

  /**
   * Adaptive threshold management
   */
  private updateAdaptiveThresholds(metrics: SystemMetrics): void {
    // Update baselines for adaptive thresholds
    const updates = [
      { metric: 'performance.avgResponseTime', value: metrics.performance.avgResponseTime },
      { metric: 'tokens.currentEfficiency', value: metrics.tokens.currentEfficiency },
      { metric: 'system.errorRate', value: metrics.system.errorRate }
    ];

    for (const update of updates) {
      this.updateBaseline(update.metric, update.value);
    }
  }

  private updateBaseline(metric: string, value: number): void {
    const history = this.metricHistory.get(metric) || [];
    
    if (history.length > 100) {
      const mean = history.reduce((a, b) => a + b, 0) / history.length;
      const variance = history.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / history.length;
      const stdDev = Math.sqrt(variance);
      
      this.anomalyBaselines.set(metric, { mean, stdDev });
    }
  }

  /**
   * Alert correlation and deduplication
   */
  private findRelatedAlerts(rule: AlertRule, metrics: SystemMetrics): string[] {
    const related: string[] = [];
    const currentTime = Date.now();
    
    for (const [alertId, alert] of this.activeAlerts) {
      const alertAge = currentTime - alert.timestamp.getTime();
      
      // Check if alerts are within correlation window
      if (alertAge <= this.config.correlationWindow) {
        // Simple correlation logic - can be enhanced
        if (this.areAlertsCorrelated(rule, alert.context.rule)) {
          related.push(alertId);
        }
      }
    }
    
    return related;
  }

  private areAlertsCorrelated(rule1: AlertRule, rule2: AlertRule): boolean {
    // Simple correlation based on metric similarity
    const metric1Parts = rule1.condition.metric.split('.');
    const metric2Parts = rule2.condition.metric.split('.');
    
    // Same root metric (e.g., both "performance.*")
    return metric1Parts[0] === metric2Parts[0];
  }

  private shouldSuppressAlert(alertEvent: AlertEvent): boolean {
    // Suppress if there are too many related alerts
    return alertEvent.context.relatedAlerts.length >= 3;
  }

  /**
   * Escalation management
   */
  private scheduleEscalation(alert: AlertEvent, policy: EscalationPolicy): void {
    if (!policy.levels || policy.levels.length === 0) return;
    
    const nextLevel = policy.levels[alert.escalationLevel];
    if (!nextLevel) return;
    
    const escalationDelay = nextLevel.delayMinutes * 60 * 1000;
    
    const timer = setTimeout(async () => {
      await this.escalateAlert(alert, nextLevel);
    }, escalationDelay);
    
    this.escalationTimers.set(alert.id, timer);
  }

  private async escalateAlert(alert: AlertEvent, level: EscalationLevel): Promise<void> {
    alert.escalationLevel = level.level;
    
    intelligenceLogger.warn(`🔥 Alert escalated to level ${level.level}: ${alert.rule}`, {
      component: 'AlertingSystem',
      alertId: alert.id,
      escalationLevel: level.level
    });
    
    // Send escalated notification
    await this.sendEscalatedAlert(alert, level);
    
    // Schedule next escalation if available
    const rule = { escalationPolicy: { levels: [] } } as AlertRule; // Would get from rule store
    if (rule.escalationPolicy && alert.escalationLevel < rule.escalationPolicy.levels.length - 1) {
      this.scheduleEscalation(alert, rule.escalationPolicy);
    }
  }

  /**
   * Notification system
   */
  private async sendAlert(alert: AlertEvent): Promise<void> {
    const message = this.formatAlertMessage(alert);
    
    for (const channel of this.config.channels) {
      if (channel.enabled) {
        await this.sendToChannel(channel, message, alert);
      }
    }
    
    alert.notificationsSent++;
  }

  private async sendResolutionNotification(alert: AlertEvent): Promise<void> {
    const message = this.formatResolutionMessage(alert);
    
    for (const channel of this.config.channels) {
      if (channel.enabled) {
        await this.sendToChannel(channel, message, alert);
      }
    }
  }

  private async sendEscalatedAlert(alert: AlertEvent, level: EscalationLevel): Promise<void> {
    const message = this.formatEscalationMessage(alert, level);
    
    // Send to escalation-specific channels
    for (const channelType of level.channels) {
      const channel = this.config.channels.find(c => c.type === channelType);
      if (channel && channel.enabled) {
        await this.sendToChannel(channel, message, alert);
      }
    }
  }

  private async sendToChannel(channel: AlertChannel, message: string, alert: AlertEvent): Promise<void> {
    try {
      switch (channel.type) {
        case 'console':
          console.warn(message);
          break;
        case 'email':
          await this.sendEmail(channel.config, message, alert);
          break;
        case 'slack':
          await this.sendSlack(channel.config, message, alert);
          break;
        case 'webhook':
          await this.sendWebhook(channel.config, message, alert);
          break;
      }
    } catch (error) {
      intelligenceLogger.error(`Failed to send alert via ${channel.type}`, error);
    }
  }

  /**
   * Channel implementations
   */
  private async sendEmail(config: any, message: string, alert: AlertEvent): Promise<void> {
    // Email implementation would go here
    intelligenceLogger.debug(`Would send email alert: ${alert.rule}`);
  }

  private async sendSlack(config: any, message: string, alert: AlertEvent): Promise<void> {
    // Slack implementation would go here
    intelligenceLogger.debug(`Would send Slack alert: ${alert.rule}`);
  }

  private async sendWebhook(config: any, message: string, alert: AlertEvent): Promise<void> {
    // Webhook implementation would go here
    intelligenceLogger.debug(`Would send webhook alert: ${alert.rule}`);
  }

  /**
   * Message formatting
   */
  private formatAlertMessage(alert: AlertEvent): string {
    const { context } = alert;
    
    return `🚨 ALERT [${context.severity.toUpperCase()}]: ${alert.rule}

Current Value: ${context.currentValue}
Threshold: ${context.threshold}
Trend: ${context.trend}
Time: ${alert.timestamp.toISOString()}

${context.rule.description || 'No description available'}`;
  }

  private formatResolutionMessage(alert: AlertEvent): string {
    const duration = alert.resolvedAt ? 
      alert.resolvedAt.getTime() - alert.timestamp.getTime() : 0;
    
    return `✅ RESOLVED: ${alert.rule}

Duration: ${Math.round(duration / 1000)}s
Resolved: ${alert.resolvedAt?.toISOString()}
Reason: ${alert.resolutionReason || 'Automatic resolution'}`;
  }

  private formatEscalationMessage(alert: AlertEvent, level: EscalationLevel): string {
    return `🔥 ESCALATED [Level ${level.level}]: ${alert.rule}

This alert has been escalated due to lack of response.
Original Time: ${alert.timestamp.toISOString()}
Escalation Level: ${level.level}

Immediate attention required!`;
  }

  /**
   * Utility methods
   */
  private updateMetricHistory(metrics: SystemMetrics): void {
    const updates = [
      { metric: 'performance.avgResponseTime', value: metrics.performance.avgResponseTime },
      { metric: 'tokens.currentEfficiency', value: metrics.tokens.currentEfficiency },
      { metric: 'system.errorRate', value: metrics.system.errorRate },
      { metric: 'system.memoryUsage', value: metrics.system.memoryUsage }
    ];

    for (const update of updates) {
      const history = this.metricHistory.get(update.metric) || [];
      history.push(update.value);
      
      // Keep only last 100 values
      if (history.length > 100) {
        history.shift();
      }
      
      this.metricHistory.set(update.metric, history);
    }
  }

  private calculateTrend(metric: string, currentValue: number): 'increasing' | 'decreasing' | 'stable' {
    const history = this.metricHistory.get(metric) || [];
    
    if (history.length < 5) return 'stable';
    
    const recent = history.slice(-5);
    const older = history.slice(-10, -5);
    
    if (older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const change = (recentAvg - olderAvg) / olderAvg;
    
    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private detectTrendAnomaly(history: number[]): boolean {
    if (history.length < 10) return false;
    
    // Simple trend detection - consecutive increases/decreases
    const recent = history.slice(-5);
    let increasing = 0;
    let decreasing = 0;
    
    for (let i = 1; i < recent.length; i++) {
      if (recent[i] > recent[i-1]) increasing++;
      if (recent[i] < recent[i-1]) decreasing++;
    }
    
    return increasing >= 4 || decreasing >= 4;
  }

  private checkAlertResolution(metrics: SystemMetrics): void {
    for (const [alertId, alert] of this.activeAlerts) {
      if (this.shouldResolveAlert(alert, metrics)) {
        this.resolveAlert(alertId, 'Metrics returned to normal');
      }
    }
  }

  private shouldResolveAlert(alert: AlertEvent, metrics: SystemMetrics): boolean {
    const { rule, threshold } = alert.context;
    const currentValue = this.getMetricValue(rule.condition.metric, metrics);
    
    // Simple resolution logic - value is back within threshold
    switch (rule.condition.operator) {
      case '>':
        return currentValue <= threshold * 0.9; // 10% buffer
      case '<':
        return currentValue >= threshold * 1.1; // 10% buffer
      case '>=':
        return currentValue < threshold;
      case '<=':
        return currentValue > threshold;
      default:
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

  private checkRateLimit(): boolean {
    const now = Date.now();
    const hourAgo = now - (60 * 60 * 1000);
    
    const recentAlerts = this.alertHistory.filter(a => a.timestamp.getTime() > hourAgo);
    return recentAlerts.length < this.config.maxAlertsPerHour;
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeBaselines(): void {
    // Initialize with reasonable defaults
    this.anomalyBaselines.set('performance.avgResponseTime', { mean: 50, stdDev: 20 });
    this.anomalyBaselines.set('tokens.currentEfficiency', { mean: 0.95, stdDev: 0.05 });
    this.anomalyBaselines.set('system.errorRate', { mean: 0.01, stdDev: 0.005 });
  }

  private startMonitoring(): void {
    // Subscribe to metrics updates
    metricsDashboard.subscribe((metrics) => {
      this.processMetrics(metrics);
    });
    
    intelligenceLogger.info('🚨 Alerting system monitoring started', {
      component: 'AlertingSystem'
    });
  }

  /**
   * Public API
   */
  getActiveAlerts(): AlertEvent[] {
    return Array.from(this.activeAlerts.values());
  }

  getAlertHistory(hours: number = 24): AlertEvent[] {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));
    return this.alertHistory.filter(a => a.timestamp >= cutoff);
  }

  getAlertStatistics(): {
    totalAlerts: number;
    activeAlerts: number;
    alertsByType: Record<string, number>;
    avgResolutionTime: number;
  } {
    const resolvedAlerts = this.alertHistory.filter(a => a.resolved && a.resolvedAt);
    const avgResolutionTime = resolvedAlerts.length > 0 ? 
      resolvedAlerts.reduce((sum, alert) => {
        return sum + (alert.resolvedAt!.getTime() - alert.timestamp.getTime());
      }, 0) / resolvedAlerts.length : 0;

    const alertsByType: Record<string, number> = {};
    this.alertHistory.forEach(alert => {
      alertsByType[alert.context.severity] = (alertsByType[alert.context.severity] || 0) + 1;
    });

    return {
      totalAlerts: this.alertHistory.length,
      activeAlerts: this.activeAlerts.size,
      alertsByType,
      avgResolutionTime
    };
  }

  /**
   * Shutdown cleanup
   */
  async shutdown(): Promise<void> {
    // Clear all escalation timers
    for (const timer of this.escalationTimers.values()) {
      clearTimeout(timer);
    }
    
    this.escalationTimers.clear();
    this.activeAlerts.clear();
    
    intelligenceLogger.info('🚨 Alerting System shutdown complete');
  }
}

// Export singleton instance
export const alertingSystem = new AlertingSystem();