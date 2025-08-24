import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import '~/styles/enhanced-animations.css';

interface EnhancedBackgroundProps {
  children?: React.ReactNode;
}

export const EnhancedBackground: React.FC<EnhancedBackgroundProps> = ({ children }) => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {/* Animated gradient base */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-pink-500/5 animate-gradient-shift" />
      
      {/* Floating orbs with parallax */}
      <motion.div
        className="absolute w-96 h-96 bg-gradient-radial from-purple-500/10 to-transparent rounded-full blur-3xl"
        style={{
          top: '10%',
          left: '10%',
        }}
        animate={{
          x: mousePosition.x * 0.02,
          y: mousePosition.y * 0.02,
          scale: [1, 1.1, 1],
        }}
        transition={{
          scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
          x: { type: "spring", stiffness: 50, damping: 30 },
          y: { type: "spring", stiffness: 50, damping: 30 },
        }}
      />
      
      <motion.div
        className="absolute w-80 h-80 bg-gradient-radial from-pink-500/10 to-transparent rounded-full blur-3xl"
        style={{
          top: '60%',
          right: '15%',
        }}
        animate={{
          x: mousePosition.x * -0.03,
          y: mousePosition.y * 0.025,
          scale: [1, 1.15, 1],
        }}
        transition={{
          scale: { duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 },
          x: { type: "spring", stiffness: 40, damping: 25 },
          y: { type: "spring", stiffness: 40, damping: 25 },
        }}
      />
      
      <motion.div
        className="absolute w-72 h-72 bg-gradient-radial from-indigo-500/8 to-transparent rounded-full blur-2xl"
        style={{
          top: '30%',
          right: '30%',
        }}
        animate={{
          x: mousePosition.x * 0.015,
          y: mousePosition.y * -0.02,
          scale: [1, 1.2, 1],
        }}
        transition={{
          scale: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 2 },
          x: { type: "spring", stiffness: 60, damping: 35 },
          y: { type: "spring", stiffness: 60, damping: 35 },
        }}
      />

      {/* Particle effects */}
      <div className="absolute inset-0">
        {[...Array(15)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 1, 0],
              scale: [1, 1.5, 1],
            }}
            transition={{
              duration: 3 + Math.random() * 2,
              repeat: Infinity,
              delay: Math.random() * 3,
              ease: "easeInOut",
            }}
          />
        ))}
      </div>

      {/* Dynamic light rays */}
      <motion.div
        className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-purple-500/20 via-transparent to-transparent"
        animate={{
          opacity: [0.2, 0.8, 0.2],
          scaleY: [1, 1.2, 1],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
      
      <motion.div
        className="absolute top-0 right-1/3 w-px h-full bg-gradient-to-b from-pink-500/20 via-transparent to-transparent"
        animate={{
          opacity: [0.2, 0.8, 0.2],
          scaleY: [1, 1.2, 1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />

      {children}
    </div>
  );
};