import React from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';

export interface TextShimmerProps {
  children: React.ReactNode;
  className?: string;
  duration?: number;
  delay?: number;
  as?: keyof JSX.IntrinsicElements;
}

export const TextShimmer: React.FC<TextShimmerProps> = ({
  children,
  className = '',
  duration = 3,
  delay = 0,
  as: Component = 'div',
}) => {
  return (
    <Component className={classNames('relative', className)}>
      <span className="relative z-10">{children}</span>
    </Component>
  );
};