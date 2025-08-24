import React from 'react';
import { motion } from 'framer-motion';
import { GlowEffect } from '~/components/core/GlowEffect';
import { classNames } from '~/utils/classNames';

export interface GlowButtonProps {
  children: React.ReactNode;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'accent' | 'success';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  glowColors?: string[];
  icon?: React.ReactNode;
}

export const GlowButton: React.FC<GlowButtonProps> = ({
  children,
  onClick,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  glowColors,
  icon,
}) => {
  const getVariantColors = () => {
    switch (variant) {
      case 'primary':
        return ['#9333ea', '#3b82f6'];
      case 'secondary':
        return ['#6b7280', '#374151'];
      case 'accent':
        return ['#ec4899', '#f59e0b'];
      case 'success':
        return ['#10b981', '#059669'];
      default:
        return ['#9333ea', '#3b82f6'];
    }
  };

  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white';
      case 'secondary':
        return 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-600';
      case 'accent':
        return 'bg-gradient-to-r from-pink-600 to-orange-500 hover:from-pink-500 hover:to-orange-400 text-white';
      case 'success':
        return 'bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white';
      default:
        return 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-4 py-2 text-sm h-9';
      case 'md':
        return 'px-6 py-3 text-sm h-10';
      case 'lg':
        return 'px-8 py-3 text-base h-12';
      default:
        return 'px-6 py-3 text-sm h-10';
    }
  };

  const colors = glowColors || getVariantColors();

  return (
    <div className="relative">
      <GlowEffect
        colors={colors}
        mode={disabled ? 'static' : 'pulse'}
        blur='soft'
        duration={3}
        scale={0.95}
      />
      <motion.button
        onClick={onClick}
        disabled={disabled}
        className={classNames(
          'relative rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-2',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          getVariantClasses(),
          getSizeClasses(),
          className
        )}
        whileHover={!disabled ? { scale: 1.05 } : {}}
        whileTap={!disabled ? { scale: 0.95 } : {}}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {icon && <span className="flex-shrink-0">{icon}</span>}
        <span>{children}</span>
      </motion.button>
    </div>
  );
};