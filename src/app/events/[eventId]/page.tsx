'use client';

import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CommunityEvent, getCommunityEvent } from '@/lib/firebaseEvents';
import React from 'react';
import { db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import { Calendar, MapPin, User, Users } from 'lucide-react';

export default function EventPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const [loading, setLoading] = useState(true);
  const [communityEvent, setEvents] = useState<CommunityEvent>();
  const [ownerName, setOwnerName] = useState<string>('');
  const [attendeeNames, setAttendeeNames] = useState<Map<string, string>>(
    new Map()
  );

  const { eventId } = React.use(params);

  useEffect(() => {
    getCommunityEvent(eventId)
      .then((e) => {
        if (e) {
          setEvents(e);
        } else {
          console.warn('Event not found');
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId]);

  // Fetch owner name
  useEffect(() => {
    const fetchOwnerName = async () => {
      if (communityEvent?.owner) {
        try {
          const userRef = doc(db, 'Users', communityEvent.owner);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setOwnerName(
              userData.Username || userData.displayName || 'Unknown'
            );
          } else {
            setOwnerName('Unknown');
          }
        } catch (error) {
          console.error('Error fetching owner name:', error);
          setOwnerName('Unknown');
        }
      }
    };
    fetchOwnerName();
  }, [communityEvent?.owner]);

  // Fetch attendee names
  useEffect(() => {
    const fetchAttendeeNames = async () => {
      if (communityEvent?.attendees && communityEvent.attendees.length > 0) {
        const namesMap = new Map<string, string>();
        for (const attendeeId of communityEvent.attendees) {
          try {
            const userRef = doc(db, 'Users', attendeeId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              namesMap.set(
                attendeeId,
                userData.Username || userData.displayName || 'Unknown'
              );
            } else {
              namesMap.set(attendeeId, 'Unknown');
            }
          } catch (error) {
            console.error('Error fetching attendee name:', error);
            namesMap.set(attendeeId, 'Unknown');
          }
        }
        setAttendeeNames(namesMap);
      }
    };
    fetchAttendeeNames();
  }, [communityEvent?.attendees]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading event…</p>
      </div>
    );
  }
  if (!communityEvent) return notFound();

  const formattedDate = communityEvent.date
    ? new Date(communityEvent.date).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : 'TBD';

  return (
    <div
      className="spotlight-container relative"
      style={{ minHeight: '100vh', height: '100vh' }}
    >
      {/* Spotlight Background Overlay */}
      <div className="spotlight-overlay fixed inset-0 pointer-events-none z-0">
        <motion.div
          initial={{ x: 200, y: 100 }}
          animate={{
            x: [200, 400, 100, 200],
            y: [100, 200, 50, 100],
          }}
          transition={{
            duration: 18,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
          }}
          className="spotlight spotlight-left absolute rounded-full will-change-transform"
          style={{
            width: '1000px',
            height: '1000px',
            filter: 'blur(100px)',
            opacity: 0.35,
            background:
              'radial-gradient(circle, rgba(2, 129, 116, 0.15) 0%, rgba(2, 129, 116, 0.1) 25%, rgba(2, 129, 116, 0.05) 50%, transparent 70%)',
          }}
        />

        <motion.div
          initial={{ x: '80%', y: '20%' }}
          animate={{
            x: ['80%', '60%', '90%', '80%'],
            y: ['20%', '40%', '10%', '20%'],
          }}
          transition={{
            duration: 22,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
            delay: 1.5,
          }}
          className="spotlight spotlight-mid absolute rounded-full will-change-transform"
          style={{
            width: '1000px',
            height: '1000px',
            filter: 'blur(100px)',
            opacity: 0.35,
            background:
              'radial-gradient(circle, rgba(10, 182, 139, 0.15) 0%, rgba(10, 182, 139, 0.1) 25%, rgba(10, 182, 139, 0.05) 50%, transparent 70%)',
          }}
        />

        <motion.div
          initial={{ x: 100, y: 300 }}
          animate={{
            x: [100, -100, 300, 100],
            y: [300, 500, 200, 300],
          }}
          transition={{
            duration: 20,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
            delay: 3,
          }}
          className="spotlight spotlight-right absolute rounded-full will-change-transform"
          style={{
            width: '1000px',
            height: '1000px',
            filter: 'blur(100px)',
            opacity: 0.35,
            background:
              'radial-gradient(circle, rgba(255, 227, 179, 0.2) 0%, rgba(255, 227, 179, 0.12) 25%, rgba(255, 227, 179, 0.06) 50%, transparent 70%)',
          }}
        />
      </div>

      {/* Content with proper z-index to overlap background */}
      <main
        className="relative z-10 pt-20 md:pt-28 pb-4 md:pb-8 px-3 md:px-6 flex flex-col w-full"
        style={{ minHeight: '100vh', height: '100vh' }}
      >
        <div className="max-w-4xl mx-auto w-full flex-1 flex gap-3 md:gap-6 min-h-0 overflow-y-auto">
          {/* Single Floating Island Container */}
          <div className="bg-background/70 backdrop-blur-xl rounded-xl md:rounded-2xl border border-border shadow-lg p-4 md:p-6 relative z-20 w-full">
            {/* Header with Image and Title */}
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 mb-4 md:mb-6">
              {/* Image */}
              <div className="relative w-full md:w-48 h-48 md:h-48 rounded-xl overflow-hidden shrink-0">
                <Image
                  src={communityEvent.imageUri}
                  alt={communityEvent.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>

              {/* Title and Category */}
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold leading-tight">
                      {communityEvent.name}
                    </h1>
                    <Badge
                      variant="secondary"
                      className="text-xs md:text-sm shrink-0"
                    >
                      {communityEvent.category}
                    </Badge>
                  </div>
                  <p className="text-sm md:text-base text-muted-foreground line-clamp-3">
                    {communityEvent.description}
                  </p>
                </div>
              </div>
            </div>

            <Separator className="my-4 md:my-6" />

            {/* Info Grid - Compact */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
              <InfoBlock
                label="Date"
                value={formattedDate}
                icon={<Calendar className="w-3.5 h-3.5" />}
              />
              <InfoBlock
                label="Location"
                value={communityEvent.location}
                icon={<MapPin className="w-3.5 h-3.5" />}
              />
              <InfoBlock
                label="Organizer"
                value={ownerName}
                icon={<User className="w-3.5 h-3.5" />}
              />
            </div>

            <Separator className="my-4 md:my-6" />

            {/* Attendees - Compact */}
            <div>
              <div className="flex items-center gap-2 mb-2 md:mb-3">
                <Users className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-semibold text-sm md:text-base">
                  Attendees ({communityEvent.attendees?.length || 0})
                </h3>
              </div>
              {communityEvent.attendees &&
              communityEvent.attendees.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {communityEvent.attendees.map((attendeeId) => (
                    <Badge
                      key={attendeeId}
                      variant="outline"
                      className="text-xs"
                    >
                      {attendeeNames.get(attendeeId) || attendeeId}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-xs md:text-sm text-muted-foreground">
                  No attendees yet
                </p>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function InfoBlock({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        {icon}
        <span className="text-xs text-muted-foreground font-medium">
          {label}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground line-clamp-2">
        {value}
      </p>
    </div>
  );
}
