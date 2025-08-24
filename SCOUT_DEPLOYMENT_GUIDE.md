# 🚀 Steve AI Platform - Complete Setup Guide for Scout

## 📋 Quick Deployment Overview
This repository contains the complete Steve AI platform with multi-agent coordination system. Everything you need to run the application locally is included.

## 🎯 What You're Getting
- **Steve AI Application**: Enhanced Bolt.diy with Google/Gemini integration
- **Intelligence Systems**: Scout (token optimization), Quality, Quest systems
- **Multi-Agent Coordination**: Hub-and-spoke workspace architecture
- **Philosophy DNA**: 4-strand framework for consistent AI behavior

## ⚡ Quick Start (5 Minutes)

### 1. Clone the Repository
```bash
git clone https://github.com/donnywonny2025/STEVIE-2.0.git
cd STEVIE-2.0
```

### 2. Setup the Steve AI Application
```bash
# Navigate to the app directory
cd /path/to/bolt.diy  # Or wherever you clone the main app

# Install dependencies
npm install

# Start the application
npm run dev
```

### 3. Access the Application
- **URL**: http://localhost:5173
- **Status Check**: `curl http://localhost:5173` should return 200

## 📁 Repository Structure

```
STEVIE-2.0/
├── workspace/                    # Multi-agent coordination hub
│   ├── WORKSPACE_COORDINATION.json  # Central status tracking
│   ├── handoffs/
│   │   └── SCOUT_COMPREHENSIVE_BRIEFING.json  # Your complete briefing
│   ├── communications/           # Philosophy DNA protocols
│   └── ... (all coordination files)
└── bolt.diy/                    # Steve AI application (separate repo)
```

## 🎯 Your Mission: Token Optimization

### Primary Objective
Analyze and optimize token usage patterns to achieve **97% efficiency target**.

### Key Areas to Focus On
1. **API Call Patterns**: Review `app/routes/api.chat.ts`
2. **Context Management**: Check `app/lib/intelligence/` directory
3. **Response Processing**: Analyze chat components
4. **Caching Opportunities**: Look for redundant API calls

### Files to Examine
- `app/routes/api.chat.ts` - Main API handling
- `app/lib/intelligence/TokenManager.ts` - Current token management
- `app/components/chat/` - Chat interface components
- `app/lib/quality/` - Quality intelligence system

## 🔧 Technical Stack
- **Frontend**: React + Remix + TypeScript
- **Backend**: Node.js + WebContainer API
- **AI Integration**: Google/Gemini (primary)
- **Build Tool**: Vite
- **Package Manager**: npm

## 🧬 Philosophy DNA Framework
When making changes, ensure alignment with:
1. **Hub-and-Spoke Excellence** 🏠 - Centralized coordination
2. **Zero Context Loss** 🧠 - Complete documentation
3. **97% Token Efficiency** ⚡ - Your primary mission
4. **Creative Professional Engineering** 🎨 - Beautiful + functional

## 📊 Current Status
- **Application**: ✅ Running at localhost:5173
- **Google/Gemini Integration**: ✅ Active
- **Intelligence Stack**: ✅ All systems operational
- **Token Efficiency**: ❌ Needs optimization (your mission!)

## 🚨 Known Issues (Your Targets)
1. **Token Inefficiency**: App burns through tokens quickly
2. **Suboptimal API Patterns**: Requests not batched/optimized
3. **No Intelligent Caching**: Redundant API calls
4. **Context Redundancy**: Repeated context sending

## 🔍 Debug Commands
```bash
# Check application status
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173

# View current coordination status
cat workspace/WORKSPACE_COORDINATION.json

# Test Scout intelligence integration
node test-scout-intelligence.js

# Validate quality integration
./validate-quality-integration.sh
```

## 📈 Success Metrics
- **Target**: 97% token efficiency improvement
- **Method**: API optimization, intelligent caching, context management
- **Validation**: Performance benchmarks and success metrics

## 🤝 Multi-Agent Coordination
- **Update Status**: Edit `workspace/WORKSPACE_COORDINATION.json`
- **Report Progress**: Use JSON format in `handoffs/` directory
- **Emergency Contact**: Check `handoffs/SCOUT_COMPREHENSIVE_BRIEFING.json`

## 🆘 Troubleshooting

### Application Won't Start
```bash
cd /path/to/bolt.diy
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Port Conflicts
The app runs on port 5173. If occupied:
```bash
lsof -ti:5173 | xargs kill -9
npm run dev
```

### Missing Dependencies
```bash
npm install --force
```

## 🎆 Ready to Rock!
Everything is set up for your token optimization mission. The application is fully functional but needs your expertise to achieve the 97% efficiency target.

**Your complete context is in**: `workspace/handoffs/SCOUT_COMPREHENSIVE_BRIEFING.json`

Good luck, Scout! 🚀