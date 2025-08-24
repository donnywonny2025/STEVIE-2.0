/**
 * ComplexityAnalyzer - Escalation Detection Engine
 * 
 * Determines when queries require escalation to full context processing
 * based on technical depth, multi-step reasoning needs, and domain complexity.
 */

import type { IntentLayer } from '../types/IntelligenceTypes';

export interface ComplexityAnalysisResult extends IntentLayer {
  complexityLevel: 'minimal' | 'basic' | 'intermediate' | 'advanced' | 'expert';
  escalationFactors: string[];
  recommendedTokens: number;
  requiresExpertise: string[];
  multiStepProcess: boolean;
}

export class ComplexityAnalyzer {
  private complexityKeywords = [
    'architecture', 'design pattern', 'scalability', 'performance', 'security',
    'authentication', 'authorization', 'optimization', 'refactoring', 'testing',
    'deployment', 'docker', 'kubernetes', 'microservices', 'database design'
  ];

  async analyze(query: string): Promise<ComplexityAnalysisResult> {
    const escalationFactors = this.detectEscalationFactors(query);
    const complexityLevel = this.determineComplexityLevel(escalationFactors, query);
    const recommendedTokens = this.calculateTokenRequirement(complexityLevel);
    const requiresExpertise = this.identifyRequiredExpertise(query);
    const multiStepProcess = this.detectMultiStepProcess(query);
    
    const confidence = escalationFactors.length > 0 ? 0.8 : 0.3;
    const type = complexityLevel === 'minimal' ? 'social' : 'complex';
    
    return {
      type,
      confidence,
      indicators: escalationFactors,
      complexityLevel,
      escalationFactors,
      recommendedTokens,
      requiresExpertise,
      multiStepProcess
    };
  }

  private detectEscalationFactors(query: string): string[] {
    const factors: string[] = [];
    
    // Error patterns
    if (/error|exception|failed|broken|not working|undefined|null/i.test(query)) {
      factors.push('error_debugging');
    }
    
    // Multi-file complexity
    if (/multiple files|several files|project|app|application/i.test(query)) {
      factors.push('multi_file_context');
    }
    
    // Architecture complexity
    for (const keyword of this.complexityKeywords) {
      if (query.toLowerCase().includes(keyword)) {
        factors.push(`architecture:${keyword}`);
        break;
      }
    }
    
    return factors;
  }

  private determineComplexityLevel(
    factors: string[], 
    query: string
  ): 'minimal' | 'basic' | 'intermediate' | 'advanced' | 'expert' {
    if (factors.length === 0) return 'minimal';
    if (factors.some(f => f.includes('architecture'))) return 'expert';
    if (factors.some(f => f.includes('error'))) return 'advanced';
    if (factors.some(f => f.includes('multi_file'))) return 'intermediate';
    return 'basic';
  }

  private calculateTokenRequirement(complexityLevel: string): number {
    switch (complexityLevel) {
      case 'minimal': return 50;
      case 'basic': return 200;
      case 'intermediate': return 400;
      case 'advanced': return 800;
      case 'expert': return 1200;
      default: return 50;
    }
  }

  private identifyRequiredExpertise(query: string): string[] {
    const expertise: string[] = [];
    
    if (/react|vue|angular/i.test(query)) expertise.push('frontend');
    if (/node|express|api/i.test(query)) expertise.push('backend');
    if (/database|sql|mongo/i.test(query)) expertise.push('database');
    if (/deploy|docker|aws/i.test(query)) expertise.push('devops');
    
    return expertise;
  }

  private detectMultiStepProcess(query: string): boolean {
    const multiStepIndicators = [
      /step by step/i,
      /first.*then.*finally/i,
      /multiple.*steps/i,
      /process.*involves/i
    ];
    
    return multiStepIndicators.some(pattern => pattern.test(query));
  }
}