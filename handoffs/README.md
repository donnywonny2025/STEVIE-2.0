# 🔗 Agent Coordination Hub

## JSON Handoff Protocol

### Standard Handoff Format
```json
{
  "handoff_type": "agent_transition",
  "from_agent": "current_agent",
  "to_agent": "target_agent",
  "project_context": {
    "name": "Steve AI",
    "type": "full_stack_ai_application", 
    "status": "production_ready",
    "priority_focus": "current_task"
  },
  "current_task": {
    "objective": "specific_goal",
    "progress": "current_status",
    "next_action": "immediate_next_step"
  },
  "technical_context": {
    "repository": "https://github.com/donnywonny2025/Steve.git",
    "main_tech_stack": ["React", "TypeScript", "Node.js", "Google Gemini"],
    "ai_providers": ["Google Gemini (Primary)", "OpenRouter (Fallback)"],
    "current_challenges": ["specific_issues"]
  },
  "agent_instructions": {
    "context_level": "full",
    "tone": "professional_engineering", 
    "focus_areas": ["architecture", "efficiency", "clean_code"]
  }
}
```

## Agent Roles
- **Scout.New**: Architecture & design planning
- **Claude**: Advanced reasoning & complex analysis  
- **Qoder Chat**: Implementation & coding
- **Quest Mode**: Deep analysis & workspace organization

## Coordination Rules
1. **Context Preservation**: Every handoff includes complete project state
2. **Zero Lag Transfer**: No re-explaining of basic project details
3. **Consistent Philosophy**: All agents maintain same engineering standards
4. **Efficient Communication**: Use JSON protocol for complex transitions