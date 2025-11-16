'use client';

import { SpotlightBackground } from './spotlight-background';
import { motion } from 'framer-motion';
import Image from 'next/image';
import { useState, useEffect } from 'react';

interface MapLoadingScreenProps {
  isLoading: boolean;
}

export function MapLoadingScreen({ isLoading }: MapLoadingScreenProps) {
  const [dots, setDots] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? '' : prev + '.'));
    }, 500);

    return () => clearInterval(interval);
  }, []);

  if (!isLoading) return null;

  return (
    <div className="absolute inset-0 z-50">
      <SpotlightBackground>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <div className="relative">
            {/* Glowing background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/30 to-secondary/20 rounded-full blur-3xl scale-110" />

            {/* Animated ring */}
            <motion.div
              animate={{
                rotate: 360,
              }}
              transition={{
                duration: 30,
                repeat: Infinity,
                ease: "linear",
              }}
              className="absolute inset-0 rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg, transparent 0%, rgba(10, 182, 139, 0.1) 50%, transparent 100%)",
                filter: "blur(2px)",
              }}
            />

            {/* Floating logo */}
            <motion.div
              animate={{
                y: [0, -20, 0],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="relative"
            >
              <Image
                src="/GatherPointLogo.svg"
                alt="Loading"
                width={200}
                height={200}
                className="w-32 h-32 relative z-10"
                priority
              />
            </motion.div>

            {/* Floating accent dots */}
            {[...Array(4)].map((_, i) => (
              <motion.div
                key={i}
                animate={{
                  y: [0, -15, 0],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 3 + i * 0.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: i * 0.4,
                }}
                className="absolute w-2 h-2 rounded-full bg-primary/40"
                style={{
                  left: `${20 + i * 20}%`,
                  top: `${10 + i * 15}%`,
                }}
              />
            ))}
          </div>

          <div className="text-[#ffe3b3] text-lg font-medium tracking-wide mt-8">
            Loading your map{dots}
          </div>
        </div>
      </SpotlightBackground>
    </div>
  );
}
