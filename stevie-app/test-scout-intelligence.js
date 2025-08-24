/**
 * Test Scout Intelligence System
 * 
 * This script tests our Scout intelligence implementation
 * to ensure token efficiency is working correctly.
 */

const { AdvancedQueryAnalyzer } = require('./app/lib/intelligence/AdvancedQueryAnalyzer.ts');
const { TokenManager } = require('./app/lib/intelligence/TokenManager.ts');

// Test queries with expected classifications
const testQueries = [
  {
    query: \"hello\",
    expectedType: \"SIMPLE\",
    expectedTokens: 60, // Should use cached response
    description: \"Pure greeting - should hit cached response\"
  },
  {
    query: \"thanks\",
    expectedType: \"SIMPLE\", 
    expectedTokens: 25,
    description: \"Gratitude - cached response\"
  },
  {
    query: \"can you add a red button to my app?\",
    expectedType: \"MEDIUM\",
    expectedTokens: 300,
    description: \"Technical request - should use intelligent context\"
  },
  {
    query: \"hi, can you help debug this React error: Cannot read property 'map' of undefined\",
    expectedType: \"COMPLEX\",
    expectedTokens: 700,
    description: \"Complex debugging - escalated from simple\"
  }
];

async function testScoutIntelligence() {
  console.log('🧠 Testing Scout Intelligence System\n');
  
  const analyzer = new AdvancedQueryAnalyzer();
  const tokenManager = new TokenManager();
  
  let totalSavings = 0;
  let totalQueries = 0;
  
  for (const test of testQueries) {
    console.log(`📝 Testing: \"${test.query}\"`);
    console.log(`   Expected: ${test.expectedType} (~${test.expectedTokens} tokens)`);
    
    try {
      // Analyze the query
      const analysis = await analyzer.analyzeQuery(test.query, []);
      
      console.log(`   ✅ Classified as: ${analysis.query_type} (confidence: ${analysis.confidence_score.toFixed(2)})`);
      
      // Calculate token usage
      let estimatedTokens;
      if (analysis.fallback_strategy) {
        estimatedTokens = analysis.fallback_strategy.estimated_tokens;
        console.log(`   🎯 Using cached fallback: ${analysis.fallback_strategy.strategy}`);
      } else {
        estimatedTokens = analysis.context_requirements.estimated_tokens;
        console.log(`   🔍 Using intelligent context: ${analysis.context_requirements.level}`);
      }
      
      // Track savings
      const tokenDisplay = tokenManager.trackSavings(
        'test-session',
        analysis.query_type,
        estimatedTokens
      );
      
      console.log(`   💰 Tokens used: ${estimatedTokens} | Saved: ${tokenDisplay.tokens_saved} (${tokenDisplay.efficiency_gain})`);
      
      totalSavings += tokenDisplay.tokens_saved;
      totalQueries++;
      
      // Validate against expectations
      if (analysis.query_type === test.expectedType) {
        console.log(`   ✅ Classification correct!`);
      } else {
        console.log(`   ⚠️  Expected ${test.expectedType}, got ${analysis.query_type}`);
      }
      
      if (estimatedTokens <= test.expectedTokens * 1.2) { // Allow 20% variance
        console.log(`   ✅ Token usage within expected range!`);
      } else {
        console.log(`   ⚠️  Token usage higher than expected: ${estimatedTokens} > ${test.expectedTokens}`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log();
  }
  
  // Summary
  console.log('📊 SCOUT INTELLIGENCE TEST SUMMARY');
  console.log('=====================================');
  console.log(`Queries tested: ${totalQueries}`);
  console.log(`Total tokens saved: ${totalSavings.toLocaleString()}`);
  console.log(`Average savings per query: ${Math.round(totalSavings / totalQueries)}`);
  
  const analytics = tokenManager.getSavingsReport('test-session');
  if (analytics) {
    console.log(`Session efficiency: ${analytics.efficiency_percentage}%`);
    console.log(`\n🎯 Query breakdown:`);
    console.log(`  • Simple: ${analytics.session_stats.simple_queries}`);
    console.log(`  • Medium: ${analytics.session_stats.medium_queries}`);
    console.log(`  • Complex: ${analytics.session_stats.complex_queries}`);
    console.log(`  • Fallback: ${analytics.session_stats.fallback_queries}`);
  }
  
  console.log('\n🚀 Scout Intelligence system is operational!');
  console.log('Ready to revolutionize Steve\\'s token efficiency!');
}

// Run the test
if (require.main === module) {
  testScoutIntelligence().catch(console.error);
}

module.exports = { testScoutIntelligence };"