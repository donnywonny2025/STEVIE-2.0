#!/bin/bash

# 🚀 LIGHTNING-FAST COORDINATION COMMANDS
# Pre-built shortcuts for instant updates

COORD_FILE="/Volumes/AI/WORK 2025/Steve/workspace/WORKSPACE_COORDINATION.json"

# Quick message functions
qoder_msg() {
    echo "Qoder: $1" | jq -R . | xargs -I {} jq ".agent_insights.qoder_chat.quick_message = {} | .agent_insights.qoder_chat.last_update = \"$(date '+%H:%M:%S')\"" "$COORD_FILE" > "${COORD_FILE}.tmp" && mv "${COORD_FILE}.tmp" "$COORD_FILE"
    echo "⚡ Qoder message posted: $1"
}

quest_msg() {
    echo "Quest: $1" | jq -R . | xargs -I {} jq ".agent_insights.quest_mode.quick_message = {} | .agent_insights.quest_mode.last_update = \"$(date '+%H:%M:%S')\"" "$COORD_FILE" > "${COORD_FILE}.tmp" && mv "${COORD_FILE}.tmp" "$COORD_FILE"
    echo "⚡ Quest message posted: $1"
}

# Status updates
working() {
    jq ".current_mission.active_status = \"$1 - IN PROGRESS\" | .current_mission.last_update = \"$(date '+%H:%M:%S')\"" "$COORD_FILE" > "${COORD_FILE}.tmp" && mv "${COORD_FILE}.tmp" "$COORD_FILE"
    echo "⚡ Status: Working on $1"
}

complete() {
    jq ".current_mission.active_status = \"$1 - COMPLETE\" | .current_mission.last_update = \"$(date '+%H:%M:%S')\"" "$COORD_FILE" > "${COORD_FILE}.tmp" && mv "${COORD_FILE}.tmp" "$COORD_FILE"
    echo "✅ Status: $1 Complete"
}

# Philosophy check
phi_check() {
    SCORE=${1:-10}
    jq ".philosophy_dna.philosophy_health = \"CHECKED - Score: $SCORE/10\" | .philosophy_dna.last_check = \"$(date '+%H:%M:%S')\"" "$COORD_FILE" > "${COORD_FILE}.tmp" && mv "${COORD_FILE}.tmp" "$COORD_FILE"
    echo "🧬 Philosophy check: $SCORE/10"
}

# Export functions so they can be used from command line
export -f qoder_msg quest_msg working complete phi_check

# Show usage if no arguments
if [ $# -eq 0 ]; then
    echo "⚡ QUICK COORDINATION COMMANDS:"
    echo "  qoder_msg 'message'     - Post Qoder message"  
    echo "  quest_msg 'message'     - Post Quest message"
    echo "  working 'task'          - Set working status"
    echo "  complete 'task'         - Mark task complete"
    echo "  phi_check [score]       - Philosophy check (default 10)"
    echo ""
    echo "Usage: source ./quick-commands.sh"
    echo "Then use: qoder_msg 'Task started'"
fi