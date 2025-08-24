/**
 * TokenUsageDisplay - Real-Time Token Efficiency UI
 */

import React, { useState } from 'react';

interface TokenUsageData {
  queryType: string;
  tokensUsed: number;
  tokensSaved: number;
  efficiencyGain: string;
  breakdown: {
    system_prompt: number;
    user_query: number;
    relevant_history: number;
    technical_context: number;
    file_context: number;
  };
  fallbackInfo?: {
    strategy: string;
    reason: string;
  };
}

interface TokenUsageDisplayProps {
  data: TokenUsageData;
  className?: string;
}

const QUERY_TYPE_COLORS = {
  SIMPLE: 'bg-green-100 text-green-800',
  MEDIUM: 'bg-blue-100 text-blue-800',
  COMPLEX: 'bg-purple-100 text-purple-800',
  ESCALATED: 'bg-orange-100 text-orange-800'
};

export function TokenUsageDisplay({ data, className = '' }: TokenUsageDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-3 text-sm ${className}`}>
      {/* Compact Display */}
      <div className=\"flex items-center justify-between\">
        <div className=\"flex items-center gap-2\">
          <span className={`px-2 py-1 rounded text-xs font-medium ${
            QUERY_TYPE_COLORS[data.queryType as keyof typeof QUERY_TYPE_COLORS] || 
            'bg-gray-100 text-gray-800'
          }`}>
            {data.queryType}
          </span>
          
          <span className=\"font-mono text-gray-700\">
            {data.tokensUsed.toLocaleString()} tokens
          </span>
          
          <span className=\"font-semibold text-green-600\">
            Saved: {data.tokensSaved.toLocaleString()} ({data.efficiencyGain})
          </span>
        </div>
        
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className=\"text-gray-500 hover:text-gray-700\"
        >
          {isExpanded ? '−' : '+'}
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className=\"mt-3 pt-3 border-t border-gray-200 space-y-3\">
          <div>
            <h4 className=\"font-medium text-gray-700 mb-2\">Token Breakdown:</h4>
            <div className=\"space-y-1 text-xs\">
              {Object.entries(data.breakdown).map(([key, value]) => (
                <div key={key} className=\"flex justify-between\">
                  <span className=\"capitalize text-gray-600\">
                    {key.replace('_', ' ')}:
                  </span>
                  <span className=\"font-mono\">{value.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>

          {data.fallbackInfo && (
            <div className=\"bg-green-50 p-2 rounded border border-green-200\">
              <div className=\"text-green-800 font-medium text-xs\">
                ✨ Smart Fallback: {data.fallbackInfo.strategy}
              </div>
              <div className=\"text-green-700 text-xs mt-1\">
                {data.fallbackInfo.reason}
              </div>
            </div>
          )}

          <div className=\"text-xs text-gray-500\">
            🚀 Scout Intelligence Active • Dynamic Context
          </div>
        </div>
      )}
    </div>
  );
}

export function TokenUsageCompact({ data }: { data: TokenUsageData }) {
  return (
    <div className=\"inline-flex items-center gap-2 text-xs bg-green-50 text-green-800 px-2 py-1 rounded\">
      <span className=\"font-medium\">{data.queryType}</span>
      <span>|</span>
      <span className=\"font-mono\">{data.tokensUsed}</span>
      <span>|</span>
      <span className=\"font-semibold\">-{data.tokensSaved} ({data.efficiencyGain})</span>
    </div>
  );
}