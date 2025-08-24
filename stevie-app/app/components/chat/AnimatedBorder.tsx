import React from 'react';
import { GlowEffect } from '~/components/core/GlowEffect';

interface AnimatedBorderProps {
  children: React.ReactNode;
  isActive?: boolean;
}

export const AnimatedBorder: React.FC<AnimatedBorderProps> = ({ children, isActive = true }) => {
  return (
    <GlowEffect
      colors={['#9333ea', '#ec4899', '#06b6d4', '#10b981']}
      mode={isActive ? 'rotate' : 'static'}
      blur='soft'
      duration={8}
      scale={0.98}
      className="relative"
    >
      <div className="relative bg-zinc-900/90 backdrop-blur-xl rounded-lg border border-zinc-700/50">
        {children}
      </div>
    </GlowEffect>
  );
};