// STEVIE's Quality Curation Manager
// Integrates with existing Scout Intelligence for design quality guidance

import type { 
  QualityGuidance, 
  DomainKnowledge, 
  LibraryRecommendation,
  QualityMetrics,
  QualityAnalysisResult
} from './types/QualityTypes';

export class QualityCurationManager {
  private static instance: QualityCurationManager;
  private qualityCache: Map<string, QualityGuidance> = new Map();
  private domainKnowledge: Map<string, DomainKnowledge> = new Map();
  private performanceMetrics: QualityMetrics[] = [];
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  // Performance targets from Scout Intelligence system
  private readonly PERFORMANCE_TARGETS = {
    LOOKUP_MAX_MS: 50,        // Match Scout Intelligence speed
    INITIALIZATION_MAX_MS: 200, // Acceptable startup time
    MEMORY_MAX_MB: 10,        // Keep quality data lightweight
    CACHE_TTL_MS: 3600000     // 1 hour cache for dynamic data
  };

  // Singleton pattern for performance and memory efficiency
  public static getInstance(): QualityCurationManager {
    if (!QualityCurationManager.instance) {
      QualityCurationManager.instance = new QualityCurationManager();
    }
    return QualityCurationManager.instance;
  }

  /**
   * Initialize all quality domains with performance monitoring
   * Target: <200ms startup time
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    if (this.initializationPromise) return this.initializationPromise;

    this.initializationPromise = this.performInitialization();
    await this.initializationPromise;
    this.initialized = true;
  }

  private async performInitialization(): Promise<void> {
    const startTime = performance.now();
    
    try {
      // Load all quality domains in parallel for speed
      await Promise.allSettled([
        this.loadUIComponentGuidance(),
        this.loadAPIPatterns(),
        this.loadArchitecturePatterns(),
        // Future domains can be added here
      ]);

      const loadTime = performance.now() - startTime;
      console.log(`✅ Quality curation loaded: ${this.qualityCache.size} patterns in ${Math.round(loadTime)}ms`);
      
      // Performance monitoring - warn if exceeding targets
      if (loadTime > this.PERFORMANCE_TARGETS.INITIALIZATION_MAX_MS) {
        console.warn(`⚠️ Quality initialization slow: ${Math.round(loadTime)}ms (target: <${this.PERFORMANCE_TARGETS.INITIALIZATION_MAX_MS}ms)`);
      }

      // Log memory usage for monitoring
      if (typeof performance !== 'undefined' && 'memory' in performance) {
        const memoryMB = (performance.memory as any).usedJSHeapSize / 1024 / 1024;
        console.log(`📊 Quality system memory: ${memoryMB.toFixed(2)}MB`);
      }

    } catch (error) {
      console.error('❌ Failed to initialize quality curation:', error);
      // Graceful degradation - continue without quality guidance
    }
  }

  /**
   * Get quality guidance for a component with performance tracking
   * Target: <50ms lookup time
   */
  async getGuidance(
    component: string, 
    domain: string = 'ui', 
    context?: string
  ): Promise<QualityGuidance | null> {
    await this.initialize();
    
    const startTime = performance.now();
    const cacheKey = `${domain}:${component.toLowerCase()}`;
    
    // Fast cache lookup
    const result = this.qualityCache.get(cacheKey);
    
    // Performance tracking
    const lookupTime = performance.now() - startTime;
    this.recordMetrics({
      lookup_time_ms: lookupTime,
      guidance_found: !!result,
      tokens_added: result?.estimated_tokens || 0,
      tier_recommended: result?.tier || 1,
      domain,
      query_type: component
    });
    
    // Warn if exceeding performance targets
    if (lookupTime > this.PERFORMANCE_TARGETS.LOOKUP_MAX_MS) {
      console.warn(`⚠️ Quality lookup slow: ${Math.round(lookupTime)}ms for ${cacheKey} (target: <${this.PERFORMANCE_TARGETS.LOOKUP_MAX_MS}ms)`);
    }
    
    return result || null;
  }

  /**
   * Get library recommendations with STEVIE tier prioritization
   */
  async getLibraryRecommendations(
    componentType: string,
    requirements?: string[],
    maxTier: number = 4
  ): Promise<LibraryRecommendation[]> {
    await this.initialize();
    
    const guidance = await this.getGuidance(componentType, 'ui');
    if (!guidance) return [];
    
    let recommendations = guidance.recommendations.recommended_libraries;
    
    // Filter by STEVIE tier system (prioritize lower tiers = simpler implementation)
    recommendations = recommendations.filter(lib => lib.tier <= maxTier);
    
    // Filter based on requirements if provided
    if (requirements && requirements.length > 0) {
      recommendations = recommendations.filter(lib => 
        requirements.some(req => 
          lib.use_case.toLowerCase().includes(req.toLowerCase()) ||
          lib.reason.toLowerCase().includes(req.toLowerCase()) ||
          lib.stevie_compatibility.setup_complexity.includes(req.toLowerCase())
        )
      );
    }
    
    // Sort by STEVIE tier (1 = best/simplest), then by setup complexity
    return recommendations.sort((a, b) => {
      if (a.tier !== b.tier) return a.tier - b.tier;
      
      const complexityOrder = ['zero-friction', 'managed-setup', 'selective-use', 'avoid'];
      const aIndex = complexityOrder.indexOf(a.stevie_compatibility.setup_complexity);
      const bIndex = complexityOrder.indexOf(b.stevie_compatibility.setup_complexity);
      
      return aIndex - bIndex;
    });
  }

  /**
   * Analyze a query to determine if quality guidance is needed
   */
  async analyzeQualityNeeds(query: string, context?: any): Promise<QualityAnalysisResult> {
    const queryLower = query.toLowerCase();
    const detectedDomains: string[] = [];
    const detectedComponents: string[] = [];
    
    // Domain detection patterns
    const domainPatterns = {
      'ui': [
        /(?:component|button|form|modal|input|card|navigation|menu|ui|interface)/i,
        /(?:react|vue|angular|design|style|layout)/i
      ],
      'api': [
        /(?:api|endpoint|route|server|backend|database)/i,
        /(?:rest|graphql|authentication|auth)/i
      ],
      'architecture': [
        /(?:architecture|pattern|structure|organization|state)/i,
        /(?:redux|context|management|folder)/i
      ]
    };

    // Component detection patterns
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

    // Detect domains
    for (const [domain, patterns] of Object.entries(domainPatterns)) {
      if (patterns.some(pattern => pattern.test(queryLower))) {
        detectedDomains.push(domain);
      }
    }

    // Detect components
    for (const [component, pattern] of Object.entries(componentPatterns)) {
      if (pattern.test(queryLower)) {
        detectedComponents.push(component);
      }
    }

    // Determine complexity based on query patterns
    const complexityIndicators = {
      'simple': /(?:simple|basic|quick|easy)/i,
      'moderate': /(?:good|nice|decent|professional)/i,
      'complex': /(?:advanced|complex|sophisticated|enterprise)/i,
      'expert': /(?:expert|professional|production|scalable)/i
    };

    let complexity: 'simple' | 'moderate' | 'complex' | 'expert' = 'moderate'; // default
    for (const [level, pattern] of Object.entries(complexityIndicators)) {
      if (pattern.test(queryLower)) {
        complexity = level as any;
        break;
      }
    }

    const needsGuidance = detectedDomains.length > 0 || detectedComponents.length > 0;
    const confidence = needsGuidance ? 0.8 : 0.2;

    return {
      needs_guidance: needsGuidance,
      detected_domains: detectedDomains,
      detected_components: detectedComponents,
      complexity_estimate: complexity,
      confidence,
      recommended_approach: this.getRecommendedApproach(complexity, detectedDomains)
    };
  }

  private getRecommendedApproach(complexity: string, domains: string[]): string {
    const approaches = {
      'simple': 'Use Tier 1 libraries (Tailark, Magic UI) with standard shadcn workflow',
      'moderate': 'Combine Tier 1-2 libraries with best practices guidance',
      'complex': 'Use Tier 2-3 libraries with careful dependency management',
      'expert': 'Selective use of all tiers with custom integration as needed'
    };

    return approaches[complexity] || approaches.moderate;
  }

  // Domain loading methods
  private async loadUIComponentGuidance(): Promise<void> {
    try {
      const uiData = await import('./knowledge/ui-components.json');
      this.indexDomainData('ui', uiData.default || uiData);
    } catch (error) {
      console.warn('Could not load UI component guidance:', error);
    }
  }

  private async loadAPIPatterns(): Promise<void> {
    try {
      const apiData = await import('./knowledge/api-patterns.json');
      this.indexDomainData('api', apiData.default || apiData);
    } catch (error) {
      console.warn('Could not load API patterns (file may not exist yet):', error);
    }
  }

  private async loadArchitecturePatterns(): Promise<void> {
    try {
      const archData = await import('./knowledge/architecture-patterns.json');
      this.indexDomainData('architecture', archData.default || archData);
    } catch (error) {
      console.warn('Could not load architecture patterns (file may not exist yet):', error);
    }
  }

  private indexDomainData(domain: string, data: any): void {
    if (!data || typeof data !== 'object') return;
    
    this.domainKnowledge.set(domain, data);
    
    // Index all components for fast lookup
    if (data.components) {
      Object.entries(data.components).forEach(([component, guidance]) => {
        const cacheKey = `${domain}:${component.toLowerCase()}`;
        this.qualityCache.set(cacheKey, guidance as QualityGuidance);
      });
    }
  }

  // Performance monitoring and metrics
  private recordMetrics(metrics: QualityMetrics): void {
    this.performanceMetrics.push(metrics);
    
    // Keep only recent metrics (last 1000 requests) to prevent memory leaks
    if (this.performanceMetrics.length > 1000) {
      this.performanceMetrics = this.performanceMetrics.slice(-1000);
    }
  }

  /**
   * Get performance statistics for monitoring
   */
  getPerformanceStats(): {
    total_requests: number;
    average_lookup_ms: number;
    hit_rate: number;
    domains_loaded: number;
    components_indexed: number;
    memory_estimate_mb: number;
    performance_target_met: boolean;
  } {
    const totalRequests = this.performanceMetrics.length;
    const averageLookup = totalRequests > 0 
      ? this.performanceMetrics.reduce((sum, m) => sum + m.lookup_time_ms, 0) / totalRequests 
      : 0;
    const hitRate = totalRequests > 0
      ? this.performanceMetrics.filter(m => m.guidance_found).length / totalRequests
      : 0;

    // Estimate memory usage (rough calculation)
    const memoryEstimate = (this.qualityCache.size * 2) / 1024; // Rough KB to MB conversion

    return {
      total_requests: totalRequests,
      average_lookup_ms: Math.round(averageLookup),
      hit_rate: Math.round(hitRate * 100) / 100,
      domains_loaded: this.domainKnowledge.size,
      components_indexed: this.qualityCache.size,
      memory_estimate_mb: Math.round(memoryEstimate * 100) / 100,
      performance_target_met: averageLookup < this.PERFORMANCE_TARGETS.LOOKUP_MAX_MS
    };
  }

  /**
   * Clear cache and reinitialize (for development/testing)
   */
  async reinitialize(): Promise<void> {
    this.qualityCache.clear();
    this.domainKnowledge.clear();
    this.initialized = false;
    this.initializationPromise = null;
    await this.initialize();
  }

  /**
   * Get system health status
   */
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'error';
    message: string;
    details: any;
  } {
    const stats = this.getPerformanceStats();
    
    if (!this.initialized) {
      return {
        status: 'error',
        message: 'Quality system not initialized',
        details: { initialized: false }
      };
    }

    if (stats.domains_loaded === 0 || stats.components_indexed === 0) {
      return {
        status: 'degraded', 
        message: 'No quality data loaded',
        details: stats
      };
    }

    if (!stats.performance_target_met) {
      return {
        status: 'degraded',
        message: `Performance below target: ${stats.average_lookup_ms}ms (target: <${this.PERFORMANCE_TARGETS.LOOKUP_MAX_MS}ms)`,
        details: stats
      };
    }

    return {
      status: 'healthy',
      message: `Quality system running optimally: ${stats.components_indexed} components, ${stats.average_lookup_ms}ms avg lookup`,
      details: stats
    };
  }
}

// Export singleton instance for easy importing
export const qualityCurator = QualityCurationManager.getInstance();