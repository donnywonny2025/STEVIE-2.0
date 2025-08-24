import React from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';

export interface GlowEffectProps {
  children?: React.ReactNode;
  colors?: string[];
  mode?: 'static' | 'pulse' | 'breathe' | 'rotate' | 'colorShift' | 'flowHorizontal';
  blur?: 'softest' | 'soft' | 'medium' | 'strongest';
  duration?: number;
  scale?: number;
  className?: string;
}

export const GlowEffect: React.FC<GlowEffectProps> = ({
  children,
  colors = ['#9333ea', '#ec4899', '#06b6d4'],
  mode = 'pulse',
  blur = 'soft',
  duration = 3,
  scale = 0.95,
  className = '',
}) => {
  const blurValues = {
    softest: '4px',
    soft: '8px',
    medium: '12px',
    strongest: '16px',
  };

  const glowColor = colors[0];
  const secondaryColor = colors[1] || colors[0];
  const tertiaryColor = colors[2] || colors[1] || colors[0];

  const getAnimation = () => {
    switch (mode) {
      case 'pulse':
        return {
          boxShadow: [
            `0 0 ${blurValues[blur]} ${glowColor}40`,
            `0 0 ${blurValues[blur]} ${glowColor}80, 0 0 ${parseInt(blurValues[blur]) * 2}px ${glowColor}40`,
            `0 0 ${blurValues[blur]} ${glowColor}40`,
          ],
          scale: [scale, scale + 0.02, scale],
        };
      case 'breathe':
        return {
          boxShadow: [
            `0 0 ${blurValues[blur]} ${glowColor}20`,
            `0 0 ${blurValues[blur]} ${glowColor}60`,
            `0 0 ${blurValues[blur]} ${glowColor}20`,
          ],
        };
      case 'rotate':
        return {
          background: [
            `conic-gradient(from 0deg, ${glowColor}, ${secondaryColor}, ${tertiaryColor}, ${glowColor})`,
            `conic-gradient(from 360deg, ${glowColor}, ${secondaryColor}, ${tertiaryColor}, ${glowColor})`,
          ],
        };
      case 'colorShift':
        return {
          boxShadow: [
            `0 0 ${blurValues[blur]} ${colors[0]}60`,
            `0 0 ${blurValues[blur]} ${colors[1] || colors[0]}60`,
            `0 0 ${blurValues[blur]} ${colors[2] || colors[0]}60`,
            `0 0 ${blurValues[blur]} ${colors[0]}60`,
          ],
        };
      case 'flowHorizontal':
        return {
          background: [
            `linear-gradient(90deg, ${glowColor}00, ${glowColor}80, ${secondaryColor}80, ${glowColor}00)`,
            `linear-gradient(90deg, ${glowColor}00, ${secondaryColor}80, ${tertiaryColor}80, ${glowColor}00)`,
            `linear-gradient(90deg, ${glowColor}00, ${tertiaryColor}80, ${glowColor}80, ${glowColor}00)`,
          ],
          backgroundSize: ['200% 100%', '200% 100%', '200% 100%'],
          backgroundPosition: ['-100% 0%', '0% 0%', '100% 0%'],
        };
      default:
        return {
          boxShadow: `0 0 ${blurValues[blur]} ${glowColor}60`,
        };
    }
  };

  const transitionConfig = {
    duration,
    repeat: mode === 'static' ? 0 : Infinity,
    ease: mode === 'rotate' ? 'linear' : [0.25, 0.46, 0.45, 0.94],
    repeatType: 'reverse' as const,
  };

  if (mode === 'rotate' || mode === 'flowHorizontal') {
    return (
      <div className={classNames('relative', className)}>
        <motion.div
          className="absolute inset-0 rounded-lg opacity-75"
          animate={getAnimation()}
          transition={transitionConfig}
          style={{
            filter: `blur(${parseInt(blurValues[blur]) / 2}px)`,
          }}
        />
        {children && (
          <div className="relative bg-bolt-elements-background-depth-2 backdrop-blur rounded-lg">
            {children}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={classNames('relative', className)}>
      <motion.div
        className="absolute inset-0 rounded-lg"
        animate={getAnimation()}
        transition={transitionConfig}
        style={{
          scale,
          filter: `blur(${parseInt(blurValues[blur]) / 4}px)`,
        }}
      />
      {children}
    </div>
  );
};