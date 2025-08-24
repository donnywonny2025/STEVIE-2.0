import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

interface DebugLog {
  timestamp: Date;
  query: string;
  classification: string;
  fallbackFound: boolean;
  tokensUsed: number;
  tokensSaved: number;
  debugPath: string[];
  analysisResult?: any;
}

interface IntelligenceDebugConsoleProps {
  isVisible?: boolean;
  onToggle?: () => void;
}

export function IntelligenceDebugConsole({ 
  isVisible = false, 
  onToggle 
}: IntelligenceDebugConsoleProps) {
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<DebugLog | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Listen for debug events from the Intelligence system
  useEffect(() => {
    const handleDebugEvent = (event: CustomEvent<DebugLog>) => {
      setLogs(prev => [event.detail, ...prev.slice(0, 19)]); // Keep last 20 logs
    };

    window.addEventListener('intelligence:debug', handleDebugEvent as EventListener);
    return () => window.removeEventListener('intelligence:debug', handleDebugEvent as EventListener);
  }, []);

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={onToggle}
          variant="outline"
          size="sm"
          className="bg-white/90 backdrop-blur-sm border-orange-200 text-orange-700 hover:bg-orange-50"
        >
          🧠 Debug ({logs.length})
        </Button>
      </div>
    );
  }

  const currentEfficiency = logs.length > 0 
    ? Math.round((logs[0].tokensSaved / (logs[0].tokensUsed + logs[0].tokensSaved)) * 100)
    : 0;

  return (
    <div className="fixed bottom-4 right-4 w-96 max-h-96 z-50">
      <Card className="bg-white/95 backdrop-blur-sm border-orange-200 shadow-lg">
        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-lg">🧠</span>
              <h3 className="font-semibold text-gray-900">Intelligence Debug</h3>
              {logs.length > 0 && (
                <Badge 
                  variant={currentEfficiency > 90 ? "success" : currentEfficiency > 50 ? "warning" : "destructive"}
                >
                  {currentEfficiency}% Efficient
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsExpanded(!isExpanded)}
                variant="ghost"
                size="sm"
              >
                {isExpanded ? '📋' : '📊'}
              </Button>
              <Button
                onClick={onToggle}
                variant="ghost"
                size="sm"
              >
                ✕
              </Button>
            </div>
          </div>

          {/* Current Status */}
          {logs.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Latest Query</span>
                <span className="text-xs text-gray-500">
                  {logs[0].timestamp.toLocaleTimeString()}
                </span>
              </div>
              <div className="text-sm text-gray-700 mb-2">"{logs[0].query}"</div>
              <div className="flex items-center gap-4 text-xs">
                <Badge variant="secondary">{logs[0].classification}</Badge>
                <span className={`font-medium ${logs[0].fallbackFound ? 'text-green-600' : 'text-red-600'}`}>
                  {logs[0].fallbackFound ? '✅ Fallback' : '❌ Full Context'}
                </span>
                <span>🎯 {logs[0].tokensUsed} tokens</span>
                {logs[0].tokensSaved > 0 && (
                  <span className="text-green-600">💰 Saved {logs[0].tokensSaved}</span>
                )}
              </div>
            </div>
          )}

          {/* Log History */}
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-center text-gray-500 text-sm py-4">
                No debug logs yet. Try sending a message to see Intelligence analysis.
              </div>
            ) : (
              logs.map((log, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    selectedLog === log 
                      ? 'bg-blue-100 border border-blue-300' 
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                  onClick={() => setSelectedLog(log === selectedLog ? null : log)}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium truncate flex-1">
                      "{log.query}"
                    </span>
                    <div className="flex items-center gap-2 ml-2">
                      <Badge 
                        size="sm" 
                        variant={log.fallbackFound ? "success" : "destructive"}
                      >
                        {log.tokensUsed}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {log.timestamp.toLocaleTimeString().slice(0, 5)}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {log.classification} • {log.fallbackFound ? 'Cached' : 'Full Pipeline'}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

// Hook for sending debug events
export function useIntelligenceDebug() {
  const logDebug = (debugData: Omit<DebugLog, 'timestamp'>) => {
    const event = new CustomEvent('intelligence:debug', {
      detail: { ...debugData, timestamp: new Date() }
    });
    window.dispatchEvent(event);
  };

  return { logDebug };
}

// Helper function to integrate into api.chat.ts
export function broadcastIntelligenceDebug(
  query: string,
  analysis: any,
  tokensUsed: number,
  tokensSaved: number,
  debugPath: string[]
) {
  const event = new CustomEvent('intelligence:debug', {
    detail: {
      timestamp: new Date(),
      query,
      classification: analysis.query_type || 'UNKNOWN',
      fallbackFound: !!analysis.fallback_strategy,
      tokensUsed,
      tokensSaved,
      debugPath,
      analysisResult: analysis
    }
  });
  window.dispatchEvent(event);
}