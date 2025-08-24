/**
 * IntelligenceLogger - Comprehensive Logging and Debugging System
 * 
 * Provides structured logging for the intelligence system with different
 * log levels, contextual information, and debugging capabilities.
 * 
 * Key Features:
 * - Structured logging with metadata
 * - Performance tracking with timing
 * - Error correlation and debugging
 * - Log aggregation and filtering
 * - Real-time log streaming
 * - Security-aware sanitization
 */

import type { 
  LogLevel, 
  LogEntry, 
  LogContext, 
  AnalysisResult,
  ChatContext 
} from '../types/IntelligenceTypes';

export interface LoggerConfig {
  logLevel: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableRemote: boolean;
  maxLogSize: number;
  retentionDays: number;
  sanitizeSensitiveData: boolean;
}

export interface LogMetrics {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  avgProcessingTime: number;
  lastError: Date | null;
  logsByLevel: Record<LogLevel, number>;
}

export interface PerformanceContext {
  operationId: string;
  startTime: number;
  component: string;
  phase: string;
  metadata?: Record<string, any>;
}

export class IntelligenceLogger {
  private config: LoggerConfig;
  private logs: LogEntry[] = [];
  private metrics: LogMetrics;
  private activeOperations = new Map<string, PerformanceContext>();
  private logListeners: Array<(entry: LogEntry) => void> = [];

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      logLevel: 'info',
      enableConsole: true,
      enableFile: false,
      enableRemote: false,
      maxLogSize: 10000,
      retentionDays: 7,
      sanitizeSensitiveData: true,
      ...config
    };

    this.metrics = {
      totalLogs: 0,
      errorCount: 0,
      warningCount: 0,
      avgProcessingTime: 0,
      lastError: null,
      logsByLevel: {
        debug: 0,
        info: 0,
        warn: 0,
        error: 0,
        fatal: 0
      }
    };

    this.startCleanupScheduler();
  }

  /**
   * Main logging methods
   */
  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } : context;

    this.log('error', message, errorContext);
    this.metrics.lastError = new Date();
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    const errorContext = error ? {
      ...context,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    } : context;

    this.log('fatal', message, errorContext);
  }

  /**
   * Intelligence-specific logging methods
   */
  logQueryStart(query: string, chatContext: ChatContext): string {
    const operationId = this.generateOperationId();
    const sanitizedQuery = this.sanitizeQuery(query);
    
    this.startOperation(operationId, 'QueryAnalysis', 'start', {
      queryLength: query.length,
      hasHistory: chatContext.messages.length > 0,
      contextSize: JSON.stringify(chatContext).length
    });

    this.info(`🔍 Query Analysis Started`, {
      operationId,
      query: sanitizedQuery,
      contextMessages: chatContext.messages.length,
      component: 'IntelligenceEngine'
    });

    return operationId;
  }

  logQueryComplete(operationId: string, result: AnalysisResult): void {
    const duration = this.endOperation(operationId);
    
    this.info(`✅ Query Analysis Complete`, {
      operationId,
      duration,
      confidence: result.confidence_score,
      strategy: result.fallback_strategy?.strategy,
      tokens: result.context_requirements.estimated_tokens,
      component: 'IntelligenceEngine'
    });
  }

  logCacheHit(layer: string, key: string, responseTime: number): void {
    this.debug(`💾 Cache Hit [${layer}]`, {
      cacheLayer: layer,
      key: key.slice(0, 30) + '...',
      responseTime,
      component: 'CacheManager'
    });
  }

  logCacheMiss(layer: string, key: string): void {
    this.debug(`💾 Cache Miss [${layer}]`, {
      cacheLayer: layer,
      key: key.slice(0, 30) + '...',
      component: 'CacheManager'
    });
  }

  logFallbackTriggered(component: string, reason: string, fallbackLevel: number): void {
    this.warn(`🛡️ Fallback Triggered`, {
      component,
      reason,
      fallbackLevel,
      timestamp: new Date().toISOString()
    });
  }

  logPerformanceAlert(component: string, metric: string, value: number, threshold: number): void {
    this.warn(`⚠️ Performance Alert`, {
      component,
      metric,
      value,
      threshold,
      severity: value > threshold * 2 ? 'high' : 'medium'
    });
  }

  logTokenEfficiency(saved: number, total: number, efficiency: number): void {
    this.info(`🎯 Token Efficiency`, {
      tokensSaved: saved,
      totalTokens: total,
      efficiency: `${(efficiency * 100).toFixed(1)}%`,
      component: 'TokenTracker'
    });
  }

  /**
   * Performance operation tracking
   */
  startOperation(operationId: string, component: string, phase: string, metadata?: Record<string, any>): void {
    this.activeOperations.set(operationId, {
      operationId,
      startTime: Date.now(),
      component,
      phase,
      metadata
    });
  }

  endOperation(operationId: string): number {
    const operation = this.activeOperations.get(operationId);
    if (!operation) {
      this.warn(`Operation ${operationId} not found for completion`);
      return 0;
    }

    const duration = Date.now() - operation.startTime;
    this.activeOperations.delete(operationId);

    // Update average processing time
    this.updateAvgProcessingTime(duration);

    return duration;
  }

  logComponentPerformance(component: string, operation: string, duration: number, metadata?: Record<string, any>): void {
    const logLevel = duration > 100 ? 'warn' : 'debug';
    
    this.log(logLevel, `⏱️ Component Performance`, {
      component,
      operation,
      duration,
      ...metadata
    });
  }

  /**
   * Core logging implementation
   */
  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      context: this.sanitizeContext(context),
      operationId: context?.operationId || this.generateOperationId()
    };

    this.addLogEntry(entry);
    this.updateMetrics(level);
    this.outputLog(entry);
    this.notifyListeners(entry);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'fatal'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);
    
    return messageLevel >= configLevel;
  }

  private addLogEntry(entry: LogEntry): void {
    this.logs.push(entry);
    
    // Trim logs if exceeding max size
    if (this.logs.length > this.config.maxLogSize) {
      this.logs = this.logs.slice(-this.config.maxLogSize);
    }
  }

  private outputLog(entry: LogEntry): void {
    if (!this.config.enableConsole) return;

    const timestamp = entry.timestamp.toISOString().slice(11, 23);
    const level = entry.level.toUpperCase().padEnd(5);
    const component = entry.context?.component || 'SYSTEM';
    const operationId = entry.operationId.slice(0, 8);

    let logMessage = `[${timestamp}] ${level} [${component}:${operationId}] ${entry.message}`;

    // Add context details for non-production
    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = JSON.stringify(entry.context, null, 2);
      logMessage += `\n${contextStr}`;
    }

    // Output with appropriate console method
    switch (entry.level) {
      case 'debug':
        console.debug(logMessage);
        break;
      case 'info':
        console.info(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'error':
      case 'fatal':
        console.error(logMessage);
        break;
    }
  }

  private updateMetrics(level: LogLevel): void {
    this.metrics.totalLogs++;
    this.metrics.logsByLevel[level]++;

    if (level === 'error' || level === 'fatal') {
      this.metrics.errorCount++;
    } else if (level === 'warn') {
      this.metrics.warningCount++;
    }
  }

  private updateAvgProcessingTime(duration: number): void {
    const currentAvg = this.metrics.avgProcessingTime;
    const totalOps = this.metrics.totalLogs;
    
    this.metrics.avgProcessingTime = ((currentAvg * (totalOps - 1)) + duration) / totalOps;
  }

  /**
   * Data sanitization for security
   */
  private sanitizeQuery(query: string): string {
    if (!this.config.sanitizeSensitiveData) {
      return query;
    }

    return query
      .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, '[CARD]')
      .replace(/\b[\w._%+-]+@[\w.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]')
      .replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]')
      .replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
  }

  private sanitizeContext(context?: LogContext): LogContext | undefined {
    if (!context || !this.config.sanitizeSensitiveData) {
      return context;
    }

    const sanitized = { ...context };
    
    // Remove or sanitize sensitive fields
    if (sanitized.query) {
      sanitized.query = this.sanitizeQuery(sanitized.query);
    }

    return sanitized;
  }

  /**
   * Log querying and filtering
   */
  getLogs(filter?: {
    level?: LogLevel;
    component?: string;
    startTime?: Date;
    endTime?: Date;
    operationId?: string;
  }): LogEntry[] {
    let filteredLogs = [...this.logs];

    if (filter) {
      if (filter.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filter.level);
      }
      
      if (filter.component) {
        filteredLogs = filteredLogs.filter(log => 
          log.context?.component === filter.component
        );
      }
      
      if (filter.startTime) {
        filteredLogs = filteredLogs.filter(log => 
          log.timestamp >= filter.startTime!
        );
      }
      
      if (filter.endTime) {
        filteredLogs = filteredLogs.filter(log => 
          log.timestamp <= filter.endTime!
        );
      }
      
      if (filter.operationId) {
        filteredLogs = filteredLogs.filter(log => 
          log.operationId === filter.operationId
        );
      }
    }

    return filteredLogs;
  }

  getMetrics(): LogMetrics {
    return { ...this.metrics };
  }

  /**
   * Real-time log streaming
   */
  addLogListener(listener: (entry: LogEntry) => void): void {
    this.logListeners.push(listener);
  }

  removeLogListener(listener: (entry: LogEntry) => void): void {
    const index = this.logListeners.indexOf(listener);
    if (index > -1) {
      this.logListeners.splice(index, 1);
    }
  }

  private notifyListeners(entry: LogEntry): void {
    for (const listener of this.logListeners) {
      try {
        listener(entry);
      } catch (error) {
        console.error('Error in log listener:', error);
      }
    }
  }

  /**
   * Utility methods
   */
  private generateOperationId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  private startCleanupScheduler(): void {
    setInterval(() => {
      this.cleanupOldLogs();
    }, 60 * 60 * 1000); // Every hour
  }

  private cleanupOldLogs(): void {
    const retentionMs = this.config.retentionDays * 24 * 60 * 60 * 1000;
    const cutoffTime = new Date(Date.now() - retentionMs);
    
    const beforeCount = this.logs.length;
    this.logs = this.logs.filter(log => log.timestamp > cutoffTime);
    const afterCount = this.logs.length;
    
    if (beforeCount > afterCount) {
      this.info(`🧹 Cleaned up ${beforeCount - afterCount} old log entries`);
    }
  }

  /**
   * Export logs for analysis
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    } else {
      // CSV export
      const headers = ['timestamp', 'level', 'message', 'component', 'operationId'];
      const rows = this.logs.map(log => [
        log.timestamp.toISOString(),
        log.level,
        log.message.replace(/"/g, '""'),
        log.context?.component || '',
        log.operationId
      ]);
      
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
  }

  /**
   * Debug utilities
   */
  dumpOperationTrace(operationId: string): LogEntry[] {
    return this.getLogs({ operationId });
  }

  getActiveOperations(): PerformanceContext[] {
    return Array.from(this.activeOperations.values());
  }

  /**
   * Shutdown cleanup
   */
  async shutdown(): Promise<void> {
    this.info('🔄 Intelligence Logger shutting down');
    
    // Clear all listeners
    this.logListeners = [];
    
    // Clear active operations
    this.activeOperations.clear();
    
    this.info('✅ Intelligence Logger shutdown complete');
  }
}

// Export singleton instance
export const intelligenceLogger = new IntelligenceLogger({
  logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
  enableConsole: true,
  sanitizeSensitiveData: true
});