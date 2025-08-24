/**
 * ContextualIntentAnalyzer - Conversation Continuity Analysis
 * 
 * Analyzes conversation flow and context dependency to determine when
 * queries require historical context for proper understanding.
 */

import type { IntentLayer, ChatMessage } from '../types/IntelligenceTypes';

export interface ContextualAnalysisResult extends IntentLayer {
  contextDependency: number;
  referenceIndicators: string[];
  conversationFlow: 'new_topic' | 'continuation' | 'clarification' | 'followup';
  requiresHistory: boolean;
  historyDepth: number;
}

export class ContextualIntentAnalyzer {
  private continuationWords = ['this', 'that', 'it', 'also', 'and', 'plus', 'additionally'];
  private followupWords = ['but', 'however', 'actually', 'wait', 'now', 'also'];
  private referenceWords = ['above', 'previous', 'earlier', 'before', 'last'];

  async analyze(query: string, history: ChatMessage[] = []): Promise<ContextualAnalysisResult> {
    const referenceIndicators = this.findReferenceIndicators(query);
    const contextDependency = this.calculateContextDependency(query, history);
    const conversationFlow = this.determineConversationFlow(query, history);
    const requiresHistory = contextDependency > 0.3 || referenceIndicators.length > 0;
    const historyDepth = this.calculateRequiredHistoryDepth(query, history);
    
    const confidence = this.calculateContextualConfidence(
      contextDependency, referenceIndicators, history
    );
    
    return {
      type: requiresHistory ? 'continuation' : 'social',
      confidence,
      indicators: referenceIndicators,
      contextDependency,
      referenceIndicators,
      conversationFlow,
      requiresHistory,
      historyDepth
    };
  }

  private findReferenceIndicators(query: string): string[] {
    const indicators: string[] = [];
    const words = query.toLowerCase().split(/\s+/);
    
    for (const word of words) {
      if (this.continuationWords.includes(word)) {
        indicators.push(`continuation:${word}`);
      }
      if (this.followupWords.includes(word)) {
        indicators.push(`followup:${word}`);
      }
      if (this.referenceWords.includes(word)) {
        indicators.push(`reference:${word}`);
      }
    }
    
    return indicators;
  }

  private calculateContextDependency(query: string, history: ChatMessage[]): number {
    let dependency = 0;
    
    // Pronoun usage indicates dependency
    const pronouns = /\b(this|that|it|they|them|those|these)\b/gi;
    const pronounMatches = query.match(pronouns) || [];
    dependency += Math.min(pronounMatches.length * 0.2, 0.4);
    
    // Continuation words
    const continuationMatches = this.continuationWords.filter(word => 
      query.toLowerCase().includes(word)
    );
    dependency += Math.min(continuationMatches.length * 0.3, 0.6);
    
    // History boost
    if (history.length > 0) {
      dependency += 0.2;
    }
    
    return Math.min(dependency, 1.0);
  }

  private determineConversationFlow(
    query: string, 
    history: ChatMessage[]
  ): 'new_topic' | 'continuation' | 'clarification' | 'followup' {
    const clarificationWords = ['what do you mean', 'can you explain', 'clarify', 'confused'];
    const followupWords = ['also', 'additionally', 'and', 'plus'];
    
    if (clarificationWords.some(word => query.toLowerCase().includes(word))) {
      return 'clarification';
    }
    
    if (followupWords.some(word => query.toLowerCase().includes(word))) {
      return 'followup';
    }
    
    if (this.continuationWords.some(word => query.toLowerCase().includes(word))) {
      return 'continuation';
    }
    
    return 'new_topic';
  }

  private calculateRequiredHistoryDepth(query: string, history: ChatMessage[]): number {
    const referenceStrength = this.findReferenceIndicators(query).length;
    const baseDepth = Math.min(referenceStrength * 2, 5);
    
    return Math.min(baseDepth, history.length);
  }

  private calculateContextualConfidence(
    dependency: number,
    indicators: string[],
    history: ChatMessage[]
  ): number {
    let confidence = dependency * 0.6;
    confidence += Math.min(indicators.length * 0.1, 0.3);
    confidence += history.length > 0 ? 0.1 : 0;
    
    return Math.min(confidence, 1.0);
  }
}