import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { classNames } from '~/utils/classNames';

interface IntelligenceStep {
  id: string;
  action: string;
  status: 'processing' | 'complete' | 'optimized';
  tokens?: number;
  savings?: number;
  icon?: string;
}

interface IntelligenceNotificationProps {
  steps: IntelligenceStep[];
  isVisible: boolean;
  onComplete?: () => void;
}

const STEP_ICONS = {
  analyze: 'i-ph:brain',
  context: 'i-ph:selection-background', 
  optimize: 'i-ph:lightning',
  fallback: 'i-ph:shield-check',
  complete: 'i-ph:check-circle',
};

const STEP_MESSAGES = {
  analyze: 'Analyzing query complexity...',
  context: 'Selecting relevant context...',
  optimize: 'Optimizing token usage...',
  fallback: 'Smart fallback activated...',
  complete: 'Ready to respond',
};

export const IntelligenceNotification: React.FC<IntelligenceNotificationProps> = ({
  steps,
  isVisible,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [displaySteps, setDisplaySteps] = useState<IntelligenceStep[]>([]);

  useEffect(() => {
    if (!isVisible || steps.length === 0) return;

    // Animate through steps with realistic timing
    const processSteps = async () => {
      for (let i = 0; i < steps.length; i++) {
        setCurrentStep(i);
        setDisplaySteps(prev => [...prev, steps[i]]);
        
        // Vary timing based on step complexity
        const delay = steps[i].action === 'analyze' ? 800 : 
                     steps[i].action === 'context' ? 600 :
                     steps[i].action === 'optimize' ? 400 : 500;
        
        await new Promise(resolve => setTimeout(resolve, delay));
      }
      
      // Show completion briefly, then fade out
      setTimeout(() => {
        onComplete?.();
      }, 1500);
    };

    processSteps();
  }, [steps, isVisible, onComplete]);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -10, scale: 0.95 }}
        transition={{ 
          duration: 0.4, 
          ease: [0.25, 0.46, 0.45, 0.94] // Custom easing for smooth feel
        }}
        className="fixed top-4 right-4 z-50 max-w-sm"
      >
        <div className="bg-gray-900/95 backdrop-blur-xl text-white rounded-xl border border-gray-600/30 shadow-2xl overflow-hidden ring-1 ring-white/5">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-600/20">
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                className="w-4 h-4 text-purple-400/80"
              >
                <div className="i-ph:brain" />
              </motion.div>
              <span className="text-sm font-medium text-gray-100 tracking-wide">Scout Intelligence</span>
              <motion.div 
                initial={{ scale: 0.8, opacity: 0.7 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="ml-auto text-xs text-purple-300/70 px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-400/20"
              >
                Active
              </motion.div>
            </div>
          </div>

          {/* Steps */}
          <div className="p-3 space-y-2 max-h-48 overflow-hidden">
            <AnimatePresence mode="wait">
              {displaySteps.map((step, index) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className={classNames(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-500 backdrop-blur-sm",
                    step.status === 'complete' ? 'bg-green-400/5 border border-green-400/15 shadow-sm shadow-green-400/5' :
                    step.status === 'optimized' ? 'bg-purple-400/5 border border-purple-400/15 shadow-sm shadow-purple-400/5' :
                    'bg-gray-700/20 border border-gray-500/15 shadow-sm shadow-gray-400/5'
                  )}
                >
                  {/* Icon */}
                  <div className={classNames(
                    "w-4 h-4 flex-shrink-0 transition-colors duration-300",
                    step.status === 'complete' ? 'text-green-300' :
                    step.status === 'optimized' ? 'text-purple-300' :
                    'text-blue-300'
                  )}>
                    {step.status === 'processing' ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="i-ph:circle-notch"
                      />
                    ) : (
                      <div className={step.icon || STEP_ICONS[step.action as keyof typeof STEP_ICONS] || 'i-ph:check'} />
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-100 truncate font-medium tracking-wide">
                      {STEP_MESSAGES[step.action as keyof typeof STEP_MESSAGES] || step.action}
                    </div>
                    
                    {/* Token info */}
                    {(step.tokens || step.savings) && (
                      <motion.div 
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.3 }}
                        className="text-xs text-gray-300/80 mt-1.5 font-mono"
                      >
                        {step.tokens && <span className="bg-gray-600/20 px-1.5 py-0.5 rounded">{step.tokens} tokens</span>}
                        {step.savings && (
                          <span className="text-green-300 ml-2 bg-green-500/10 px-1.5 py-0.5 rounded">
                            ↓ {step.savings} saved
                          </span>
                        )}
                      </motion.div>
                    )}
                  </div>

                  {/* Status indicator */}
                  <div className={classNames(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    step.status === 'complete' ? 'bg-green-400' :
                    step.status === 'optimized' ? 'bg-purple-400' :
                    'bg-blue-400'
                  )}>
                    {step.status === 'processing' && (
                      <motion.div
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="w-full h-full bg-blue-400 rounded-full"
                      />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {/* Current processing indicator */}
            {currentStep < steps.length && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2 px-3 py-2 text-xs text-gray-400"
              >
                <motion.div
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="w-1 h-1 bg-purple-400 rounded-full"
                />
                Processing step {currentStep + 1} of {steps.length}
              </motion.div>
            )}
          </div>

          {/* Footer with efficiency indicator */}
          {displaySteps.some(step => step.savings) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.5, ease: "easeOut" }}
              className="px-4 py-2.5 bg-gradient-to-r from-green-500/5 to-purple-500/5 border-t border-gray-600/20 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-300 font-medium tracking-wide flex items-center gap-1">
                  <motion.div 
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity }}
                    className="w-2 h-2 bg-green-400 rounded-full"
                  />
                  Efficiency Active
                </span>
                <span className="text-gray-200 font-mono bg-gray-600/20 px-2 py-1 rounded">
                  {displaySteps.reduce((total, step) => total + (step.savings || 0), 0)} tokens saved
                </span>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

// Compact version for less intrusive display
export const IntelligenceNotificationCompact: React.FC<{
  message: string;
  type: 'processing' | 'optimized' | 'complete';
  isVisible: boolean;
  onComplete?: () => void;
}> = ({ message, type, isVisible, onComplete }) => {
  useEffect(() => {
    if (isVisible && type === 'complete') {
      const timer = setTimeout(() => {
        onComplete?.();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, type, onComplete]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 15, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -8, scale: 0.95 }}
          transition={{ 
            duration: 0.4, 
            ease: [0.25, 0.46, 0.45, 0.94] // Smooth custom easing
          }}
          className="fixed bottom-6 right-6 z-40"
        >
          <div className="bg-gray-900/95 backdrop-blur-xl text-white px-4 py-3 rounded-xl border border-gray-600/25 shadow-2xl ring-1 ring-white/5">
            <div className="flex items-center gap-3 text-sm">
              <motion.div
                animate={type === 'processing' ? { rotate: 360 } : {}}
                transition={{ 
                  duration: 2, 
                  repeat: type === 'processing' ? Infinity : 0, 
                  ease: "linear" 
                }}
                className={classNames(
                  "w-4 h-4 transition-colors duration-300",
                  type === 'complete' ? 'text-green-300' :
                  type === 'optimized' ? 'text-purple-300' :
                  'text-blue-300'
                )}
              >
                <div className={
                  type === 'processing' ? 'i-ph:circle-notch' :
                  type === 'complete' ? 'i-ph:check-circle' :
                  'i-ph:lightning'
                } />
              </motion.div>
              <span className="text-gray-100 font-medium tracking-wide">{message}</span>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};