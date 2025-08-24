// Quality-Aware Context Manager
// Extends existing Scout Intelligence DynamicContextManager with quality guidance injection

import { DynamicContextManager } from './DynamicContextManager';
import type { 
  ContextWindow, 
  ContextComponent,
  ContextLevel 
} from './DynamicContextManager';
import type { SemanticAnalysis } from './AdvancedQueryAnalyzer';
import type { ContextSelectionResult } from './IntelligentContextRetrieval';
import { qualityCurator } from '../quality/QualityCurationManager';
import type { QualityAwareContextRequirement, QualityGuidance } from '../quality/types/QualityTypes';

/**
 * Enhanced context manager that adds quality guidance to context windows
 * Maintains 100% compatibility with existing Scout Intelligence DynamicContextManager
 * 
 * Key features:
 * - Extends existing DynamicContextManager (zero breaking changes)
 * - Conditionally injects quality guidance for component creation
 * - Preserves all existing fallback and error handling
 * - Maintains token efficiency targets
 */
export class QualityAwareContextManager extends DynamicContextManager {
  private qualityGuidanceCache: Map<string, QualityGuidance> = new Map();

  constructor() {
    super();
    console.log('🎨 Quality-Aware Context Manager initialized - artist guidance enabled');
  }

  /**
   * Enhanced context window building with quality guidance injection
   * Maintains full compatibility with existing Scout Intelligence
   */
  async buildContextWindow(
    analysis: SemanticAnalysis,
    relevantContext: ContextSelectionResult,
    userQuery: string,
    sessionId: string
  ): Promise<ContextWindow> {
    try {
      // 1. Build base context window using existing Scout Intelligence
      const baseContextWindow = await super.buildContextWindow(analysis, relevantContext, userQuery, sessionId);
      
      // 2. Check if this requires quality guidance
      const qualityRequirements = analysis.context_requirements as QualityAwareContextRequirement;
      
      if (!qualityRequirements.requires_quality_guidance) {
        // No quality guidance needed - return base context as-is
        return baseContextWindow;
      }

      // 3. Inject quality guidance into context window
      const enhancedWindow = await this.injectQualityGuidance(
        baseContextWindow,
        qualityRequirements,
        userQuery
      );

      console.log(`✨ Quality guidance injected: +${enhancedWindow.quality_token_count || 0} tokens`);
      return enhancedWindow;

    } catch (error) {
      console.error('Quality-aware context building failed, falling back to base context:', error);
      // Graceful degradation - use base Scout Intelligence
      return await super.buildContextWindow(analysis, relevantContext, userQuery, sessionId);
    }
  }

  /**
   * Inject quality guidance into the context window
   */
  private async injectQualityGuidance(
    baseWindow: ContextWindow,
    qualityRequirements: QualityAwareContextRequirement,
    userQuery: string
  ): Promise<ContextWindow & { contains_quality_guidance?: boolean; quality_token_count?: number }> {
    try {
      // Build quality guidance content
      const qualityContent = await this.buildQualityGuidanceContent(qualityRequirements, userQuery);
      
      if (!qualityContent) {
        console.log('📊 No quality guidance generated - using base context');
        return baseWindow;
      }

      // Create quality guidance component
      const qualityComponent: ContextComponent = {
        type: 'technical_context', // Integrate smoothly with existing types
        content: qualityContent.content,
        token_count: qualityContent.token_count,
        source: 'quality_guidance',
        relevance_score: 0.9
      };

      // Check token budget
      const totalTokens = baseWindow.token_count + qualityContent.token_count;
      const tokenBudget = qualityRequirements.quality_token_budget || 150;
      
      if (qualityContent.token_count > tokenBudget) {
        console.warn(`⚠️ Quality guidance exceeds budget: ${qualityContent.token_count} > ${tokenBudget} tokens`);
        // Truncate or skip quality guidance if too expensive
        return baseWindow;
      }

      // Add quality guidance to components
      const enhancedComponents = [...baseWindow.components, qualityComponent];
      
      // Update content with quality guidance
      const enhancedContent = baseWindow.content + '\n\n' + qualityContent.content;

      return {
        ...baseWindow,
        content: enhancedContent,
        token_count: totalTokens,
        components: enhancedComponents,
        
        // Quality-specific metadata
        contains_quality_guidance: true,
        quality_token_count: qualityContent.token_count
      };

    } catch (error) {
      console.warn('Quality guidance injection failed:', error);
      return baseWindow; // Graceful degradation
    }
  }

  /**
   * Build quality guidance content based on detected components and domains
   */
  private async buildQualityGuidanceContent(
    requirements: QualityAwareContextRequirement,
    userQuery: string
  ): Promise<{ content: string; token_count: number } | null> {
    const guidanceparts: string[] = [];
    let totalTokens = 0;

    // Get guidance for each detected domain
    for (const domain of requirements.quality_domains || []) {
      // Extract component type from query for more specific guidance
      const componentType = this.extractComponentType(userQuery);
      const guidance = await this.getQualityGuidance(componentType, domain);
      
      if (guidance) {
        const guidanceText = this.formatQualityGuidance(guidance, componentType);
        guidanceparts.push(guidanceText);
        totalTokens += Math.ceil(guidanceText.length / 4); // Rough token estimation
      }
    }

    if (guidanceparts.length === 0) {
      return null;
    }

    const content = guidanceparts.join('\n\n');
    
    return {
      content,
      token_count: totalTokens
    };
  }

  /**
   * Get quality guidance with caching
   */
  private async getQualityGuidance(componentType: string, domain: string): Promise<QualityGuidance | null> {
    const cacheKey = `${domain}:${componentType}`;
    
    // Check cache first
    if (this.qualityGuidanceCache.has(cacheKey)) {
      return this.qualityGuidanceCache.get(cacheKey)!;
    }

    try {
      const guidance = await qualityCurator.getGuidance(componentType, domain);
      
      if (guidance) {
        // Cache the result
        this.qualityGuidanceCache.set(cacheKey, guidance);
        
        // Cleanup cache if too large
        if (this.qualityGuidanceCache.size > 100) {
          const entries = Array.from(this.qualityGuidanceCache.entries());
          entries.slice(0, 50).forEach(([key]) => this.qualityGuidanceCache.delete(key));
        }
      }
      
      return guidance;
    } catch (error) {
      console.warn(`Failed to get quality guidance for ${cacheKey}:`, error);
      return null;
    }
  }

  /**
   * Extract component type from user query
   */
  private extractComponentType(query: string): string {
    const componentPatterns = {
      'button': /button/i,
      'form': /form/i,
      'modal': /modal|dialog/i,
      'input': /input|field/i,
      'card': /card/i,
      'navigation': /nav|navigation|menu/i,
      'table': /table|grid|data/i,
      'chart': /chart|graph|visualization/i
    };

    for (const [component, pattern] of Object.entries(componentPatterns)) {
      if (pattern.test(query)) {
        return component;
      }
    }

    // Default to generic component
    return 'component';
  }

  /**
   * Format quality guidance for injection into context
   */
  private formatQualityGuidance(guidance: QualityGuidance, componentType: string): string {
    const parts: string[] = [];

    // Add tier-based recommendation header
    parts.push(`## Quality Guidance: ${componentType} (Tier ${guidance.tier})`);
    
    // Add top library recommendations (focus on Tier 1)
    const topLibraries = guidance.recommendations.recommended_libraries
      .filter(lib => lib.tier <= 2) // Focus on simplest options
      .slice(0, 2); // Limit to top 2 to control tokens
    
    if (topLibraries.length > 0) {
      parts.push('**Recommended Approach:**');
      topLibraries.forEach(lib => {
        parts.push(`• **${lib.name}** (Tier ${lib.tier}): ${lib.reason}`);
        if (lib.installation_snippet) {
          parts.push(`  \`${lib.installation_snippet}\``);
        }
      });
    }

    // Add key best practices (limit to top 3 to control tokens)
    if (guidance.recommendations.best_practices.length > 0) {
      parts.push('**Key Best Practices:**');
      guidance.recommendations.best_practices.slice(0, 3).forEach(practice => {
        parts.push(`• ${practice}`);
      });
    }

    // Add fallback response if available
    if (guidance.fallback_response) {
      parts.push(`**Quick Start:** ${guidance.fallback_response}`);
    }

    return parts.join('\n');
  }

  /**
   * Get quality guidance cache statistics for monitoring
   */
  getQualityGuidanceCacheStats(): {
    cache_size: number;
    memory_estimate_kb: number;
  } {
    return {
      cache_size: this.qualityGuidanceCache.size,
      memory_estimate_kb: this.qualityGuidanceCache.size * 1.5 // Rough estimate
    };
  }

  /**
   * Clear quality guidance cache (for testing/debugging)
   */
  clearQualityGuidanceCache(): void {
    this.qualityGuidanceCache.clear();
    console.log('🧹 Quality guidance cache cleared');
  }
}