// Quality Intelligence Types for STEVIE's Brain
// Integrates with existing Scout Intelligence system

export interface QualityGuidance {
  component: string;
  domain: 'ui' | 'api' | 'architecture' | 'devops' | '3d-graphics' | 'game-development';
  confidence: number; // 0-1 scale
  tier: 1 | 2 | 3 | 4; // Implementation complexity from STEVIE's existing tier system
  
  recommendations: {
    best_practices: string[];
    recommended_libraries: LibraryRecommendation[];
    code_examples: CodeExample[];
    anti_patterns: string[];
    accessibility_notes: string[];
    performance_tips: string[];
  };
  
  context_relevance: {
    simple_projects: boolean;
    enterprise_projects: boolean;
    prototypes: boolean;
    educational?: boolean;
    scientific?: boolean;
  };
  
  estimated_tokens: number; // For Scout Intelligence integration
  fallback_response?: string; // Emergency response if LLM fails
  
  // Integration with STEVIE's tier system
  stevie_integration: {
    rating: '⭐⭐⭐⭐⭐' | '⭐⭐⭐⭐⚪' | '⭐⭐⭐⚪⚪' | '⭐⭐⚪⚪⚪' | '⭐⚪⚪⚪⚪';
    implementation_notes: string[];
    dependency_warnings?: string[];
  };
}

export interface LibraryRecommendation {
  name: string;
  reason: string;
  use_case: string;
  tier: 1 | 2 | 3 | 4; // Maps to STEVIE's complexity tiers
  npm_package?: string;
  documentation_url?: string;
  installation_snippet?: string;
  
  // STEVIE-specific integration info
  stevie_compatibility: {
    registry_support: 'shadcn' | 'custom' | 'manual' | 'none';
    setup_complexity: 'zero-friction' | 'managed-setup' | 'selective-use' | 'avoid';
    dependency_chain: string[];
    known_issues?: string[];
  };
}

export interface CodeExample {
  title: string;
  description: string;
  code: string;
  language: 'typescript' | 'javascript' | 'tsx' | 'jsx' | 'css' | 'bash';
  complexity: 'simple' | 'moderate' | 'advanced';
  
  // Additional context for STEVIE
  framework_specific?: boolean;
  requires_setup?: string[];
  performance_impact?: 'minimal' | 'moderate' | 'heavy';
}

export interface DomainKnowledge {
  domain: string;
  version: string;
  lastUpdated: string;
  description: string;
  components: Record<string, QualityGuidance>;
  patterns?: Record<string, QualityPattern>;
}

export interface QualityPattern {
  name: string;
  description: string;
  best_practices: string[];
  code_structure?: {
    example: string;
    explanation: string;
  };
  when_to_use: string[];
  when_not_to_use: string[];
}

// Enhanced context requirement interface for Scout Intelligence integration
export interface QualityAwareContextRequirement {
  level: 'minimal' | 'technical' | 'comprehensive';
  domains: string[];
  estimated_tokens: number;
  requires_history: boolean;
  requires_files: boolean;
  
  // NEW: Quality guidance integration
  requires_quality_guidance?: boolean;
  quality_domains?: string[];
  quality_confidence_threshold?: number;
  quality_token_budget?: number; // Maximum tokens to spend on quality guidance
}

// Performance tracking for quality system
export interface QualityMetrics {
  lookup_time_ms: number;
  guidance_found: boolean;
  tokens_added: number;
  tier_recommended: 1 | 2 | 3 | 4;
  domain: string;
  query_type: string;
}

// Search integration types for dynamic knowledge updates
export interface LiveSearchResult {
  query: string;
  results: SearchResult[];
  confidence: number;
  source: 'brave' | 'github' | 'stackoverflow' | 'documentation';
  timestamp: number;
}

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  relevance_score: number;
  extracted_practices?: string[];
}

// Quality analysis result
export interface QualityAnalysisResult {
  needs_guidance: boolean;
  detected_domains: string[];
  detected_components: string[];
  complexity_estimate: 'simple' | 'moderate' | 'complex' | 'expert';
  confidence: number;
  recommended_approach: string;
}