/**
 * CacheManager - Intelligent Multi-Layer Caching System
 * 
 * Implements Scout's performance requirements for sub-50ms analysis:
 * - L1: Pattern Cache (fastest - immediate responses)
 * - L2: Analysis Cache (fast - cached classification results)
 * - L3: Context Cache (medium - cached context selections)
 * - L4: Result Cache (comprehensive - full analysis results)
 * 
 * Key Features:
 * - TTL management with intelligent expiration
 * - Cache invalidation strategies
 * - Warm-up mechanisms for common patterns
 * - Memory management with LRU eviction
 * - Cache metrics and hit rate optimization
 * - Thread-safe operations
 */

import type { CacheEntry, CacheStats } from '../types/IntelligenceTypes';

export interface CacheLayerConfig {
  maxEntries: number;
  ttlMs: number;
  evictionPolicy: 'lru' | 'lfu' | 'ttl';
  enableCompression: boolean;
  memoryLimitMB: number;
}

export interface CacheKey {
  layer: CacheLayer;
  key: string;
  hash?: string;
}

export type CacheLayer = 'pattern' | 'analysis' | 'context' | 'result';

export interface CacheMetrics {
  hits: number;
  misses: number;
  hitRate: number;
  memoryUsage: number;
  entryCount: number;
  avgResponseTime: number;
  lastCleanup: Date;
}

export interface WarmupStrategy {
  patterns: string[];
  priority: number;
  preloadOnStartup: boolean;
  refreshInterval: number;
}

export class CacheManager {
  private caches = new Map<CacheLayer, Map<string, CacheEntry<any>>>();
  private configs = new Map<CacheLayer, CacheLayerConfig>();
  private metrics = new Map<CacheLayer, CacheMetrics>();
  private cleanupIntervals = new Map<CacheLayer, NodeJS.Timeout>();
  private warmupStrategies: WarmupStrategy[] = [];

  constructor() {
    this.initializeCacheLayers();
    this.startCleanupSchedulers();
    this.initializeWarmupStrategies();
  }

  /**
   * Get cached value with automatic layer routing
   */
  async get<T>(cacheKey: CacheKey): Promise<T | null> {
    const startTime = Date.now();
    const cache = this.caches.get(cacheKey.layer);
    const metrics = this.metrics.get(cacheKey.layer);
    
    if (!cache || !metrics) {
      return null;
    }

    const entry = cache.get(cacheKey.key);
    
    if (!entry) {
      metrics.misses++;
      this.updateHitRate(cacheKey.layer);
      return null;
    }

    // Check expiration
    if (entry.expiresAt < new Date()) {
      cache.delete(cacheKey.key);
      metrics.misses++;
      this.updateHitRate(cacheKey.layer);
      return null;
    }

    // Update access patterns
    entry.hitCount++;
    entry.timestamp = new Date();
    
    metrics.hits++;
    metrics.avgResponseTime = this.updateAverageResponseTime(
      metrics.avgResponseTime, 
      Date.now() - startTime,
      metrics.hits
    );
    
    this.updateHitRate(cacheKey.layer);

    console.log(`💾 CACHE HIT [${cacheKey.layer}]:`, {
      key: cacheKey.key.slice(0, 30) + '...',
      hitCount: entry.hitCount,
      age: Date.now() - entry.timestamp.getTime(),
      responseTime: Date.now() - startTime
    });

    return entry.value;
  }

  /**
   * Set cached value with intelligent TTL
   */
  async set<T>(cacheKey: CacheKey, value: T, customTtl?: number): Promise<void> {
    const cache = this.caches.get(cacheKey.layer);
    const config = this.configs.get(cacheKey.layer);
    
    if (!cache || !config) {
      return;
    }

    // Check capacity and evict if necessary
    if (cache.size >= config.maxEntries) {
      await this.evictEntries(cacheKey.layer, Math.floor(config.maxEntries * 0.1));
    }

    const ttl = customTtl || config.ttlMs;
    const expiresAt = new Date(Date.now() + ttl);
    
    const entry: CacheEntry<T> = {
      key: cacheKey.key,
      value: config.enableCompression ? this.compress(value) : value,
      timestamp: new Date(),
      expiresAt,
      hitCount: 0,
      metadata: {
        layer: cacheKey.layer,
        size: this.calculateSize(value),
        compressed: config.enableCompression
      }
    };

    cache.set(cacheKey.key, entry);
    
    this.updateMemoryUsage(cacheKey.layer);

    console.log(`💾 CACHE SET [${cacheKey.layer}]:`, {
      key: cacheKey.key.slice(0, 30) + '...',
      ttl: ttl,
      size: entry.metadata?.size || 0,
      totalEntries: cache.size
    });
  }

  /**
   * Pattern cache operations (L1 - fastest layer)
   */
  async getPattern(query: string): Promise<any> {
    const key = this.generatePatternKey(query);
    return this.get({ layer: 'pattern', key });
  }

  async setPattern(query: string, response: any): Promise<void> {
    const key = this.generatePatternKey(query);
    await this.set({ layer: 'pattern', key }, response);
  }

  /**
   * Analysis cache operations (L2 - classification results)
   */
  async getAnalysis(query: string, contextHash?: string): Promise<any> {
    const key = this.generateAnalysisKey(query, contextHash);
    return this.get({ layer: 'analysis', key });
  }

  async setAnalysis(query: string, analysis: any, contextHash?: string): Promise<void> {
    const key = this.generateAnalysisKey(query, contextHash);
    await this.set({ layer: 'analysis', key }, analysis);
  }

  /**
   * Context cache operations (L3 - context selections)
   */
  async getContext(query: string, historyHash: string): Promise<any> {
    const key = this.generateContextKey(query, historyHash);
    return this.get({ layer: 'context', key });
  }

  async setContext(query: string, historyHash: string, context: any): Promise<void> {
    const key = this.generateContextKey(query, historyHash);
    await this.set({ layer: 'context', key }, context);
  }

  /**
   * Result cache operations (L4 - complete analysis results)
   */
  async getResult(query: string, fullContextHash: string): Promise<any> {
    const key = this.generateResultKey(query, fullContextHash);
    return this.get({ layer: 'result', key });
  }

  async setResult(query: string, fullContextHash: string, result: any): Promise<void> {
    const key = this.generateResultKey(query, fullContextHash);
    await this.set({ layer: 'result', key }, result);
  }

  /**
   * Cache invalidation strategies
   */
  async invalidateByPattern(pattern: RegExp, layer?: CacheLayer): Promise<number> {
    let invalidated = 0;
    const layers = layer ? [layer] : Array.from(this.caches.keys());

    for (const layerName of layers) {
      const cache = this.caches.get(layerName);
      if (!cache) continue;

      const keysToDelete: string[] = [];
      for (const [key] of cache) {
        if (pattern.test(key)) {
          keysToDelete.push(key);
        }
      }

      for (const key of keysToDelete) {
        cache.delete(key);
        invalidated++;
      }

      this.updateMemoryUsage(layerName);
    }

    console.log(`🗑️ CACHE INVALIDATION:`, {
      pattern: pattern.source,
      layer: layer || 'all',
      invalidated
    });

    return invalidated;
  }

  /**
   * Intelligent cache warming for common patterns
   */
  async warmupCache(): Promise<void> {
    console.log('🔥 Starting cache warmup...');

    for (const strategy of this.warmupStrategies) {
      if (!strategy.preloadOnStartup) continue;

      for (const pattern of strategy.patterns) {
        try {
          // Pre-populate pattern cache with common responses
          await this.preloadPattern(pattern);
        } catch (error) {
          console.error(`Failed to warmup pattern ${pattern}:`, error);
        }
      }
    }

    console.log('✅ Cache warmup complete');
  }

  /**
   * Get comprehensive cache statistics
   */
  getCacheStats(): Record<CacheLayer, CacheStats> {
    const stats: Record<string, CacheStats> = {};

    for (const [layer, cache] of this.caches) {
      const metrics = this.metrics.get(layer);
      const config = this.configs.get(layer);

      if (!metrics || !config) continue;

      // Calculate additional metrics
      const entries = Array.from(cache.values());
      const memoryUsage = entries.reduce((sum, entry) => sum + (entry.metadata?.size || 0), 0);
      const oldestEntry = entries.reduce((oldest, entry) => 
        !oldest || entry.timestamp < oldest ? entry.timestamp : oldest, 
        null as Date | null
      );
      const newestEntry = entries.reduce((newest, entry) => 
        !newest || entry.timestamp > newest ? entry.timestamp : newest, 
        null as Date | null
      );

      stats[layer] = {
        totalEntries: cache.size,
        hitRate: metrics.hitRate,
        missRate: 1 - metrics.hitRate,
        totalHits: metrics.hits,
        totalMisses: metrics.misses,
        memoryUsage,
        oldestEntry,
        newestEntry
      };
    }

    return stats as Record<CacheLayer, CacheStats>;
  }

  /**
   * Memory management and cleanup
   */
  async performCleanup(layer: CacheLayer): Promise<number> {
    const cache = this.caches.get(layer);
    const config = this.configs.get(layer);
    
    if (!cache || !config) return 0;

    let cleaned = 0;
    const now = new Date();
    const keysToDelete: string[] = [];

    // Remove expired entries
    for (const [key, entry] of cache) {
      if (entry.expiresAt < now) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      cache.delete(key);
      cleaned++;
    }

    // Check memory limits and perform LRU eviction if needed
    const memoryUsage = this.calculateMemoryUsage(layer);
    const memoryLimitBytes = config.memoryLimitMB * 1024 * 1024;

    if (memoryUsage > memoryLimitBytes) {
      const entriesToEvict = Math.floor(cache.size * 0.2); // Evict 20%
      cleaned += await this.evictEntries(layer, entriesToEvict);
    }

    this.updateMemoryUsage(layer);

    if (cleaned > 0) {
      console.log(`🧹 CACHE CLEANUP [${layer}]:`, {
        cleaned,
        remaining: cache.size,
        memoryUsed: this.formatBytes(memoryUsage)
      });
    }

    return cleaned;
  }

  /**
   * Initialize cache layers with configurations
   */
  private initializeCacheLayers(): void {
    const layerConfigs: Record<CacheLayer, CacheLayerConfig> = {
      pattern: {
        maxEntries: 1000,
        ttlMs: 24 * 60 * 60 * 1000, // 24 hours
        evictionPolicy: 'lfu',
        enableCompression: false,
        memoryLimitMB: 10
      },
      analysis: {
        maxEntries: 5000,
        ttlMs: 60 * 60 * 1000, // 1 hour
        evictionPolicy: 'lru',
        enableCompression: true,
        memoryLimitMB: 25
      },
      context: {
        maxEntries: 2000,
        ttlMs: 30 * 60 * 1000, // 30 minutes
        evictionPolicy: 'lru',
        enableCompression: true,
        memoryLimitMB: 15
      },
      result: {
        maxEntries: 1000,
        ttlMs: 15 * 60 * 1000, // 15 minutes
        evictionPolicy: 'lru',
        enableCompression: true,
        memoryLimitMB: 20
      }
    };

    for (const [layer, config] of Object.entries(layerConfigs)) {
      this.caches.set(layer as CacheLayer, new Map());
      this.configs.set(layer as CacheLayer, config);
      this.metrics.set(layer as CacheLayer, {
        hits: 0,
        misses: 0,
        hitRate: 0,
        memoryUsage: 0,
        entryCount: 0,
        avgResponseTime: 0,
        lastCleanup: new Date()
      });
    }

    console.log('💾 Cache layers initialized:', Object.keys(layerConfigs));
  }

  /**
   * Start automatic cleanup schedulers
   */
  private startCleanupSchedulers(): void {
    for (const layer of this.caches.keys()) {
      const interval = setInterval(async () => {
        await this.performCleanup(layer);
      }, 5 * 60 * 1000); // Every 5 minutes

      this.cleanupIntervals.set(layer, interval);
    }
  }

  /**
   * Initialize warmup strategies
   */
  private initializeWarmupStrategies(): void {
    this.warmupStrategies = [
      {
        patterns: ['hi', 'hello', 'hey', 'thanks', 'thank you'],
        priority: 1,
        preloadOnStartup: true,
        refreshInterval: 24 * 60 * 60 * 1000 // 24 hours
      },
      {
        patterns: ['debug', 'error', 'fix', 'help'],
        priority: 2,
        preloadOnStartup: true,
        refreshInterval: 12 * 60 * 60 * 1000 // 12 hours
      }
    ];
  }

  /**
   * Utility methods
   */
  private generatePatternKey(query: string): string {
    return `pattern:${this.normalizeQuery(query)}`;
  }

  private generateAnalysisKey(query: string, contextHash?: string): string {
    const base = `analysis:${this.normalizeQuery(query)}`;
    return contextHash ? `${base}:${contextHash}` : base;
  }

  private generateContextKey(query: string, historyHash: string): string {
    return `context:${this.normalizeQuery(query)}:${historyHash}`;
  }

  private generateResultKey(query: string, fullContextHash: string): string {
    return `result:${this.normalizeQuery(query)}:${fullContextHash}`;
  }

  private normalizeQuery(query: string): string {
    return query.toLowerCase().trim().replace(/\s+/g, '_').slice(0, 50);
  }

  private async evictEntries(layer: CacheLayer, count: number): Promise<number> {
    const cache = this.caches.get(layer);
    const config = this.configs.get(layer);
    
    if (!cache || !config) return 0;

    const entries = Array.from(cache.entries());
    let evicted = 0;

    // Sort by eviction policy
    switch (config.evictionPolicy) {
      case 'lru':
        entries.sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());
        break;
      case 'lfu':
        entries.sort(([, a], [, b]) => a.hitCount - b.hitCount);
        break;
      case 'ttl':
        entries.sort(([, a], [, b]) => a.expiresAt.getTime() - b.expiresAt.getTime());
        break;
    }

    // Evict least valuable entries
    for (let i = 0; i < Math.min(count, entries.length); i++) {
      const [key] = entries[i];
      cache.delete(key);
      evicted++;
    }

    return evicted;
  }

  private updateHitRate(layer: CacheLayer): void {
    const metrics = this.metrics.get(layer);
    if (!metrics) return;

    const total = metrics.hits + metrics.misses;
    metrics.hitRate = total > 0 ? metrics.hits / total : 0;
  }

  private updateAverageResponseTime(current: number, newTime: number, count: number): number {
    return ((current * (count - 1)) + newTime) / count;
  }

  private updateMemoryUsage(layer: CacheLayer): void {
    const metrics = this.metrics.get(layer);
    if (!metrics) return;

    metrics.memoryUsage = this.calculateMemoryUsage(layer);
    metrics.entryCount = this.caches.get(layer)?.size || 0;
  }

  private calculateMemoryUsage(layer: CacheLayer): number {
    const cache = this.caches.get(layer);
    if (!cache) return 0;

    let usage = 0;
    for (const entry of cache.values()) {
      usage += entry.metadata?.size || this.calculateSize(entry.value);
    }
    return usage;
  }

  private calculateSize(value: any): number {
    return JSON.stringify(value).length * 2; // Rough estimate in bytes
  }

  private compress(value: any): any {
    // Simple compression simulation - could use actual compression library
    return value;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async preloadPattern(pattern: string): Promise<void> {
    // This would typically load common responses for patterns
    // For now, just mark as preloaded
    await this.setPattern(pattern, { preloaded: true, pattern });
  }

  /**
   * Shutdown cleanup
   */
  async shutdown(): Promise<void> {
    // Clear all cleanup intervals
    for (const interval of this.cleanupIntervals.values()) {
      clearInterval(interval);
    }

    // Perform final cleanup
    for (const layer of this.caches.keys()) {
      await this.performCleanup(layer);
    }

    console.log('💾 Cache manager shutdown complete');
  }
}

// Export singleton instance
export const cacheManager = new CacheManager();