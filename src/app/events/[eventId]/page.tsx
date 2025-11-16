'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { notFound, useRouter } from 'next/navigation';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { CommunityEvent, getCommunityEvent } from '@/lib/firebaseEvents';
import React from 'react';
import { db } from '@/lib/firebaseClient';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Calendar, MapPin, User, Users, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/firebaseAuth';
import { SpotlightBackground } from '@/components/spotlight-background';
import { toast } from 'sonner';

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
  const { user } = useAuth();
  const router = useRouter();

  const { eventId } = React.use(params);

  const isOwner = user?.uid === communityEvent?.owner;
  const isAttending = user && communityEvent?.attendees?.includes(user.uid);

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

  const handleRSVP = async (isUnRSVP = false) => {
    if (!user || !communityEvent) {
      toast.error('Please sign in to RSVP to events');
      return;
    }

    if (isOwner) {
      toast.error('You are the organizer of this event!');
      return;
    }

    const isCurrentlyAttending = communityEvent.attendees?.includes(user.uid);

    if (isCurrentlyAttending && !isUnRSVP) {
      toast.error('You are already attending this event!');
      return;
    }

    if (!isCurrentlyAttending && isUnRSVP) {
      toast.error('You are not attending this event!');
      return;
    }

    try {
      const eventRef = doc(db, 'Events', communityEvent.id);
      const userRef = doc(db, 'Users', user.uid);

      if (isUnRSVP) {
        const updatedAttendees =
          communityEvent.attendees?.filter((id: string) => id !== user.uid) ||
          [];
        await updateDoc(eventRef, {
          attendees: updatedAttendees,
        });

        await updateDoc(userRef, {
          rsvpEvents: arrayRemove(communityEvent.id),
        });

        setEvents({
          ...communityEvent,
          attendees: updatedAttendees,
        });

        toast.success('Successfully removed RSVP!');
      } else {
        await updateDoc(eventRef, {
          attendees: arrayUnion(user.uid),
        });

        await updateDoc(userRef, {
          rsvpEvents: arrayUnion(communityEvent.id),
        });

        setEvents({
          ...communityEvent,
          attendees: [...(communityEvent.attendees || []), user.uid],
        });

        toast.success("Successfully RSVP'd to event!");
      }
    } catch (error) {
      console.error('Error updating RSVP:', error);
      toast.error('Failed to update RSVP. Please try again.');
    }
  };

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
      })
    : 'TBD';

  const formattedTime = communityEvent.date
    ? `${new Date(communityEvent.date).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}${communityEvent.endTime ? ` - ${new Date(communityEvent.endTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      })}` : ''}`
    : '';

  return (
    <SpotlightBackground>
      <main className="min-h-screen pt-20 md:pt-28 pb-8 px-4 md:px-6">
        <div className="max-w-4xl mx-auto w-full">
          {/* Back Button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-4"
          >
            <Button
              variant="ghost"
              onClick={() => router.back()}
              className="gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </motion.div>

          {/* Single Floating Island Container */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-background/70 backdrop-blur-xl rounded-xl md:rounded-2xl border border-border shadow-lg p-4 md:p-6 relative z-20 w-full"
          >
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-4 md:mb-6">
              <InfoBlock
                label="Date"
                value={formattedDate}
                icon={<Calendar className="w-3.5 h-3.5" />}
              />
              {formattedTime && (
                <InfoBlock
                  label="Time"
                  value={formattedTime}
                  icon={<Calendar className="w-3.5 h-3.5" />}
                />
              )}
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

            {/* Action Buttons */}
            {user && (
              <div className="flex flex-col gap-3 mb-6">
                {isOwner ? (
                  <div className="flex gap-2">
                    <Button
                      className="flex-1 bg-[#ffe3b3] text-[#028174] hover:bg-[#ffd89d] font-semibold"
                      disabled
                    >
                      Your Event
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/map?event=${communityEvent.id}`)}
                      className="border-[#028174]/30 hover:bg-[#028174]/10 hover:border-[#028174]/50"
                    >
                      <MapPin className="h-4 w-4 mr-2 text-[#028174]" />
                      View on Map
                    </Button>
                  </div>
                ) : isAttending ? (
                  <>
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-[#028174] hover:bg-[#026d60] text-white font-semibold"
                        disabled
                      >
                        ✓ Attending
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => router.push(`/map?event=${communityEvent.id}`)}
                        className="border-[#028174]/30 hover:bg-[#028174]/10 hover:border-[#028174]/50"
                      >
                        <MapPin className="h-4 w-4 mr-2 text-[#028174]" />
                        View on Map
                      </Button>
                    </div>
                    <Button
                      onClick={() => handleRSVP(true)}
                      variant="outline"
                      className="w-full font-medium border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                    >
                      Remove RSVP
                    </Button>
                  </>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleRSVP(false)}
                      className="flex-1 bg-[#ff4958] hover:bg-[#d63e4b] text-white font-semibold"
                    >
                      RSVP to Event
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => router.push(`/map?event=${communityEvent.id}`)}
                      className="border-[#028174]/30 hover:bg-[#028174]/10 hover:border-[#028174]/50"
                    >
                      <MapPin className="h-4 w-4 mr-2 text-[#028174]" />
                      View on Map
                    </Button>
                  </div>
                )}
              </div>
            )}

            {!user && (
              <div className="mb-6">
                <Button
                  onClick={() => toast.error('Please sign in to RSVP to events')}
                  className="w-full bg-[#ff4958] hover:bg-[#d63e4b] text-white font-semibold"
                >
                  Sign in to RSVP
                </Button>
              </div>
            )}

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
          </motion.div>
        </div>
      </main>
    </SpotlightBackground>
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
