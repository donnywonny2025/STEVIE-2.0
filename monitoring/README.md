# 📊 System Monitoring & Health

## Active Monitoring Scripts
- **Location**: `../monitor_*.py`
- **Status**: ✅ Operational
- **Coverage**: API health, token usage, system performance

## Key Scripts
1. **monitor_steve_comprehensive.py** - Full system monitoring
2. **monitor_gemini_usage.py** - Google Gemini API tracking
3. **instant_status.sh** - Quick health check
4. **quick_status.sh** - Basic status verification

## Current System Health
- 🟢 **Steve AI Server**: Running on port 5178
- 🟢 **Google Gemini API**: Connected and operational
- 🟢 **Scout Intelligence**: Active (97% token efficiency)
- 🟢 **Quality Intelligence**: Integrated and functional
- 🟢 **Token Usage**: Optimized (47 tokens for simple queries)

## Performance Metrics
- **Simple Queries**: 47 tokens (97% efficiency)
- **Component Queries**: 95 tokens (quality guidance)
- **Response Time**: Sub-second API responses
- **Uptime**: Continuous operation

## Health Check Commands
```bash
# Quick status
./instant_status.sh

# Comprehensive monitoring  
python monitor_steve_comprehensive.py

# API-specific monitoring
python monitor_gemini_usage.py
```