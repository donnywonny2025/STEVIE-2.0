# 🚀 INSTANT COORDINATION ALIASES
# Source this file for lightning-fast updates: source ./aliases.sh

COORD_FILE="/Volumes/AI/WORK 2025/Steve/workspace/WORKSPACE_COORDINATION.json"

# Ultra-fast message aliases
alias qm='f(){ jq ".agent_insights.qoder_chat.quick_message = \"$1\" | .agent_insights.qoder_chat.last_update = \"$(date +%H:%M:%S)\"" "$COORD_FILE" > "$COORD_FILE.tmp" && mv "$COORD_FILE.tmp" "$COORD_FILE" && echo "⚡ Qoder: $1"; }; f'

alias qe='f(){ jq ".agent_insights.quest_mode.quick_message = \"$1\" | .agent_insights.quest_mode.last_update = \"$(date +%H:%M:%S)\"" "$COORD_FILE" > "$COORD_FILE.tmp" && mv "$COORD_FILE.tmp" "$COORD_FILE" && echo "⚡ Quest: $1"; }; f'

# Status aliases  
alias w='f(){ jq ".current_mission.active_status = \"$1 - IN PROGRESS\"" "$COORD_FILE" > "$COORD_FILE.tmp" && mv "$COORD_FILE.tmp" "$COORD_FILE" && echo "⚡ Working: $1"; }; f'

alias d='f(){ jq ".current_mission.active_status = \"$1 - COMPLETE\"" "$COORD_FILE" > "$COORD_FILE.tmp" && mv "$COORD_FILE.tmp" "$COORD_FILE" && echo "✅ Done: $1"; }; f'

# Philosophy check
alias p='jq ".philosophy_dna.last_check = \"$(date +%H:%M:%S)\"" "$COORD_FILE" > "$COORD_FILE.tmp" && mv "$COORD_FILE.tmp" "$COORD_FILE" && echo "🧬 Philosophy checked"'

# Read current status
alias s='jq -r ".current_mission.active_status // \"No active status\"" "$COORD_FILE"'

# Read messages
alias rm='jq -r ".agent_insights.qoder_chat.quick_message // \"No Qoder message\"" "$COORD_FILE"'
alias rq='jq -r ".agent_insights.quest_mode.quick_message // \"No Quest message\"" "$COORD_FILE"'

echo "⚡ LIGHTNING ALIASES LOADED:"
echo "  qm 'msg' - Qoder message"
echo "  qe 'msg' - Quest message" 
echo "  w 'task' - Working on task"
echo "  d 'task' - Done with task"
echo "  p        - Philosophy check"
echo "  s        - Show status"
echo "  rm/rq    - Read messages"