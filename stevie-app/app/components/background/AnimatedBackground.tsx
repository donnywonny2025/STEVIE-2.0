import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';

export interface AnimatedBackgroundProps {
  className?: string;
  numSquares?: number;
  maxOpacity?: number;
  duration?: number;
  colors?: string[];
}

export const AnimatedBackground: React.FC<AnimatedBackgroundProps> = ({
  className = '',
  numSquares = 8,
  maxOpacity = 0.03,
  duration = 20,
  colors = ['#9333ea', '#ec4899', '#06b6d4', '#10b981'],
}) => {
  const squares = useMemo(() => {
    return Array.from({ length: numSquares }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 40 + 40,
      color: colors[Math.floor(Math.random() * colors.length)],
      animationDelay: Math.random() * duration,
    }));
  }, [numSquares, colors, duration]);

  return (
    <div className={classNames('absolute inset-0 overflow-hidden', className)}>
      {squares.map((square) => (
        <motion.div
          key={square.id}
          className="absolute rounded-lg"
          style={{
            left: `${square.x}%`,
            top: `${square.y}%`,
            width: `${square.size}px`,
            height: `${square.size}px`,
            backgroundColor: square.color,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, maxOpacity, 0],
            scale: [0.8, 1, 0.8],
            y: [-20, 20, -20],
          }}
          transition={{
            duration: duration,
            delay: square.animationDelay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
      
      {/* Additional gradient overlay */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(circle at 50% 50%, ${colors[0]}05, transparent 70%)`,
        }}
        animate={{
          background: [
            `radial-gradient(circle at 30% 40%, ${colors[0]}05, transparent 70%)`,
            `radial-gradient(circle at 70% 60%, ${colors[1]}05, transparent 70%)`,
            `radial-gradient(circle at 40% 80%, ${colors[2]}05, transparent 70%)`,
            `radial-gradient(circle at 80% 20%, ${colors[3] || colors[0]}05, transparent 70%)`,
            `radial-gradient(circle at 30% 40%, ${colors[0]}05, transparent 70%)`,
          ],
        }}
        transition={{
          duration: duration * 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
};