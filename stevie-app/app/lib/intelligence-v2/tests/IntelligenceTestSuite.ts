/**
 * Intelligence System Test Suite
 * Comprehensive testing for the refactored intelligence system
 */

import { IntelligenceEngine } from '../core/IntelligenceEngine';
import { QueryClassifier } from '../core/QueryClassifier';
import { PatternMatcher } from '../core/PatternMatcher';
import { ConfidenceScorer } from '../core/ConfidenceScorer';
import { performanceMonitor } from '../monitoring/PerformanceMonitor';
import { tokenTracker } from '../monitoring/TokenTracker';

export class IntelligenceTestSuite {
  private engine: IntelligenceEngine;
  private testResults: TestResult[] = [];

  constructor() {
    this.engine = new IntelligenceEngine();
  }

  async runAllTests(): Promise<TestSummary> {
    console.log('🧪 Starting Intelligence System Test Suite...');
    
    await this.testBasicFunctionality();
    await this.testTokenEfficiency();
    await this.testPerformance();
    await this.testErrorHandling();
    await this.testCaching();
    await this.testMonitoring();

    return this.generateSummary();
  }

  private async testBasicFunctionality(): Promise<void> {
    const tests = [
      { name: 'Simple Greeting', query: 'hello', expected: 'social' },
      { name: 'Technical Query', query: 'debug this error', expected: 'technical' },
      { name: 'Help Request', query: 'can you help me', expected: 'social' },
      { name: 'Complex Query', query: 'implement authentication system', expected: 'technical' }
    ];

    for (const test of tests) {
      try {
        const result = await this.engine.analyzeQuery(test.query, { messages: [] });
        const passed = result.intent_layers.surface.type === test.expected;
        
        this.testResults.push({
          name: test.name,
          passed,
          duration: 0,
          details: `Expected: ${test.expected}, Got: ${result.intent_layers.surface.type}`
        });
      } catch (error) {
        this.testResults.push({
          name: test.name,
          passed: false,
          duration: 0,
          error: error.message
        });
      }
    }
  }

  private async testTokenEfficiency(): Promise<void> {
    const testQueries = ['hi', 'hello', 'thanks', 'help'];
    let totalSavings = 0;
    let totalQueries = 0;

    for (const query of testQueries) {
      try {
        const startTokens = tokenTracker.getMetrics().tokensUsed;
        await this.engine.analyzeQuery(query, { messages: [] });
        const endTokens = tokenTracker.getMetrics().tokensUsed;
        
        const tokensUsed = endTokens - startTokens;
        totalSavings += tokensUsed < 100 ? 1 : 0; // Expected savings
        totalQueries++;
      } catch (error) {
        // Track error
      }
    }

    const efficiency = totalSavings / totalQueries;
    this.testResults.push({
      name: 'Token Efficiency',
      passed: efficiency >= 0.9,
      duration: 0,
      details: `Efficiency: ${(efficiency * 100).toFixed(1)}%`
    });
  }

  private async testPerformance(): Promise<void> {
    const testQueries = ['hello', 'debug error', 'help me'];
    const startTime = Date.now();
    
    for (const query of testQueries) {
      await this.engine.analyzeQuery(query, { messages: [] });
    }
    
    const avgTime = (Date.now() - startTime) / testQueries.length;
    
    this.testResults.push({
      name: 'Performance',
      passed: avgTime < 100,
      duration: avgTime,
      details: `Average response time: ${avgTime.toFixed(1)}ms`
    });
  }

  private async testErrorHandling(): Promise<void> {
    try {
      // Test with invalid input
      await this.engine.analyzeQuery('', { messages: [] });
      
      this.testResults.push({
        name: 'Error Handling',
        passed: true,
        duration: 0,
        details: 'System handled edge cases gracefully'
      });
    } catch (error) {
      this.testResults.push({
        name: 'Error Handling',
        passed: false,
        duration: 0,
        error: error.message
      });
    }
  }

  private async testCaching(): Promise<void> {
    const query = 'hello world';
    
    // First call
    const start1 = Date.now();
    await this.engine.analyzeQuery(query, { messages: [] });
    const time1 = Date.now() - start1;
    
    // Second call (should be cached)
    const start2 = Date.now();
    await this.engine.analyzeQuery(query, { messages: [] });
    const time2 = Date.now() - start2;
    
    const cacheWorking = time2 < time1 * 0.5;
    
    this.testResults.push({
      name: 'Caching System',
      passed: cacheWorking,
      duration: time2,
      details: `First: ${time1}ms, Cached: ${time2}ms`
    });
  }

  private async testMonitoring(): Promise<void> {
    const initialMetrics = performanceMonitor.getMetrics();
    
    // Execute some operations
    await this.engine.analyzeQuery('test monitoring', { messages: [] });
    
    const finalMetrics = performanceMonitor.getMetrics();
    const metricsUpdated = finalMetrics.totalOperations > initialMetrics.totalOperations;
    
    this.testResults.push({
      name: 'Monitoring System',
      passed: metricsUpdated,
      duration: 0,
      details: 'Metrics collection working'
    });
  }

  private generateSummary(): TestSummary {
    const total = this.testResults.length;
    const passed = this.testResults.filter(r => r.passed).length;
    const failed = total - passed;
    
    return {
      total,
      passed,
      failed,
      successRate: (passed / total) * 100,
      results: this.testResults
    };
  }
}

interface TestResult {
  name: string;
  passed: boolean;
  duration: number;
  details?: string;
  error?: string;
}

interface TestSummary {
  total: number;
  passed: number;
  failed: number;
  successRate: number;
  results: TestResult[];
}

// Export test runner
export const testSuite = new IntelligenceTestSuite();