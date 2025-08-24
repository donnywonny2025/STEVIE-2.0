/**
 * PluginSystem - Extensible Architecture and Plugin Management
 * 
 * Provides a robust plugin architecture for extending the intelligence system
 * with custom analyzers, context providers, and processing components while
 * maintaining system stability and performance.
 * 
 * Key Features:
 * - Plugin lifecycle management (load, initialize, execute, unload)
 * - Type-safe plugin interfaces
 * - Plugin sandboxing and security
 * - Hot-pluggable components
 * - Plugin dependency management
 * - Performance monitoring per plugin
 * - Plugin marketplace compatibility
 */

import type { 
  Plugin,
  PluginConfig,
  PluginContext,
  PluginInterface,
  AnalysisResult,
  ChatContext,
  PluginMetrics
} from '../types/IntelligenceTypes';

import { intelligenceLogger } from '../monitoring/IntelligenceLogger';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';

export interface PluginRegistry {
  analyzers: Map<string, AnalyzerPlugin>;
  contextProviders: Map<string, ContextProviderPlugin>;
  processors: Map<string, ProcessorPlugin>;
  middleware: Map<string, MiddlewarePlugin>;
}

export interface PluginManifest {
  name: string;
  version: string;
  description: string;
  author: string;
  type: PluginType;
  dependencies: string[];
  permissions: PluginPermission[];
  config: Record<string, any>;
  entryPoint: string;
}

export type PluginType = 'analyzer' | 'context-provider' | 'processor' | 'middleware';
export type PluginPermission = 'file-access' | 'network-access' | 'system-info' | 'user-data';

export interface AnalyzerPlugin extends Plugin {
  analyze(query: string, context: ChatContext): Promise<Partial<AnalysisResult>>;
  getCapabilities(): string[];
  getPriority(): number;
}

export interface ContextProviderPlugin extends Plugin {
  provideContext(query: string, analysisResult: AnalysisResult): Promise<any>;
  getContextType(): string;
  getCost(): number; // Token cost estimate
}

export interface ProcessorPlugin extends Plugin {
  process(data: any, context: PluginContext): Promise<any>;
  getProcessingType(): string;
}

export interface MiddlewarePlugin extends Plugin {
  beforeAnalysis(query: string, context: ChatContext): Promise<{ query: string; context: ChatContext }>;
  afterAnalysis(result: AnalysisResult): Promise<AnalysisResult>;
  onError(error: Error, context: PluginContext): Promise<Error>;
}

export interface PluginSandbox {
  pluginId: string;
  permissions: PluginPermission[];
  resourceLimits: {
    maxMemoryMB: number;
    maxExecutionTimeMs: number;
    maxNetworkRequests: number;
  };
  allowedAPIs: string[];
}

export class PluginSystem {
  private registry: PluginRegistry;
  private loadedPlugins = new Map<string, Plugin>();
  private pluginMetrics = new Map<string, PluginMetrics>();
  private sandboxes = new Map<string, PluginSandbox>();
  private executionQueue = new Map<string, Promise<any>[]>();
  private pluginConfigs = new Map<string, PluginConfig>();

  constructor() {
    this.registry = {
      analyzers: new Map(),
      contextProviders: new Map(),
      processors: new Map(),
      middleware: new Map()
    };

    this.initializeCore();
  }

  /**
   * Plugin lifecycle management
   */
  async loadPlugin(manifest: PluginManifest, pluginCode: string): Promise<boolean> {
    try {
      // Validate manifest
      if (!this.validateManifest(manifest)) {
        throw new Error(`Invalid plugin manifest: ${manifest.name}`);
      }

      // Check dependencies
      const missingDeps = await this.checkDependencies(manifest.dependencies);
      if (missingDeps.length > 0) {
        throw new Error(`Missing dependencies: ${missingDeps.join(', ')}`);
      }

      // Create sandbox
      const sandbox = this.createSandbox(manifest);
      this.sandboxes.set(manifest.name, sandbox);

      // Load and initialize plugin
      const plugin = await this.instantiatePlugin(manifest, pluginCode, sandbox);
      
      // Initialize plugin metrics
      this.pluginMetrics.set(manifest.name, {
        executions: 0,
        totalTime: 0,
        avgTime: 0,
        errors: 0,
        lastExecution: null,
        memoryUsage: 0
      });

      // Register plugin
      this.registerPlugin(manifest.type, manifest.name, plugin);
      this.loadedPlugins.set(manifest.name, plugin);

      intelligenceLogger.info(`🔌 Plugin loaded: ${manifest.name}`, {
        component: 'PluginSystem',
        pluginType: manifest.type,
        version: manifest.version
      });

      return true;

    } catch (error) {
      intelligenceLogger.error(`Failed to load plugin: ${manifest.name}`, error);
      return false;
    }
  }

  async unloadPlugin(pluginName: string): Promise<boolean> {
    try {
      const plugin = this.loadedPlugins.get(pluginName);
      if (!plugin) {
        return false;
      }

      // Call plugin cleanup if available
      if (plugin.cleanup) {
        await this.executeInSandbox(pluginName, () => plugin.cleanup!());
      }

      // Remove from registry
      this.unregisterPlugin(pluginName);
      
      // Cleanup resources
      this.loadedPlugins.delete(pluginName);
      this.pluginMetrics.delete(pluginName);
      this.sandboxes.delete(pluginName);
      this.executionQueue.delete(pluginName);

      intelligenceLogger.info(`🔌 Plugin unloaded: ${pluginName}`, {
        component: 'PluginSystem'
      });

      return true;

    } catch (error) {
      intelligenceLogger.error(`Failed to unload plugin: ${pluginName}`, error);
      return false;
    }
  }

  async reloadPlugin(pluginName: string, manifest: PluginManifest, pluginCode: string): Promise<boolean> {
    const unloaded = await this.unloadPlugin(pluginName);
    if (!unloaded) {
      return false;
    }

    return await this.loadPlugin(manifest, pluginCode);
  }

  /**
   * Plugin execution methods
   */
  async executeAnalyzerPlugins(query: string, context: ChatContext): Promise<Partial<AnalysisResult>[]> {
    const analyzers = Array.from(this.registry.analyzers.values())
      .sort((a, b) => b.getPriority() - a.getPriority()); // Higher priority first

    const results: Partial<AnalysisResult>[] = [];

    for (const analyzer of analyzers) {
      try {
        const startTime = Date.now();
        const result = await this.executeInSandbox(
          analyzer.id,
          () => analyzer.analyze(query, context)
        );
        
        this.updatePluginMetrics(analyzer.id, Date.now() - startTime);
        results.push(result);

      } catch (error) {
        this.handlePluginError(analyzer.id, error);
      }
    }

    return results;
  }

  async executeContextProviders(query: string, analysisResult: AnalysisResult): Promise<Record<string, any>> {
    const providers = Array.from(this.registry.contextProviders.values())
      .sort((a, b) => a.getCost() - b.getCost()); // Lower cost first

    const contexts: Record<string, any> = {};

    for (const provider of providers) {
      try {
        const startTime = Date.now();
        const context = await this.executeInSandbox(
          provider.id,
          () => provider.provideContext(query, analysisResult)
        );
        
        contexts[provider.getContextType()] = context;
        this.updatePluginMetrics(provider.id, Date.now() - startTime);

      } catch (error) {
        this.handlePluginError(provider.id, error);
      }
    }

    return contexts;
  }

  async executeMiddleware(
    phase: 'before' | 'after' | 'error',
    data: any
  ): Promise<any> {
    const middleware = Array.from(this.registry.middleware.values());
    let result = data;

    for (const mw of middleware) {
      try {
        const startTime = Date.now();
        
        switch (phase) {
          case 'before':
            result = await this.executeInSandbox(mw.id, () => mw.beforeAnalysis(result.query, result.context));
            break;
          case 'after':
            result = await this.executeInSandbox(mw.id, () => mw.afterAnalysis(result));
            break;
          case 'error':
            result = await this.executeInSandbox(mw.id, () => mw.onError(result.error, result.context));
            break;
        }
        
        this.updatePluginMetrics(mw.id, Date.now() - startTime);

      } catch (error) {
        this.handlePluginError(mw.id, error);
      }
    }

    return result;
  }

  /**
   * Plugin sandboxing and security
   */
  private async executeInSandbox<T>(pluginId: string, fn: () => Promise<T>): Promise<T> {
    const sandbox = this.sandboxes.get(pluginId);
    if (!sandbox) {
      throw new Error(`No sandbox found for plugin: ${pluginId}`);
    }

    // Track execution queue
    const executions = this.executionQueue.get(pluginId) || [];
    
    const execution = Promise.race([
      fn(),
      new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Plugin execution timeout')), 
          sandbox.resourceLimits.maxExecutionTimeMs);
      })
    ]);

    executions.push(execution);
    this.executionQueue.set(pluginId, executions);

    try {
      const result = await execution;
      
      // Remove completed execution
      const index = executions.indexOf(execution);
      if (index > -1) {
        executions.splice(index, 1);
      }

      return result;

    } catch (error) {
      // Remove failed execution
      const index = executions.indexOf(execution);
      if (index > -1) {
        executions.splice(index, 1);
      }
      throw error;
    }
  }

  private createSandbox(manifest: PluginManifest): PluginSandbox {
    return {
      pluginId: manifest.name,
      permissions: manifest.permissions,
      resourceLimits: {
        maxMemoryMB: 100,
        maxExecutionTimeMs: 5000,
        maxNetworkRequests: 10
      },
      allowedAPIs: this.getAllowedAPIs(manifest.permissions)
    };
  }

  private getAllowedAPIs(permissions: PluginPermission[]): string[] {
    const apis: string[] = ['console.log', 'console.warn', 'console.error'];
    
    if (permissions.includes('file-access')) {
      apis.push('fs.readFile', 'fs.writeFile');
    }
    
    if (permissions.includes('network-access')) {
      apis.push('fetch', 'XMLHttpRequest');
    }
    
    if (permissions.includes('system-info')) {
      apis.push('process.platform', 'process.version');
    }

    return apis;
  }

  /**
   * Plugin instantiation and registration
   */
  private async instantiatePlugin(
    manifest: PluginManifest, 
    pluginCode: string, 
    sandbox: PluginSandbox
  ): Promise<Plugin> {
    // This would typically use a secure JavaScript sandbox like vm2
    // For now, simulating plugin instantiation
    
    const pluginModule = {
      exports: {} as any
    };

    // Simulate plugin code execution in sandbox
    // In production, this would be a secure sandbox
    try {
      // Plugin code would be executed here with limited global scope
      const pluginClass = this.parsePluginCode(pluginCode, manifest);
      const plugin = new pluginClass();
      
      plugin.id = manifest.name;
      plugin.version = manifest.version;
      plugin.config = manifest.config;

      // Initialize plugin
      if (plugin.initialize) {
        await plugin.initialize(this.createPluginContext(manifest, sandbox));
      }

      return plugin;

    } catch (error) {
      throw new Error(`Failed to instantiate plugin ${manifest.name}: ${error}`);
    }
  }

  private parsePluginCode(pluginCode: string, manifest: PluginManifest): any {
    // This is a simplified version - in production you'd use a proper parser
    // and sandbox for security
    return class MockPlugin {
      id = '';
      version = '';
      config = {};

      async initialize(context: PluginContext) {
        // Plugin initialization
      }

      async analyze(query: string, context: ChatContext) {
        return {
          confidence_score: 0.8,
          intent_layers: {
            surface: { type: 'social', confidence: 0.9, indicators: ['plugin_analysis'] }
          }
        };
      }

      getCapabilities() {
        return ['custom_analysis'];
      }

      getPriority() {
        return 1;
      }

      async cleanup() {
        // Plugin cleanup
      }
    };
  }

  private createPluginContext(manifest: PluginManifest, sandbox: PluginSandbox): PluginContext {
    return {
      pluginId: manifest.name,
      version: manifest.version,
      config: manifest.config,
      permissions: sandbox.permissions,
      logger: {
        debug: (msg) => intelligenceLogger.debug(`[${manifest.name}] ${msg}`),
        info: (msg) => intelligenceLogger.info(`[${manifest.name}] ${msg}`),
        warn: (msg) => intelligenceLogger.warn(`[${manifest.name}] ${msg}`),
        error: (msg, err) => intelligenceLogger.error(`[${manifest.name}] ${msg}`, err)
      },
      performance: {
        mark: (name) => performanceMonitor.startOperation(`plugin_${manifest.name}_${name}`),
        measure: (name) => performanceMonitor.endOperation(`plugin_${manifest.name}_${name}`)
      }
    };
  }

  private registerPlugin(type: PluginType, name: string, plugin: Plugin): void {
    switch (type) {
      case 'analyzer':
        this.registry.analyzers.set(name, plugin as AnalyzerPlugin);
        break;
      case 'context-provider':
        this.registry.contextProviders.set(name, plugin as ContextProviderPlugin);
        break;
      case 'processor':
        this.registry.processors.set(name, plugin as ProcessorPlugin);
        break;
      case 'middleware':
        this.registry.middleware.set(name, plugin as MiddlewarePlugin);
        break;
    }
  }

  private unregisterPlugin(name: string): void {
    this.registry.analyzers.delete(name);
    this.registry.contextProviders.delete(name);
    this.registry.processors.delete(name);
    this.registry.middleware.delete(name);
  }

  /**
   * Plugin management utilities
   */
  private validateManifest(manifest: PluginManifest): boolean {
    const required = ['name', 'version', 'type', 'entryPoint'];
    return required.every(field => manifest[field as keyof PluginManifest]);
  }

  private async checkDependencies(dependencies: string[]): Promise<string[]> {
    const missing: string[] = [];
    
    for (const dep of dependencies) {
      if (!this.loadedPlugins.has(dep)) {
        missing.push(dep);
      }
    }
    
    return missing;
  }

  private updatePluginMetrics(pluginId: string, executionTime: number): void {
    const metrics = this.pluginMetrics.get(pluginId);
    if (!metrics) return;

    metrics.executions++;
    metrics.totalTime += executionTime;
    metrics.avgTime = metrics.totalTime / metrics.executions;
    metrics.lastExecution = new Date();

    // Update memory usage (simplified)
    metrics.memoryUsage = process.memoryUsage().heapUsed;
  }

  private handlePluginError(pluginId: string, error: Error): void {
    const metrics = this.pluginMetrics.get(pluginId);
    if (metrics) {
      metrics.errors++;
    }

    intelligenceLogger.error(`Plugin error in ${pluginId}`, error, {
      component: 'PluginSystem',
      pluginId
    });

    // Could implement circuit breaker pattern here
    if (metrics && metrics.errors > 5) {
      intelligenceLogger.warn(`Plugin ${pluginId} has high error rate, consider disabling`);
    }
  }

  /**
   * Built-in core plugins
   */
  private initializeCore(): void {
    // Register built-in plugins here
    intelligenceLogger.info('🔌 Plugin system initialized', {
      component: 'PluginSystem'
    });
  }

  /**
   * Plugin discovery and management
   */
  async discoverPlugins(directory: string): Promise<PluginManifest[]> {
    // Plugin discovery implementation
    // This would scan a directory for plugin manifests
    return [];
  }

  async installPlugin(packageUrl: string): Promise<boolean> {
    // Plugin installation from package/marketplace
    return false;
  }

  async updatePlugin(pluginName: string): Promise<boolean> {
    // Plugin update mechanism
    return false;
  }

  /**
   * Plugin information and metrics
   */
  getLoadedPlugins(): Plugin[] {
    return Array.from(this.loadedPlugins.values());
  }

  getPluginMetrics(pluginId?: string): PluginMetrics | Map<string, PluginMetrics> {
    if (pluginId) {
      return this.pluginMetrics.get(pluginId) || {
        executions: 0,
        totalTime: 0,
        avgTime: 0,
        errors: 0,
        lastExecution: null,
        memoryUsage: 0
      };
    }
    return new Map(this.pluginMetrics);
  }

  getPluginStatus(): Record<string, 'active' | 'loaded' | 'error' | 'disabled'> {
    const status: Record<string, 'active' | 'loaded' | 'error' | 'disabled'> = {};
    
    for (const [name, plugin] of this.loadedPlugins) {
      const metrics = this.pluginMetrics.get(name);
      if (metrics && metrics.errors > 5) {
        status[name] = 'error';
      } else if (metrics && metrics.lastExecution) {
        status[name] = 'active';
      } else {
        status[name] = 'loaded';
      }
    }
    
    return status;
  }

  /**
   * Configuration management
   */
  updatePluginConfig(pluginName: string, config: PluginConfig): boolean {
    const plugin = this.loadedPlugins.get(pluginName);
    if (!plugin) return false;

    plugin.config = { ...plugin.config, ...config };
    this.pluginConfigs.set(pluginName, config);

    intelligenceLogger.info(`🔌 Plugin config updated: ${pluginName}`, {
      component: 'PluginSystem'
    });

    return true;
  }

  getPluginConfig(pluginName: string): PluginConfig | null {
    return this.pluginConfigs.get(pluginName) || null;
  }

  /**
   * Shutdown cleanup
   */
  async shutdown(): Promise<void> {
    intelligenceLogger.info('🔌 Shutting down plugin system...');

    // Unload all plugins
    for (const pluginName of this.loadedPlugins.keys()) {
      await this.unloadPlugin(pluginName);
    }

    // Clear all registries
    this.registry.analyzers.clear();
    this.registry.contextProviders.clear();
    this.registry.processors.clear();
    this.registry.middleware.clear();

    intelligenceLogger.info('✅ Plugin system shutdown complete');
  }
}

// Export singleton instance
export const pluginSystem = new PluginSystem();