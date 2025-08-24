#!/bin/bash

# 🎯 MANDATORY WORKSPACE COORDINATION CHECK
# This script MUST be run at the start of every session
# No exceptions - this is how we maintain our philosophy!

echo "🏠 =============================================="
echo "   STEVE AI WORKSPACE COORDINATION CHECK"
echo "   🧬 Philosophy DNA Compliance Required"
echo "=============================================="
echo ""

# Check if coordination file exists
COORD_FILE="/Volumes/AI/WORK 2025/Steve/workspace/WORKSPACE_COORDINATION.json"

if [ ! -f "$COORD_FILE" ]; then
    echo "❌ CRITICAL ERROR: WORKSPACE_COORDINATION.json not found!"
    echo "   This file is MANDATORY for all workspace operations"
    exit 1
fi

echo "✅ Coordination file found: WORKSPACE_COORDINATION.json"
echo ""

# Extract key information for quick review
echo "🎯 CURRENT MISSION STATUS:"
grep -A 1 '"mission_status"' "$COORD_FILE" | sed 's/.*"mission_status": "//' | sed 's/",//'
echo ""

echo "🧬 PHILOSOPHY DNA STATUS:"
grep -A 1 '"philosophy_health"' "$COORD_FILE" | sed 's/.*"philosophy_health": "//' | sed 's/",//'
echo ""

echo "🤝 ACTIVE AGENTS:"
grep -A 1 '"active_agents"' "$COORD_FILE" | sed 's/.*"active_agents": //' | sed 's/,$//'
echo ""

echo "⚡ TOKEN EFFICIENCY ACHIEVEMENT:"
grep -A 1 '"current_score": 97' "$COORD_FILE" | head -1 | sed 's/.*"current_score": //' | sed 's/%//'
echo ""

echo "📋 MANDATORY SESSION START PROTOCOL:"
echo "   1. READ WORKSPACE_COORDINATION.json completely"
echo "   2. Verify philosophy DNA compliance" 
echo "   3. Check current mission status"
echo "   4. Update agent insights with learnings"
echo "   5. Maintain hub-and-spoke organization"
echo ""

echo "🚨 REMEMBER: This check is MANDATORY before any work!"
echo "   Philosophy compliance is NON-NEGOTIABLE"
echo "   Zero context loss must be maintained"
echo "   97% token efficiency must be preserved"
echo ""

echo "🎆 Ready to maintain Steve AI excellence!"
echo "=============================================="