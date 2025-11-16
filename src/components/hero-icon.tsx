"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export function HeroIcon() {
  return (
    <div className="relative flex items-center justify-center">
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
            alt="Gather Point Logo"
            width={400}
            height={400}
            className="w-64 h-64 md:w-80 md:h-80 relative z-10"
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
    </div>
  );
}
