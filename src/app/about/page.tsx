'use client';

import { motion } from 'framer-motion';
import {
  MapPin,
  Users,
  Calendar,
  Sparkles,
  Github,
  Linkedin,
  Twitter,
} from 'lucide-react';
import { Footer } from '@/components/footer';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { HeroIcon } from '@/components/hero-icon';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import Image from 'next/image';

// EDITABLE CREATORS DATA
const creators = [
  {
    name: 'John Doe',
    role: 'Co-Founder & CEO',
    bio: 'Passionate about building communities and bringing people together through technology.',
    avatar: 'https://github.com/shadcn.png',
    socials: {
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
      twitter: 'https://twitter.com',
    },
  },
  {
    name: 'Jane Smith',
    role: 'Co-Founder & CTO',
    bio: 'Full-stack developer with a love for creating meaningful digital experiences.',
    avatar: 'https://github.com/shadcn.png',
    socials: {
      github: 'https://github.com',
      linkedin: 'https://linkedin.com',
    },
  },
  {
    name: 'Alex Johnson',
    role: 'Design Lead',
    bio: 'Designer focused on creating intuitive and beautiful user experiences.',
    avatar: 'https://github.com/shadcn.png',
    socials: {
      linkedin: 'https://linkedin.com',
      twitter: 'https://twitter.com',
    },
  },
];

// EDITABLE FAQ DATA
const faqs = [
  {
    question: 'What is Gather Point?',
    answer:
      'Gather Point is a platform that helps people discover local events, join communities, and build meaningful connections in their area. We make it easy to find like-minded individuals and create experiences together.',
  },
  {
    question: 'How do I create an event?',
    answer:
      'Once you sign up and log in, you can create an event by clicking on the "Create Event" button. Fill in the details like title, description, location, and time. Your event will then appear on the map for others to discover and join.',
  },
  {
    question: 'Is Gather Point free to use?',
    answer:
      'Yes! Gather Point is completely free to use. You can discover events, join communities, and create your own gatherings without any cost.',
  },
  {
    question: 'How do I find events near me?',
    answer:
      "Navigate to the map page where you can see all events and communities in your area. You can filter by category, distance, and date to find exactly what you're looking for.",
  },
  {
    question: 'Can I join multiple communities?',
    answer:
      "Absolutely! There's no limit to how many communities you can join. Explore different interests and connect with various groups of people in your area.",
  },
  {
    question: 'How do I contact the Gather Point team?',
    answer:
      "You can reach out to us through the contact page or email us directly. We're always happy to hear feedback, answer questions, or help with any issues you might encounter.",
  },
];

export default function AboutPage() {
  const features = [
    {
      icon: MapPin,
      title: 'Discover Local',
      description:
        'Find events, communities, and experiences happening right in your neighborhood.',
    },
    {
      icon: Users,
      title: 'Connect',
      description:
        'Join communities of like-minded people and build meaningful relationships.',
    },
    {
      icon: Calendar,
      title: 'Create Events',
      description:
        'Organize your own events and bring people together around shared interests.',
    },
    {
      icon: Sparkles,
      title: 'Experience More',
      description:
        'Step out of your comfort zone and discover new passions and friendships.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background Spotlights - Applied to entire page */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="spotlight spotlight-left" />
        <div className="spotlight spotlight-mid" />
        <div className="spotlight spotlight-right" />
      </div>

      {/* Hero Section with Centered Icon */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden py-20">
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12 items-center">
            {/* Left Section - Where Communities Connect */}
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center lg:text-right space-y-6"
            >
              <h1 className="text-3xl md:text-5xl font-bold bg-linear-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
                Where Communities Connect
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground">
                Bringing people together through shared experiences and
                meaningful connections.
              </p>
            </motion.div>

            {/* Center - Hero Icon */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="flex justify-center"
            >
              <HeroIcon />
            </motion.div>

            {/* Right Section - Our Mission */}
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-center lg:text-left space-y-6"
            >
              <h2 className="text-3xl md:text-5xl font-bold bg-linear-to-l from-primary via-secondary to-accent bg-clip-text text-transparent">
                Our Mission
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground">
                In an increasingly digital world, we're on a mission to help
                people rediscover the joy of in-person connections.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Our Story Section */}
      <section className="relative py-20 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              Our Story
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="space-y-6 text-lg text-muted-foreground leading-relaxed"
          >
            <p>
              Gather Point was born from a simple observation: despite living in
              vibrant cities surrounded by thousands of people, many of us feel
              disconnected. We spend hours scrolling through social media, yet
              struggle to find genuine community in real life.
            </p>
            <p>
              Our founders experienced this firsthand. After moving to a new
              city, they found it surprisingly difficult to meet people who
              shared their interests. The few platforms that existed were either
              too focused on dating or felt corporate and impersonal. They
              wanted something different—a space designed purely for building
              community and creating shared experiences.
            </p>
            <p>
              So they built Gather Point. A platform where anyone can discover
              what's happening around them, connect with people who share their
              passions, and create the kinds of experiences that turn neighbors
              into friends. Whether it's a weekend hiking group, a book club, a
              coding workshop, or a neighborhood potluck, Gather Point makes it
              easy to find your people and do what you love together.
            </p>
            <p>
              Today, we're proud to help thousands of people rediscover the joy
              of in-person connection. Every event created, every community
              formed, and every friendship made on our platform reminds us why
              we started this journey. We're not just building technology—we're
              rebuilding the social fabric of our communities, one gathering at
              a time.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}

      {/* Creators Section */}
      <section className="relative py-20 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
              Meet the Creators
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              The passionate team behind Gather Point, dedicated to bringing
              communities together.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {creators.map((creator, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
              >
                <Card className="h-full hover:shadow-lg transition-all duration-300">
                  <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                      <Avatar className="h-24 w-24">
                        <AvatarImage src={creator.avatar} alt={creator.name} />
                        <AvatarFallback className="text-2xl">
                          {creator.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <CardTitle className="text-xl">{creator.name}</CardTitle>
                    <CardDescription className="text-primary font-medium">
                      {creator.role}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm text-center">
                      {creator.bio}
                    </p>
                    <div className="flex justify-center gap-3">
                      {creator.socials.github && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="hover:text-primary cursor-pointer"
                        >
                          <a
                            href={creator.socials.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="GitHub"
                          >
                            <Github className="h-5 w-5" />
                          </a>
                        </Button>
                      )}
                      {creator.socials.linkedin && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="hover:text-primary cursor-pointer"
                        >
                          <a
                            href={creator.socials.linkedin}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="LinkedIn"
                          >
                            <Linkedin className="h-5 w-5" />
                          </a>
                        </Button>
                      )}
                      {creator.socials.twitter && (
                        <Button
                          variant="ghost"
                          size="icon"
                          asChild
                          className="hover:text-primary cursor-pointer"
                        >
                          <a
                            href={creator.socials.twitter}
                            target="_blank"
                            rel="noopener noreferrer"
                            aria-label="Twitter"
                          >
                            <Twitter className="h-5 w-5" />
                          </a>
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="relative py-20 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">
              Frequently Asked Questions
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Got questions? We've got answers.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="border border-border/50 rounded-lg px-6 hover:border-primary/30 transition-colors"
                >
                  <AccordionTrigger className="text-left text-base md:text-lg font-semibold hover:no-underline py-5">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground pb-5 leading-relaxed">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
