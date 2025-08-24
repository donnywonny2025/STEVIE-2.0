import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { TextEffect } from '~/components/text/TextEffect';
import { TextShimmer } from '~/components/text/TextShimmer';
import '~/styles/enhanced-animations.css';

const FRIENDLY_MESSAGES = [
  "What do you want to build today, bud?",
  "Ready to bring some ideas to life?",
  "Let's create something amazing together!",
  "What's your next coding adventure?",
  "Time to make some digital magic happen!",
  "What can we build from scratch today?",
  "Ready to turn your vision into reality?",
  "Let's code something incredible!",
  "What's brewing in your creative mind?",
  "Time to make your ideas come alive!",
  "What amazing project should we tackle?",
  "Ready to build something that matters?",
];

interface EnhancedGreetingProps {
  chatStarted: boolean;
}

export const EnhancedGreeting: React.FC<EnhancedGreetingProps> = ({ chatStarted }) => {
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0);

  useEffect(() => {
    if (!chatStarted) {
      const interval = setInterval(() => {
        setCurrentMessageIndex((prev) => (prev + 1) % FRIENDLY_MESSAGES.length);
      }, 4000); // Change message every 4 seconds

      return () => clearInterval(interval);
    }
  }, [chatStarted]);

  if (chatStarted) return null;

  return (
    <div id="intro" className="mt-[12vh] max-w-4xl mx-auto text-center px-6 lg:px-0 relative">
      {/* Main greeting with professional text animations */}
      <div className="text-center space-y-8 py-8">
        <TextEffect 
          per="word" 
          as="h1" 
          className="text-6xl lg:text-8xl font-bold text-white tracking-tight"
          preset="slide"
        >
          Hello Jeff,
        </TextEffect>
        
        <TextShimmer 
          className="text-3xl lg:text-5xl font-medium text-zinc-300 leading-relaxed mt-4"
          duration={3}
        >
          what are we building today?
        </TextShimmer>
        
        <TextEffect
          per="char"
          preset="fade-in-blur"
          delay={1.5}
          className="text-xl lg:text-2xl text-zinc-400 mt-6"
        >
          Let's code something incredible!
        </TextEffect>
      </div>

      {/* Animated friendly messages */}
      <motion.div 
        className="text-xl lg:text-2xl mb-12 h-10 flex items-center justify-center mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
      >
        <motion.p
          key={currentMessageIndex}
          className="text-purple-400 font-medium"
          initial={{ opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.9 }}
          transition={{ duration: 0.6, ease: "easeInOut" }}
        >
          {FRIENDLY_MESSAGES[currentMessageIndex]}
        </motion.p>
      </motion.div>

      {/* Floating elements for extra flair */}
      <div className="absolute -top-10 -left-10 w-20 h-20 bg-purple-500/10 rounded-full blur-xl animate-pulse" />
      <div className="absolute -top-5 -right-15 w-16 h-16 bg-pink-500/10 rounded-full blur-lg animate-pulse-delay-1000" />
      <div className="absolute -bottom-5 left-1/4 w-12 h-12 bg-indigo-500/10 rounded-full blur-md animate-pulse-delay-2000" />

      {/* Sparkle effects */}
      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-purple-400 rounded-full animate-ping-delay-500" />
      <div className="absolute top-1/3 right-1/4 w-1 h-1 bg-pink-400 rounded-full animate-ping-delay-1500" />
      <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-indigo-400 rounded-full animate-ping-delay-2500" />
    </div>
  );
};