# 🛠️ Development Tools

## Available Scripts
- **Location**: `../` (root directory)
- **Status**: ✅ Ready for use

## Debugging Tools
1. **debug_conversation_flow.js** - Analyze conversation patterns
2. **debug_token_usage.js** - Token usage analysis  
3. **exact_payload_example.js** - API payload inspection
4. **proof_every_message.js** - Message verification

## Testing Scripts
1. **test_steve_ai.py** - Complete system test
2. **test_gemini.py** - Google Gemini API test
3. **test_azure.py** - Azure OpenAI connection test
4. **test_endpoints.py** - API endpoint validation

## Configuration Files
- **startup.json** - System configuration and context
- **.env** - Environment variables (in bolt.diy/)
- **package.json** - Node.js dependencies (in bolt.diy/)

## Quick Commands
```bash
# Test main application
python test_steve_ai.py

# Test Google Gemini
python test_gemini.py

# Debug token usage
node debug_token_usage.js

# Check conversation flow
node debug_conversation_flow.js
```

## Development Environment
- **Node.js**: 18.18.0+
- **Package Manager**: pnpm
- **Build System**: Vite
- **Runtime**: WebContainer API