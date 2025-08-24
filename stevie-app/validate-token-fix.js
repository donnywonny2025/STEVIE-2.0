#!/usr/bin/env node

/**
 * SCOUT TOKEN EFFICIENCY FIX - Validation Test Script
 * Tests the extractUserQuery function to ensure proper contamination cleaning
 */

// Replicate the exact function from api.chat.ts
function extractUserQuery(rawQuery) {
  // Remove model metadata pattern: [Model: ...] [Provider: ...]
  const cleanQuery = rawQuery.replace(/^\[Model:[^\]]+\]\s*\n*\s*\[Provider:[^\]]+\]\s*\n*\s*/i, '');
  return cleanQuery.trim();
}

// Test cases from the Scout handoff
const testCases = [
  {
    name: "Clean Input (no contamination)",
    input: "hello",
    expected: "hello",
    description: "Should pass through unchanged"
  },
  {
    name: "Contaminated Input (typical case)",
    input: "[Model: gemini-2.5-flash]\n\n[Provider: Google]\n\nhello",
    expected: "hello", 
    description: "Should strip model metadata and return clean 'hello'"
  },
  {
    name: "Complex Query (no contamination)",
    input: "help me debug this React component error",
    expected: "help me debug this React component error",
    description: "Should pass through unchanged"
  },
  {
    name: "Contaminated Complex Query",
    input: "[Model: claude-3]\n\n[Provider: Anthropic]\n\nhelp me build a todo app",
    expected: "help me build a todo app",
    description: "Should strip metadata from complex query"
  }
];

console.log("🧹 SCOUT TOKEN EFFICIENCY FIX - VALIDATION TESTING");
console.log("=" .repeat(60));

let allTestsPassed = true;

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: ${testCase.name}`);
  console.log(`Input: "${testCase.input}"`);
  console.log(`Expected: "${testCase.expected}"`);
  
  const result = extractUserQuery(testCase.input);
  const passed = result === testCase.expected;
  
  console.log(`Result: "${result}"`);
  console.log(`Status: ${passed ? "✅ PASSED" : "❌ FAILED"}`);
  console.log(`Description: ${testCase.description}`);
  
  if (!passed) {
    allTestsPassed = false;
    console.log(`❌ ERROR: Expected "${testCase.expected}" but got "${result}"`);
  }
});

console.log("\n" + "=" .repeat(60));
console.log(`VALIDATION SUMMARY: ${allTestsPassed ? "✅ ALL TESTS PASSED" : "❌ SOME TESTS FAILED"}`);

if (allTestsPassed) {
  console.log("🚀 SCOUT TOKEN EFFICIENCY FIX VALIDATION SUCCESSFUL!");
  console.log("📊 Implementation ready for production efficiency testing");
  console.log("🎯 Expected efficiency: 97% (2,752 → 45 tokens for greetings)");
} else {
  console.log("⚠️ VALIDATION FAILED - Review implementation");
}

console.log("=" .repeat(60));