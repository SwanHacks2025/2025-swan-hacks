'use client';

import React from 'react';
import { motion } from 'framer-motion';

// Individual Spotlight element
const Spotlight = ({
  className,
  ...props
}: {
  className?: string;
  [key: string]: any;
}) => {
  return <motion.div className={`spotlight ${className}`} {...props} />;
};

// SpotlightBackground container
const SpotlightBackground = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="spotlight-container">
      <div className="spotlight-overlay">
        <Spotlight
          initial={{ x: -200, y: -200 }}
          animate={{
            x: [-200, 100, -300, -200],
            y: [-200, 50, -100, -200],
          }}
          transition={{
            duration: 20,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          className="spotlight-left"
        />

        <Spotlight
          initial={{ x: '-50%', y: '-50%' }}
          animate={{
            x: ['-50%', '-30%', '-70%', '-50%'],
            y: ['-50%', '-30%', '-70%', '-50%'],
          }}
          transition={{
            duration: 25,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
            delay: 2,
          }}
          className="spotlight-mid"
        />

        <Spotlight
          initial={{ x: -200, y: -200 }}
          animate={{
            x: [-200, -400, 100, -200],
            y: [-200, 100, -300, -200],
          }}
          transition={{
            duration: 22,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
            delay: 4,
          }}
          className="spotlight-right"
        />
      </div>

      <div className="spotlight-content">{children}</div>
    </div>
  );
};

export { SpotlightBackground };
