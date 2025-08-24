/**
 * ContextManager - Context Window Management & Optimization
 * 
 * Manages context windows, token limits, and context optimization strategies.
 * Ensures optimal context selection while maintaining token efficiency and
 * preventing context overflow in language model requests.
 * 
 * Key Features:
 * - Context window size management
 * - Token limit enforcement
 * - Context priority ranking
 * - Memory-efficient data structures
 * - Context expiration handling
 */

import type {
  ContextData,
  RelevantMessage,
  ContextRequirements,
  TokenUsage
} from '../types/IntelligenceTypes';

export interface ContextWindow {
  messages: RelevantMessage[];
  totalTokens: number;
  maxTokens: number;
  utilizationPercentage: number;
  priorityScore: number;
  expiresAt?: Date;
}

export interface ContextOptimizationResult {
  optimizedContext: ContextData;
  tokensRemoved: number;
  messagesRemoved: number;
  optimizationStrategy: string;
  qualityImpact: number;
}

export interface ContextWindowConfig {
  maxTokens: number;
  reserveTokens: number;
  maxMessages: number;
  priorityThreshold: number;
  expirationMinutes: number;
}

export class ContextManager {
  private config: ContextWindowConfig = {
    maxTokens: 1200,      // Maximum context tokens (Scout's limit)
    reserveTokens: 200,   // Reserve for system prompt and response
    maxMessages: 10,      // Maximum number of messages
    priorityThreshold: 0.3, // Minimum priority score to keep
    expirationMinutes: 30   // Context expiration time
  };

  private activeWindows: Map<string, ContextWindow> = new Map();

  /**
   * Main context management method
   */
  async manageContext(
    sessionId: string,
    rawContext: ContextData,
    requirements: ContextRequirements
  ): Promise<ContextData> {
    const startTime = Date.now();
    
    try {
      console.log(`📋 CONTEXT MANAGEMENT START [${sessionId}]:`, {
        inputMessages: rawContext.selectedMessages.length,
        inputTokens: rawContext.estimatedTokens,
        requirementLevel: requirements.level,
        maxAllowed: requirements.estimatedTokens
      });

      // Check if context fits within limits
      if (rawContext.estimatedTokens <= requirements.estimatedTokens) {
        console.log(`✅ Context within limits, no optimization needed`);
        return this.createOptimizedContext(rawContext, 'no_optimization_needed');
      }

      // Apply context optimization strategies
      const optimizationResult = await this.optimizeContext(rawContext, requirements);
      
      // Create and cache context window
      const contextWindow = this.createContextWindow(
        sessionId,
        optimizationResult.optimizedContext,
        requirements
      );
      
      this.activeWindows.set(sessionId, contextWindow);

      console.log(`✅ CONTEXT MANAGEMENT COMPLETE (${Date.now() - startTime}ms):`, {
        outputMessages: optimizationResult.optimizedContext.selectedMessages.length,
        outputTokens: optimizationResult.optimizedContext.estimatedTokens,
        tokensRemoved: optimizationResult.tokensRemoved,
        strategy: optimizationResult.optimizationStrategy,
        qualityImpact: optimizationResult.qualityImpact.toFixed(3)
      });

      return optimizationResult.optimizedContext;

    } catch (error) {
      console.error(`❌ Context management failed for session ${sessionId}:`, error);
      
      // Fallback: return minimal context
      return this.createMinimalContext(rawContext);
    }
  }

  /**
   * Optimize context using multiple strategies
   */
  private async optimizeContext(
    context: ContextData,
    requirements: ContextRequirements
  ): Promise<ContextOptimizationResult> {
    const targetTokens = Math.min(requirements.estimatedTokens, this.config.maxTokens - this.config.reserveTokens);
    let optimizedMessages = [...context.selectedMessages];
    let removedTokens = 0;
    let removedMessages = 0;
    let strategy = '';

    // Strategy 1: Remove lowest relevance messages
    if (context.estimatedTokens > targetTokens) {
      const { messages, tokens, count } = this.removeByRelevance(optimizedMessages, targetTokens);
      optimizedMessages = messages;
      removedTokens += tokens;
      removedMessages += count;
      strategy += 'relevance_filtering';
    }

    // Strategy 2: Truncate long messages if still over limit
    if (this.estimateTokens(optimizedMessages) > targetTokens) {
      const { messages, tokens } = this.truncateLongMessages(optimizedMessages, targetTokens);
      optimizedMessages = messages;
      removedTokens += tokens;
      strategy += strategy ? '+truncation' : 'truncation';
    }

    // Strategy 3: Remove oldest messages if still over limit
    if (this.estimateTokens(optimizedMessages) > targetTokens) {
      const { messages, tokens, count } = this.removeByAge(optimizedMessages, targetTokens);
      optimizedMessages = messages;
      removedTokens += tokens;
      removedMessages += count;
      strategy += strategy ? '+age_filtering' : 'age_filtering';
    }

    // Calculate quality impact
    const originalQuality = this.calculateContextQuality(context.selectedMessages);
    const optimizedQuality = this.calculateContextQuality(optimizedMessages);
    const qualityImpact = (originalQuality - optimizedQuality) / originalQuality;

    const optimizedContext: ContextData = {
      selectedMessages: optimizedMessages,
      projectFiles: context.projectFiles, // Keep project files as-is
      technicalContext: context.technicalContext,
      estimatedTokens: this.estimateTokens(optimizedMessages),
      selectionStrategy: `optimized_${strategy}`,
      qualityScore: optimizedQuality
    };

    return {
      optimizedContext,
      tokensRemoved: removedTokens,
      messagesRemoved: removedMessages,
      optimizationStrategy: strategy,
      qualityImpact
    };
  }

  /**
   * Remove messages by relevance score (lowest first)
   */
  private removeByRelevance(
    messages: RelevantMessage[],
    targetTokens: number
  ): { messages: RelevantMessage[]; tokens: number; count: number } {
    const sortedMessages = [...messages].sort((a, b) => b.relevanceScore - a.relevanceScore);
    let currentTokens = this.estimateTokens(sortedMessages);
    let removedTokens = 0;
    let removedCount = 0;

    while (currentTokens > targetTokens && sortedMessages.length > 1) {
      const removed = sortedMessages.pop();
      if (removed) {
        const messageTokens = this.estimateMessageTokens(removed);
        removedTokens += messageTokens;
        currentTokens -= messageTokens;
        removedCount++;
      }
    }

    return {
      messages: sortedMessages,
      tokens: removedTokens,
      count: removedCount
    };
  }

  /**
   * Truncate long messages to fit token budget
   */
  private truncateLongMessages(
    messages: RelevantMessage[],
    targetTokens: number
  ): { messages: RelevantMessage[]; tokens: number } {
    let currentTokens = this.estimateTokens(messages);
    let removedTokens = 0;
    const maxMessageTokens = 150; // Maximum tokens per message

    for (const message of messages) {
      if (currentTokens <= targetTokens) break;

      const messageTokens = this.estimateMessageTokens(message);
      if (messageTokens > maxMessageTokens) {
        const truncateLength = Math.floor((maxMessageTokens / messageTokens) * message.content.length);
        const originalLength = message.content.length;
        message.content = message.content.slice(0, truncateLength) + '...';
        
        const newTokens = this.estimateMessageTokens(message);
        const savedTokens = messageTokens - newTokens;
        currentTokens -= savedTokens;
        removedTokens += savedTokens;
      }
    }

    return {
      messages,
      tokens: removedTokens
    };
  }

  /**
   * Remove oldest messages first
   */
  private removeByAge(
    messages: RelevantMessage[],
    targetTokens: number
  ): { messages: RelevantMessage[]; tokens: number; count: number } {
    const sortedMessages = [...messages].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    let currentTokens = this.estimateTokens(sortedMessages);
    let removedTokens = 0;
    let removedCount = 0;

    while (currentTokens > targetTokens && sortedMessages.length > 1) {
      const removed = sortedMessages.pop(); // Remove oldest
      if (removed) {
        const messageTokens = this.estimateMessageTokens(removed);
        removedTokens += messageTokens;
        currentTokens -= messageTokens;
        removedCount++;
      }
    }

    return {
      messages: sortedMessages,
      tokens: removedTokens,
      count: removedCount
    };
  }

  /**
   * Calculate context quality score
   */
  private calculateContextQuality(messages: RelevantMessage[]): number {
    if (messages.length === 0) return 0;

    const avgRelevance = messages.reduce((sum, msg) => sum + msg.relevanceScore, 0) / messages.length;
    const avgEngagement = messages.reduce((sum, msg) => sum + msg.metadata.engagementScore, 0) / messages.length;
    const avgTechnical = messages.reduce((sum, msg) => sum + msg.metadata.technicalOverlap, 0) / messages.length;

    return (avgRelevance * 0.5) + (avgEngagement * 0.3) + (avgTechnical * 0.2);
  }

  /**
   * Estimate tokens for a collection of messages
   */
  private estimateTokens(messages: RelevantMessage[]): number {
    return messages.reduce((sum, msg) => sum + this.estimateMessageTokens(msg), 0);
  }

  /**
   * Estimate tokens for a single message
   */
  private estimateMessageTokens(message: RelevantMessage): number {
    return Math.ceil(message.content.length / 4); // 1 token ≈ 4 characters
  }

  /**
   * Create context window for caching
   */
  private createContextWindow(
    sessionId: string,
    context: ContextData,
    requirements: ContextRequirements
  ): ContextWindow {
    const expiresAt = new Date(Date.now() + (this.config.expirationMinutes * 60 * 1000));

    return {
      messages: context.selectedMessages,
      totalTokens: context.estimatedTokens,
      maxTokens: requirements.estimatedTokens,
      utilizationPercentage: (context.estimatedTokens / requirements.estimatedTokens) * 100,
      priorityScore: context.qualityScore,
      expiresAt
    };
  }

  /**
   * Create optimized context data
   */
  private createOptimizedContext(context: ContextData, strategy: string): ContextData {
    return {
      ...context,
      selectionStrategy: strategy
    };
  }

  /**
   * Create minimal fallback context
   */
  private createMinimalContext(context: ContextData): ContextData {
    const topMessage = context.selectedMessages
      .sort((a, b) => b.relevanceScore - a.relevanceScore)[0];

    return {
      selectedMessages: topMessage ? [topMessage] : [],
      projectFiles: [],
      technicalContext: { frameworks: [], languages: [], tools: [], concepts: [], errorPatterns: [] },
      estimatedTokens: topMessage ? this.estimateMessageTokens(topMessage) : 0,
      selectionStrategy: 'minimal_fallback',
      qualityScore: 0.3
    };
  }

  /**
   * Clean expired context windows
   */
  cleanExpiredWindows(): void {
    const now = new Date();
    let cleaned = 0;

    for (const [sessionId, window] of this.activeWindows) {
      if (window.expiresAt && window.expiresAt < now) {
        this.activeWindows.delete(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Cleaned ${cleaned} expired context windows`);
    }
  }

  /**
   * Get cached context window
   */
  getCachedWindow(sessionId: string): ContextWindow | null {
    const window = this.activeWindows.get(sessionId);
    
    if (window && window.expiresAt && window.expiresAt < new Date()) {
      this.activeWindows.delete(sessionId);
      return null;
    }
    
    return window || null;
  }

  /**
   * Update context manager configuration
   */
  updateConfig(newConfig: Partial<ContextWindowConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ ContextManager configuration updated:', newConfig);
  }

  /**
   * Get context management statistics
   */
  getContextStats(): {
    activeWindows: number;
    averageUtilization: number;
    averageQuality: number;
    memoryUsage: number;
  } {
    const windows = Array.from(this.activeWindows.values());
    
    const averageUtilization = windows.length > 0
      ? windows.reduce((sum, w) => sum + w.utilizationPercentage, 0) / windows.length
      : 0;
    
    const averageQuality = windows.length > 0
      ? windows.reduce((sum, w) => sum + w.priorityScore, 0) / windows.length
      : 0;
    
    // Rough memory usage estimation
    const memoryUsage = windows.reduce((sum, w) => {
      return sum + w.messages.reduce((msgSum, msg) => msgSum + msg.content.length, 0);
    }, 0);

    return {
      activeWindows: windows.length,
      averageUtilization,
      averageQuality,
      memoryUsage
    };
  }

  /**
   * Force cleanup of all context windows for a session
   */
  clearSession(sessionId: string): void {
    this.activeWindows.delete(sessionId);
    console.log(`🗑️ Cleared context window for session ${sessionId}`);
  }

  /**
   * Get memory usage information
   */
  getMemoryUsage(): {
    totalSessions: number;
    totalMessages: number;
    totalBytes: number;
    oldestWindow: Date | null;
  } {
    const windows = Array.from(this.activeWindows.values());
    const totalMessages = windows.reduce((sum, w) => sum + w.messages.length, 0);
    const totalBytes = windows.reduce((sum, w) => {
      return sum + w.messages.reduce((msgSum, msg) => msgSum + msg.content.length, 0);
    }, 0);
    
    const oldestWindow = windows.reduce((oldest: Date | null, w) => {
      if (!w.expiresAt) return oldest;
      if (!oldest || w.expiresAt < oldest) return w.expiresAt;
      return oldest;
    }, null);

    return {
      totalSessions: this.activeWindows.size,
      totalMessages,
      totalBytes,
      oldestWindow
    };
  }
}