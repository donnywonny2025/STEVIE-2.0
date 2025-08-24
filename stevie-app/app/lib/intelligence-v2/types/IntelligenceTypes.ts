/**
 * Intelligence System Types & Interfaces
 * 
 * Comprehensive type definitions for the modular intelligence architecture.
 * Maintains compatibility with existing 97% token efficiency system.
 */

// Core Chat Context Interface
export interface ChatContext {
  messages: ChatMessage[];
  sessionId: string;
  timestamp: Date;
  metadata?: {
    userPreferences?: UserPreferences;
    projectContext?: ProjectContext;
    errorContext?: ErrorContext;
  };
}

export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  metadata?: MessageMetadata;
}

export interface MessageMetadata {
  tokenCount?: number;
  containedCode?: boolean;
  userFollowupQuestions?: number;
  userSaidThanks?: boolean;
  ledToWorkingSolution?: boolean;
  errorContext?: boolean;
  technicalTerms?: string[];
  complexityLevel?: ComplexityLevel;
}

// Analysis Result Interfaces
export interface AnalysisResult {
  queryClassification: QueryClassification;
  intentAnalysis: IntentAnalysis;
  contextRequirements: ContextRequirements;
  patternMatches: PatternMatch[];
  confidenceScore: number;
  tokenEstimate: number;
  recommendedStrategy: ProcessingStrategy;
  fallbackReason?: string;
  performanceMetrics: PerformanceMetrics;
}

export interface QueryClassification {
  queryType: QueryType;
  complexity: ComplexityLevel;
  primaryIntent: IntentType;
  confidence: number;
  indicators: ClassificationIndicator[];
}

export interface IntentAnalysis {
  surfaceLayer: IntentLayer;
  deepLayer: IntentLayer;
  contextualLayer: IntentLayer;
  overallConfidence: number;
}

export interface IntentLayer {
  type: IntentType;
  primaryAction?: string;
  primaryObject?: string;
  confidence: number;
  indicators: string[];
  technicalSignals?: TechnicalSignal[];
}

export interface TechnicalSignal {
  type: 'framework' | 'language' | 'tool' | 'concept' | 'error' | 'operation';
  value: string;
  confidence: number;
  context?: string;
}

export interface PatternMatch {
  patternId: string;
  patternType: PatternType;
  confidence: number;
  matchedTerms: string[];
  fallbackResponse?: string;
  estimatedTokens?: number;
}

export interface ContextRequirements {
  level: ContextLevel;
  domains: ContextDomain[];
  estimatedTokens: number;
  requiresHistory: boolean;
  requiresFiles: boolean;
  requiresProjectContext: boolean;
  maxHistoryMessages: number;
  relevanceThreshold: number;
}

export interface ContextData {
  selectedMessages: RelevantMessage[];
  projectFiles: RelevantFile[];
  technicalContext: TechnicalContext;
  estimatedTokens: number;
  selectionStrategy: string;
  qualityScore: number;
}

export interface RelevantMessage {
  content: string;
  relevanceScore: number;
  timestamp: Date;
  messageId: string;
  metadata: RelevanceMetadata;
}

export interface RelevanceMetadata {
  semanticSimilarity: number;
  recencyFactor: number;
  engagementScore: number;
  technicalOverlap: number;
  containedCode: boolean;
  ledToSolution: boolean;
}

export interface RelevantFile {
  filePath: string;
  content: string;
  relevanceScore: number;
  fileType: string;
  lastModified: Date;
}

export interface TechnicalContext {
  frameworks: string[];
  languages: string[];
  tools: string[];
  concepts: string[];
  errorPatterns: string[];
}

// Performance & Monitoring Interfaces
export interface PerformanceMetrics {
  analysisTime: number;
  contextRetrievalTime: number;
  patternMatchingTime: number;
  totalProcessingTime: number;
  memoryUsage?: number;
  cacheHitRate?: number;
}

export interface TokenUsage {
  queryTokens: number;
  contextTokens: number;
  totalTokens: number;
  estimatedCost?: number;
  breakdown: TokenBreakdown;
}

export interface TokenBreakdown {
  systemPrompt: number;
  userQuery: number;
  relevantHistory: number;
  technicalContext: number;
  fileContext: number;
}

export interface SavingsAnalytics {
  sessionSavings: number;
  totalSavings: number;
  efficiencyPercentage: number;
  queriesOptimized: number;
  averageReduction: number;
  sessionStats: SessionStats;
}

export interface SessionStats {
  simpleQueries: number;
  mediumQueries: number;
  complexQueries: number;
  fallbackQueries: number;
}

// Configuration & Settings
export interface IntelligenceConfig {
  performance: PerformanceConfig;
  patterns: PatternConfig;
  context: ContextConfig;
  monitoring: MonitoringConfig;
}

export interface PerformanceConfig {
  enableCaching: boolean;
  cacheTimeout: number;
  maxConcurrentAnalysis: number;
  timeoutThreshold: number;
  memoryLimit: number;
}

export interface PatternConfig {
  enableFallbackCache: boolean;
  fallbackTimeout: number;
  patternUpdateInterval: number;
  customPatterns: CustomPattern[];
}

export interface ContextConfig {
  maxContextMessages: number;
  relevanceThreshold: number;
  maxContextTokens: number;
  enableSmartSelection: boolean;
  prioritizeTechnical: boolean;
}

export interface MonitoringConfig {
  enableMetrics: boolean;
  enableDebugLogging: boolean;
  metricsRetentionDays: number;
  alertThresholds: AlertThresholds;
}

export interface AlertThresholds {
  highLatency: number;
  lowEfficiency: number;
  highErrorRate: number;
  memoryUsage: number;
}

// Enums and Constants
export type QueryType = 'SIMPLE' | 'MEDIUM' | 'COMPLEX' | 'ESCALATED';

export type ComplexityLevel = 'minimal' | 'basic' | 'intermediate' | 'advanced' | 'expert';

export type IntentType = 'social' | 'technical' | 'continuation' | 'complex' | 'error' | 'creation';

export type PatternType = 'greeting' | 'gratitude' | 'help_request' | 'debug_request' | 'creation_request' | 'technical_question' | 'continuation' | 'error_report';

export type ContextLevel = 'minimal' | 'technical' | 'comprehensive';

export type ContextDomain = 'social' | 'technical' | 'debugging' | 'creation' | 'optimization' | 'explanation';

export type ProcessingStrategy = 'cached_response' | 'minimal_context' | 'technical_context' | 'comprehensive_analysis' | 'emergency_fallback';

export interface ClassificationIndicator {
  type: 'surface' | 'deep' | 'contextual' | 'complexity';
  signal: string;
  confidence: number;
  weight: number;
}

export interface CustomPattern {
  id: string;
  name: string;
  pattern: RegExp;
  response: string;
  estimatedTokens: number;
  queryType: QueryType;
  enabled: boolean;
}

export interface UserPreferences {
  preferredFrameworks: string[];
  experienceLevel: ComplexityLevel;
  communicationStyle: 'concise' | 'detailed' | 'technical';
  learningGoals: string[];
}

export interface ProjectContext {
  projectType: string;
  technologies: string[];
  currentFiles: string[];
  recentChanges: string[];
  knownIssues: string[];
}

export interface ErrorContext {
  errorType: string;
  errorMessage: string;
  stackTrace?: string;
  affectedFiles: string[];
  attemptedSolutions: string[];
}

// Plugin System Interfaces
export interface IntelligencePlugin {
  name: string;
  version: string;
  analyze(query: string, context: PluginContext): Promise<PluginResult>;
  getPatterns(): Pattern[];
  getConfidence(result: PluginResult): number;
  initialize(config: PluginConfig): Promise<void>;
  cleanup(): Promise<void>;
}

export interface PluginContext {
  query: string;
  chatContext: ChatContext;
  existingAnalysis?: AnalysisResult;
  userPreferences?: UserPreferences;
}

export interface PluginResult {
  confidence: number;
  insights: PluginInsight[];
  suggestedContext?: ContextRequirements;
  metadata?: Record<string, any>;
}

export interface PluginInsight {
  type: string;
  description: string;
  confidence: number;
  actionable: boolean;
}

export interface Pattern {
  id: string;
  regex: RegExp;
  description: string;
  examples: string[];
}

export interface PluginConfig {
  enabled: boolean;
  priority: number;
  settings: Record<string, any>;
}

// Error and Fallback Interfaces
export interface FallbackStrategy {
  strategy: ProcessingStrategy;
  reason: string;
  estimatedTokens: number;
  confidence: number;
  metadata?: Record<string, any>;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  errorCount: number;
  lastErrorTime?: Date;
  timeoutUntil?: Date;
  successCount: number;
}

export interface HealthCheck {
  componentName: string;
  status: 'healthy' | 'degraded' | 'error';
  lastCheck: Date;
  responseTime?: number;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

// Cache Interfaces
export interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: Date;
  expiresAt: Date;
  hitCount: number;
  metadata?: Record<string, any>;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  missRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number;
  oldestEntry?: Date;
  newestEntry?: Date;
}