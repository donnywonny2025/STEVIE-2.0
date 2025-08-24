#!/bin/bash

# 🚀 QUICK COORDINATION UPDATE
# Fast, one-line updates to WORKSPACE_COORDINATION.json
# Usage: ./quick-update.sh [agent_name] [field] [value]
# Example: ./quick-update.sh qoder_chat status "working_on_feature_x"

COORD_FILE="/Volumes/AI/WORK 2025/Steve/workspace/WORKSPACE_COORDINATION.json"
AGENT=$1
FIELD=$2
VALUE=$3

if [ $# -ne 3 ]; then
    echo "Usage: ./quick-update.sh [agent_name] [field] [value]"
    echo "Example: ./quick-update.sh qoder_chat message 'Task complete'"
    exit 1
fi

# Quick timestamp
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Fast JSON update using jq
jq ".agent_insights.${AGENT}.${FIELD} = \"${VALUE}\" | .agent_insights.${AGENT}.last_update = \"${TIMESTAMP}\"" "$COORD_FILE" > "${COORD_FILE}.tmp" && mv "${COORD_FILE}.tmp" "$COORD_FILE"

echo "✅ Quick update: ${AGENT}.${FIELD} = '${VALUE}'"