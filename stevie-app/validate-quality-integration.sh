#!/bin/bash

# Scout Quality Intelligence Integration Validation
# Manual validation steps to ensure the system is working correctly

echo "🧪 Scout Quality Intelligence Integration Validation"
echo "=================================================="
echo ""

echo "✅ Phase 1: Core System Files"
echo "   Checking if quality system files exist..."

if [ -f "app/lib/quality/types/QualityTypes.ts" ]; then
    echo "   ✓ QualityTypes.ts exists"
else
    echo "   ❌ QualityTypes.ts missing"
fi

if [ -f "app/lib/quality/QualityCurationManager.ts" ]; then
    echo "   ✓ QualityCurationManager.ts exists"
else
    echo "   ❌ QualityCurationManager.ts missing"
fi

if [ -f "app/lib/quality/knowledge/ui-components.json" ]; then
    echo "   ✓ UI components knowledge base exists"
    KB_SIZE=$(wc -c < "app/lib/quality/knowledge/ui-components.json")
    echo "   ✓ Knowledge base size: $KB_SIZE bytes (~20KB expected)"
else
    echo "   ❌ UI components knowledge base missing"
fi

echo ""
echo "✅ Phase 2: Intelligence Enhancements"
echo "   Checking if quality-aware analyzers exist..."

if [ -f "app/lib/intelligence/QualityAwareQueryAnalyzer.ts" ]; then
    echo "   ✓ QualityAwareQueryAnalyzer.ts exists"
else
    echo "   ❌ QualityAwareQueryAnalyzer.ts missing"
fi

if [ -f "app/lib/intelligence/QualityAwareContextManager.ts" ]; then
    echo "   ✓ QualityAwareContextManager.ts exists"
else
    echo "   ❌ QualityAwareContextManager.ts missing"
fi

echo ""
echo "✅ Phase 3: API Integration"
echo "   Checking if api.chat.ts has been updated..."

if grep -q "QualityAwareQueryAnalyzer" app/routes/api.chat.ts; then
    echo "   ✓ api.chat.ts imports QualityAwareQueryAnalyzer"
else
    echo "   ❌ api.chat.ts not updated with quality analyzers"
fi

if grep -q "QualityAwareContextManager" app/routes/api.chat.ts; then
    echo "   ✓ api.chat.ts imports QualityAwareContextManager"
else
    echo "   ❌ api.chat.ts not updated with quality context manager"
fi

if grep -q "qualityCurator" app/routes/api.chat.ts; then
    echo "   ✓ api.chat.ts imports quality curator"
else
    echo "   ❌ api.chat.ts missing quality curator import"
fi

if grep -q "quality_token_count" app/routes/api.chat.ts; then
    echo "   ✓ api.chat.ts has quality token tracking"
else
    echo "   ❌ api.chat.ts missing quality token tracking"
fi

echo ""
echo "📊 INTEGRATION STATUS:"
echo "   All core files should be present and API should be updated."
echo "   If any items above show ❌, review the implementation."
echo ""
echo "🚀 Next Steps:"
echo "   1. Start the development server: pnpm run dev"
echo "   2. Test simple queries (hi, thanks) - should use <70 tokens"
echo "   3. Test component queries (create a button) - should add quality guidance"
echo "   4. Monitor console for quality system logs"
echo ""
echo "Expected Behavior:"
echo "   - Simple queries: Fast cached responses, no quality guidance"
echo "   - Component queries: Quality guidance with Tailark/Magic UI recommendations"
echo "   - Performance: <50ms quality lookups, <200ms initialization"
echo "   - Error handling: Graceful degradation when quality system fails"
echo ""
echo "=================================================="