/**
 * TokenManager - Real-Time Token Monitoring & Savings Analytics
 * 
 * Tracks token usage, calculates savings, and provides real-time feedback.
 * Shows users exactly how much we're saving vs the old "Bible dump" approach.
 * 
 * Key features:
 * - Real-time token counting (1 token ≈ 4 characters)
 * - Before/after comparison display  
 * - Per-session and cumulative savings
 * - Debug interface with context payload preview
 */

export interface TokenUsage {
  query_tokens: number;
  context_tokens: number;
  total_tokens: number;
  estimated_cost?: number;
  breakdown: {
    system_prompt: number;
    user_query: number;
    relevant_history: number;
    technical_context: number;
    file_context: number;
  };
}

export interface SavingsAnalytics {
  session_savings: number;
  total_savings: number;
  efficiency_percentage: number;
  queries_optimized: number;
  average_reduction: number;
  peak_savings: number;
  session_stats: {
    simple_queries: number;
    medium_queries: number;
    complex_queries: number;
    fallback_queries: number;
  };
}

export interface ContextPayload {
  template_tokens: number;
  relevant_history_tokens: number;
  technical_context_tokens: number;
  file_context_tokens: number;
  total_payload_tokens: number;
  components: ContextComponent[];
}

export interface ContextComponent {
  type: 'system_prompt' | 'user_query' | 'history' | 'technical' | 'files';
  content_preview: string;
  token_count: number;
  relevance_score?: number;
}

export interface TokenDisplayData {
  query_type: string;
  tokens_used: number;
  tokens_saved: number;
  efficiency_gain: string;
  cost_saved?: string;
  comparison: {
    old_system: number;
    new_system: number;
    reduction_percentage: number;
  };
}

// Token pricing (if available)
const GEMINI_PRICING = {
  INPUT_TOKENS_PER_DOLLAR: 1000000, // Rough estimate for free tier calculations
  OUTPUT_TOKENS_PER_DOLLAR: 1000000
};

// Old system baselines for comparison
const OLD_SYSTEM_BASELINES = {
  SIMPLE_QUERY: 1500,  // What Bolt used to send for "hello"
  MEDIUM_QUERY: 1800,  // Medium complexity
  COMPLEX_QUERY: 2500  // Complex requests
};

export class TokenManager {
  private sessionStorage: Map<string, SavingsAnalytics> = new Map();
  private totalSavings = 0;
  private totalQueries = 0;

  /**
   * Count tokens in text (simple but consistent: 1 token ≈ 4 characters)
   */
  countTokens(text: string): number {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Analyze token usage for a complete prompt
   */
  analyzeUsage(
    systemPrompt: string,
    userQuery: string,
    contextComponents: { history?: string; technical?: string; files?: string } = {}
  ): TokenUsage {
    const breakdown = {
      system_prompt: this.countTokens(systemPrompt),
      user_query: this.countTokens(userQuery),
      relevant_history: this.countTokens(contextComponents.history || ''),
      technical_context: this.countTokens(contextComponents.technical || ''),
      file_context: this.countTokens(contextComponents.files || '')
    };

    const total_tokens = Object.values(breakdown).reduce((sum, tokens) => sum + tokens, 0);

    return {
      query_tokens: breakdown.user_query,
      context_tokens: total_tokens - breakdown.user_query,
      total_tokens,
      breakdown,
      estimated_cost: this.estimateCost(total_tokens)
    };
  }

  /**
   * Track savings compared to old system
   */
  trackSavings(
    sessionId: string,
    queryType: string,
    actualTokens: number,
    analysis?: any
  ): TokenDisplayData {
    // Determine what old system would have used
    const oldSystemTokens = this.getOldSystemBaseline(queryType, analysis);
    const tokensSaved = oldSystemTokens - actualTokens;
    const reductionPercentage = Math.round((tokensSaved / oldSystemTokens) * 100);

    // Update session analytics
    this.updateSessionAnalytics(sessionId, tokensSaved, queryType);

    // Build display data
    const displayData: TokenDisplayData = {
      query_type: queryType,
      tokens_used: actualTokens,
      tokens_saved: tokensSaved,
      efficiency_gain: `${reductionPercentage}%`,
      cost_saved: this.estimateCostSavings(tokensSaved),
      comparison: {
        old_system: oldSystemTokens,
        new_system: actualTokens,
        reduction_percentage: reductionPercentage
      }
    };

    console.log(`💰 Token savings: ${queryType} | Used: ${actualTokens} | Saved: ${tokensSaved} (${reductionPercentage}%)`);
    
    return displayData;
  }

  /**
   * Get baseline token usage for old system
   */
  private getOldSystemBaseline(queryType: string, analysis?: any): number {
    // Base on query complexity
    switch (queryType) {
      case 'SIMPLE':
        return OLD_SYSTEM_BASELINES.SIMPLE_QUERY;
      case 'MEDIUM':
        return OLD_SYSTEM_BASELINES.MEDIUM_QUERY;
      case 'COMPLEX':
        return OLD_SYSTEM_BASELINES.COMPLEX_QUERY;
      default:
        return OLD_SYSTEM_BASELINES.SIMPLE_QUERY;
    }
  }

  /**
   * Update session analytics
   */
  private updateSessionAnalytics(sessionId: string, tokensSaved: number, queryType: string): void {
    let analytics = this.sessionStorage.get(sessionId);
    
    if (!analytics) {
      analytics = {
        session_savings: 0,
        total_savings: 0,
        efficiency_percentage: 0,
        queries_optimized: 0,
        average_reduction: 0,
        peak_savings: 0,
        session_stats: {
          simple_queries: 0,
          medium_queries: 0,
          complex_queries: 0,
          fallback_queries: 0
        }
      };
    }

    // Update counters
    analytics.session_savings += tokensSaved;
    analytics.queries_optimized += 1;
    analytics.peak_savings = Math.max(analytics.peak_savings, tokensSaved);

    // Update query type stats
    switch (queryType) {
      case 'SIMPLE':
        analytics.session_stats.simple_queries += 1;
        break;
      case 'MEDIUM':
        analytics.session_stats.medium_queries += 1;
        break;
      case 'COMPLEX':
        analytics.session_stats.complex_queries += 1;
        break;
      default:
        analytics.session_stats.fallback_queries += 1;
    }

    // Calculate averages
    analytics.average_reduction = Math.round(analytics.session_savings / analytics.queries_optimized);
    analytics.efficiency_percentage = Math.round(
      (analytics.session_savings / (analytics.session_savings + (analytics.queries_optimized * 500))) * 100
    );

    // Update totals
    this.totalSavings += tokensSaved;
    this.totalQueries += 1;
    analytics.total_savings = this.totalSavings;

    this.sessionStorage.set(sessionId, analytics);
  }

  /**
   * Get savings report for a session
   */
  getSavingsReport(sessionId: string): SavingsAnalytics | null {
    return this.sessionStorage.get(sessionId) || null;
  }

  /**
   * Get global savings report
   */
  getGlobalSavingsReport(): { total_savings: number; total_queries: number; average_savings: number } {
    return {
      total_savings: this.totalSavings,
      total_queries: this.totalQueries,
      average_savings: this.totalQueries > 0 ? Math.round(this.totalSavings / this.totalQueries) : 0
    };
  }

  /**
   * Build context payload preview for debugging
   */
  buildContextPayloadPreview(
    systemPrompt: string,
    contextComponents: { history?: string; technical?: string; files?: string } = {}
  ): ContextPayload {
    const components: ContextComponent[] = [];
    let totalTokens = 0;

    // System prompt component
    const systemTokens = this.countTokens(systemPrompt);
    components.push({
      type: 'system_prompt',
      content_preview: this.truncateForPreview(systemPrompt, 100),
      token_count: systemTokens
    });
    totalTokens += systemTokens;

    // History component
    if (contextComponents.history) {
      const historyTokens = this.countTokens(contextComponents.history);
      components.push({
        type: 'history',
        content_preview: this.truncateForPreview(contextComponents.history, 100),
        token_count: historyTokens
      });
      totalTokens += historyTokens;
    }

    // Technical context component
    if (contextComponents.technical) {
      const techTokens = this.countTokens(contextComponents.technical);
      components.push({
        type: 'technical',
        content_preview: this.truncateForPreview(contextComponents.technical, 100),
        token_count: techTokens
      });
      totalTokens += techTokens;
    }

    // File context component
    if (contextComponents.files) {
      const fileTokens = this.countTokens(contextComponents.files);
      components.push({
        type: 'files',
        content_preview: this.truncateForPreview(contextComponents.files, 100),
        token_count: fileTokens
      });
      totalTokens += fileTokens;
    }

    return {
      template_tokens: systemTokens,
      relevant_history_tokens: this.countTokens(contextComponents.history || ''),
      technical_context_tokens: this.countTokens(contextComponents.technical || ''),
      file_context_tokens: this.countTokens(contextComponents.files || ''),
      total_payload_tokens: totalTokens,
      components
    };
  }

  /**
   * Estimate cost based on token count
   */
  private estimateCost(tokens: number): number | undefined {
    // For free tier, cost is effectively 0, but show theoretical cost
    return tokens / GEMINI_PRICING.INPUT_TOKENS_PER_DOLLAR;
  }

  /**
   * Estimate cost savings
   */
  private estimateCostSavings(tokensSaved: number): string {
    const theoreticalSavings = tokensSaved / GEMINI_PRICING.INPUT_TOKENS_PER_DOLLAR;
    
    if (theoreticalSavings < 0.01) {
      return '< $0.01';
    }
    
    return `$${theoreticalSavings.toFixed(3)}`;
  }

  /**
   * Truncate text for preview display
   */
  private truncateForPreview(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Generate formatted display for UI
   */
  formatForDisplay(tokenData: TokenDisplayData): string {
    return `${tokenData.query_type} | ${tokenData.tokens_used} tokens | Saved: ${tokenData.tokens_saved} (${tokenData.efficiency_gain})`;
  }

  /**
   * Generate detailed report for analytics
   */
  generateDetailedReport(sessionId: string): string {
    const analytics = this.getSavingsReport(sessionId);
    const global = this.getGlobalSavingsReport();
    
    if (!analytics) return 'No analytics available';

    return `
📊 TOKEN EFFICIENCY REPORT

🎯 Session Performance:
• Queries Optimized: ${analytics.queries_optimized}
• Total Tokens Saved: ${analytics.session_savings.toLocaleString()}
• Average Reduction: ${analytics.average_reduction} tokens/query
• Efficiency Rate: ${analytics.efficiency_percentage}%
• Peak Single Savings: ${analytics.peak_savings} tokens

📈 Query Breakdown:
• Simple: ${analytics.session_stats.simple_queries} (targeting 97% reduction)
• Medium: ${analytics.session_stats.medium_queries} (targeting 87% reduction)  
• Complex: ${analytics.session_stats.complex_queries} (targeting 60% reduction)
• Fallback: ${analytics.session_stats.fallback_queries} (smart degradation)

🌍 Global Stats:
• Total Savings: ${global.total_savings.toLocaleString()} tokens
• Total Queries: ${global.total_queries}
• Average Savings: ${global.average_savings} tokens/query

💡 Impact: Every query now uses intelligent context instead of dumping everything!
    `.trim();
  }

  /**
   * Reset session analytics (for testing)
   */
  resetSession(sessionId: string): void {
    this.sessionStorage.delete(sessionId);
  }

  /**
   * Export analytics data
   */
  exportAnalytics(): { sessions: any; global: any } {
    return {
      sessions: Object.fromEntries(this.sessionStorage),
      global: this.getGlobalSavingsReport()
    };
  }
}