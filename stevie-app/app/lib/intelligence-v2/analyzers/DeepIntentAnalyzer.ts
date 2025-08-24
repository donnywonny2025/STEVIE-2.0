/**
 * DeepIntentAnalyzer - Technical Request Extraction Engine
 * 
 * Analyzes queries beneath social layers to extract core technical requests,
 * implementation requirements, and coding objectives. This is the second layer
 * of Scout's multi-pass analysis approach.
 */

import type { IntentLayer, TechnicalSignal } from '../types/IntelligenceTypes';

export interface DeepAnalysisResult extends IntentLayer {
  technicalSignals: TechnicalSignal[];
  primaryAction?: string;
  primaryObject?: string;
  implementationHints: string[];
  complexityIndicators: string[];
  domainExpertise: string[];
}

export class DeepIntentAnalyzer {
  private technicalVerbs = [
    'debug', 'fix', 'optimize', 'refactor', 'implement', 'create', 'deploy', 
    'test', 'build', 'setup', 'configure', 'install', 'update', 'add', 'remove',
    'design', 'analyze', 'review', 'merge', 'commit', 'push', 'pull', 'clone'
  ];

  private technicalNouns = [
    'component', 'function', 'api', 'database', 'error', 'bug', 'endpoint', 
    'state', 'props', 'hook', 'service', 'module', 'class', 'interface', 
    'variable', 'array', 'object', 'response', 'request', 'server', 'client'
  ];

  async analyze(query: string): Promise<DeepAnalysisResult> {
    const technicalSignals = this.extractTechnicalSignals(query);
    const { primaryAction, primaryObject } = this.findPrimaryActionObject(query);
    const implementationHints = this.generateImplementationHints(technicalSignals);
    const complexityIndicators = this.identifyComplexityIndicators(query);
    const domainExpertise = this.identifyDomainExpertise(technicalSignals);
    
    const confidence = this.calculateDeepConfidence(technicalSignals, query);
    const type = confidence > 0.5 ? 'technical' : 'social';
    
    return {
      type,
      confidence,
      indicators: technicalSignals.map(s => `${s.type}:${s.value}`),
      technicalSignals,
      primaryAction,
      primaryObject,
      implementationHints,
      complexityIndicators,
      domainExpertise
    };
  }

  private extractTechnicalSignals(query: string): TechnicalSignal[] {
    const signals: TechnicalSignal[] = [];
    const words = query.toLowerCase().split(/\s+/);
    
    // Find technical verbs and nouns
    for (const word of words) {
      for (const verb of this.technicalVerbs) {
        if (word.includes(verb)) {
          signals.push({
            type: 'operation',
            value: verb,
            confidence: 0.8,
            context: word
          });
        }
      }
      
      for (const noun of this.technicalNouns) {
        if (word.includes(noun)) {
          signals.push({
            type: 'concept',
            value: noun,
            confidence: 0.7,
            context: word
          });
        }
      }
    }
    
    return signals;
  }

  private findPrimaryActionObject(query: string): { primaryAction?: string; primaryObject?: string } {
    const words = query.toLowerCase().split(/\s+/);
    const foundVerbs = words.filter(word => 
      this.technicalVerbs.some(verb => word.includes(verb))
    );
    const foundNouns = words.filter(word => 
      this.technicalNouns.some(noun => word.includes(noun))
    );
    
    return {
      primaryAction: foundVerbs[0],
      primaryObject: foundNouns[0]
    };
  }

  private generateImplementationHints(signals: TechnicalSignal[]): string[] {
    const hints: string[] = [];
    
    if (signals.some(s => s.value === 'debug')) {
      hints.push('Provide step-by-step debugging approach');
    }
    if (signals.some(s => s.value === 'create')) {
      hints.push('Offer complete implementation with examples');
    }
    if (signals.some(s => s.value === 'optimize')) {
      hints.push('Include performance considerations');
    }
    
    return hints;
  }

  private identifyComplexityIndicators(query: string): string[] {
    const indicators: string[] = [];
    
    if (/architecture|design pattern|scalability/i.test(query)) {
      indicators.push('architectural_complexity');
    }
    if (/performance|optimization|memory/i.test(query)) {
      indicators.push('performance_complexity');
    }
    if (/security|auth|encrypt/i.test(query)) {
      indicators.push('security_complexity');
    }
    
    return indicators;
  }

  private identifyDomainExpertise(signals: TechnicalSignal[]): string[] {
    const domains: string[] = [];
    
    if (signals.some(s => ['react', 'vue', 'angular'].includes(s.value))) {
      domains.push('frontend_frameworks');
    }
    if (signals.some(s => ['api', 'server', 'database'].includes(s.value))) {
      domains.push('backend_development');
    }
    
    return domains;
  }

  private calculateDeepConfidence(signals: TechnicalSignal[], query: string): number {
    if (signals.length === 0) return 0.1;
    
    const avgSignalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
    const densityBonus = Math.min(signals.length * 0.1, 0.3);
    
    return Math.min(avgSignalConfidence + densityBonus, 1.0);
  }
}