import React from 'react';
import { motion } from 'framer-motion';
import { classNames } from '~/utils/classNames';

export interface TextEffectProps {
  children: React.ReactNode;
  per?: 'word' | 'char';
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  preset?: 'slide' | 'fade' | 'fade-in-blur' | 'scale' | 'bounce';
  delay?: number;
  trigger?: boolean;
}

export const TextEffect: React.FC<TextEffectProps> = ({
  children,
  per = 'word',
  as: Component = 'div',
  className = '',
  preset = 'fade',
  delay = 0,
  trigger = true,
}) => {
  const text = typeof children === 'string' ? children : String(children);
  
  const segments = per === 'word' ? text.split(' ') : text.split('');

  const getPresetAnimation = () => {
    switch (preset) {
      case 'slide':
        return {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
        };
      case 'fade-in-blur':
        return {
          initial: { opacity: 0, filter: 'blur(10px)' },
          animate: { opacity: 1, filter: 'blur(0px)' },
        };
      case 'scale':
        return {
          initial: { opacity: 0, scale: 0.8 },
          animate: { opacity: 1, scale: 1 },
        };
      case 'bounce':
        return {
          initial: { opacity: 0, y: -10 },
          animate: { opacity: 1, y: 0 },
        };
      default: // fade
        return {
          initial: { opacity: 0 },
          animate: { opacity: 1 },
        };
    }
  };

  const { initial, animate } = getPresetAnimation();

  const transition = {
    duration: 0.6,
    ease: [0.25, 0.46, 0.45, 0.94],
    type: preset === 'bounce' ? 'spring' : 'tween',
    bounce: preset === 'bounce' ? 0.4 : undefined,
  };

  return (
    <Component className={className}>
      {segments.map((segment, index) => (
        <motion.span
          key={index}
          initial={initial}
          animate={trigger ? animate : initial}
          transition={{
            ...transition,
            delay: delay + index * 0.1,
          }}
          className="inline-block"
          style={{ marginRight: per === 'word' ? '0.25em' : '0' }}
        >
          {segment}
        </motion.span>
      ))}
    </Component>
  );
};