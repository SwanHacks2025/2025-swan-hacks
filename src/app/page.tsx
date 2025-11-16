'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SpotlightBackground } from '@/components/spotlight-background';
import { Footer } from '@/components/footer';
import { ArrowRight, Users, Calendar, Sparkles, MapPin } from 'lucide-react';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const features = [
  {
    icon: Users,
    title: 'Find Your Tribe',
    description:
      'Connect with like-minded individuals and build lasting relationships in your community.',
  },
  {
    icon: Calendar,
    title: 'Discover Events',
    description:
      'Never miss out on exciting happenings around you. Stay in the loop with local events.',
  },
  {
    icon: Sparkles,
    title: 'Create Experiences',
    description:
      'Host your own events and gatherings. Build the community you want to see.',
  },
  {
    icon: MapPin,
    title: 'Explore Locally',
    description:
      'Find clubs, meetups, and activities in your area. Your next adventure awaits.',
  },
];

// const stats = [
//   { label: 'Active Communities', value: '1,000+' },
//   { label: 'Monthly Events', value: '5,000+' },
//   { label: 'Happy Members', value: '50,000+' },
// ];

export default function Home() {
  return (
    <SpotlightBackground>
      <main className="relative">
        {/* Hero Section */}
        <section className="container mx-auto min-h-[90vh] px-6 py-24 sm:px-8 lg:px-16 flex items-center">
          <div className="grid lg:grid-cols-2 gap-12 items-center w-full">
            {/* Left Column - Content */}
            <motion.div
              initial="initial"
              animate="animate"
              variants={staggerContainer}
              className="flex flex-col space-y-8"
            >
              <motion.div variants={fadeIn} className="inline-flex">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  Where communities thrive
                </span>
              </motion.div>

              <motion.h1
                variants={fadeIn}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight text-foreground leading-[1.1] [font-family:var(--font-fugaz)]"
              >
                Gather
                <br />
                <span className="text-primary">P<span className="text-[#ff4958]">o</span>int</span>
              </motion.h1>

              <motion.p
                variants={fadeIn}
                className="text-xl sm:text-2xl text-muted-foreground max-w-xl leading-relaxed"
              >
                Find your community. Start something amazing. Join the movement
                of people creating meaningful connections.
              </motion.p>

              <motion.div
                variants={fadeIn}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button asChild size="lg" className="text-base group">
                  <Link href="/login" className="gap-2">
                    Get Started
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="text-base"
                >
                  <Link href="/map">Explore Communities</Link>
                </Button>
              </motion.div>

              {/* Stats */}
              {/* <motion.div
                variants={fadeIn}
                className="grid grid-cols-3 gap-4 pt-8 border-t border-border/50"
              >
                {stats.map((stat, index) => (
                  <div key={index} className="text-center sm:text-left">
                    <div className="text-2xl sm:text-3xl font-bold text-primary">
                      {stat.value}
                    </div>
                    <div className="text-xs sm:text-sm text-muted-foreground">
                      {stat.label}
                    </div>
                  </div>
                ))}
              </motion.div> */}
            </motion.div>

            {/* Right Column - Image/Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="relative hidden lg:flex items-center justify-center"
            >
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
                    ease: 'linear',
                  }}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background:
                      'conic-gradient(from 0deg, transparent 0%, rgba(10, 182, 139, 0.1) 50%, transparent 100%)',
                    filter: 'blur(2px)',
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
                    ease: 'easeInOut',
                  }}
                  className="relative"
                >
                  <Image
                    src="/GatherPointLogo.svg"
                    alt="Gather Point Logo"
                    width={500}
                    height={500}
                    className="w-150 h-150 relative z-10"
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
                      ease: 'easeInOut',
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
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-6 py-24 sm:px-8 lg:px-16">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={staggerContainer}
            className="space-y-16"
          >
            <motion.div variants={fadeIn} className="text-center space-y-4">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                Everything you need to connect
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Powerful tools to help you discover, create, and manage your
                community experiences.
              </p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <motion.div
                  key={index}
                  variants={fadeIn}
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  className="group relative"
                >
                  <div className="h-full p-6 rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm hover:bg-card/80 hover:border-primary/30 transition-all duration-300 space-y-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <feature.icon className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-24 sm:px-8 lg:px-16">
          <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={fadeIn}
            className="relative overflow-hidden rounded-3xl border border-border/50 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-12 lg:p-16"
          >
            <div className="relative z-10 max-w-3xl mx-auto text-center space-y-8">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                Ready to find your community?
              </h2>
              <p className="text-lg text-muted-foreground">
                Join thousands of people connecting, creating, and experiencing
                life together.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild size="lg" className="text-base group">
                  <Link href="/login" className="gap-2">
                    Start Your Journey
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="text-base group"
                >
                  <Link href="/map" className="gap-2">
                    Explore the Map
                    <MapPin className="w-4 h-4" />
                  </Link>
                </Button>
                <Button
                  asChild
                  variant="outline"
                  size="lg"
                  className="text-base"
                >
                  <Link href="/about">Learn More</Link>
                </Button>
              </div>
            </div>

            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/5 rounded-full blur-3xl" />
          </motion.div>
        </section>
      </main>
    </SpotlightBackground>
  );
}
