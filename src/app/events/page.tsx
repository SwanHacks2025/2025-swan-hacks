'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebaseClient';

import { onAuthStateChanged, User } from 'firebase/auth';
import {
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

import { CommunityEvent, fetchCommunityEvents } from '@/lib/firebaseEvents';
import { suggestEvents } from '@/lib/geminiSuggestService';
import { EventCard } from '@/components/event-card';
import { EventDialog } from '@/components/event-create';
import { useEventFilter } from '@/context/EventFilterContext';
import { Button } from '@/components/ui/button';
import { Filter, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';

export default function EventPage() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [suggestedEvents, setSuggestedEvents] = useState<CommunityEvent[]>([]);
  const [suggestedEventsLoading, setSuggestedEventsLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventHosts, setEventHosts] = useState<Map<string, string>>(new Map());

  const { dateRange, setDateRange, selectedFilters, toggleFilter, filters } =
    useEventFilter();

  // Listen for auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'Users', firebaseUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data() as { Username?: string };
        setUsername(data.Username || firebaseUser.displayName || '');
      } else {
        setUsername(firebaseUser.displayName || '');
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);

  useEffect(() => {
    fetchCommunityEvents()
      .then((events: CommunityEvent[]) => {
        return events.filter((e) => {
          // --- Filter 1: Date Range ---
          if (dateRange?.from || dateRange?.to) {
            const time = e.date.getTime();
            const from = dateRange.from?.getTime() ?? -Infinity;
            const to = dateRange.to?.getTime() ?? Infinity;
            if (time <= from || time >= to) return false;
          }

          // --- Filter 2: Category ---
          const categoryFilters = selectedFilters['Category'];
          if (categoryFilters && categoryFilters.size > 0) {
            if (e.category && !categoryFilters.has(e.category.toString())) {
              return false;
            } else if (!e.category) {
              return false;
            }
          }

          // --- Filter 3: Attendance (only if user is logged in) ---
          if (user) {
            const attendanceFilters = selectedFilters['Attendance'];
            if (attendanceFilters && attendanceFilters.size > 0) {
              const isOwner = e.owner === user.uid;
              const isAttendee = e.attendees
                ? e.attendees.includes(user.uid)
                : false;

              if (
                attendanceFilters.has('Organizing') &&
                attendanceFilters.has('Attendee')
              ) {
                return isOwner || isAttendee;
              } else if (attendanceFilters.has('Organizing')) {
                return isOwner;
              } else if (attendanceFilters.has('Attendee')) {
                return isAttendee;
              }

              return false;
            }
          }

          return true;
        });
      })
      .then(setEvents)
      .catch(console.error)
      .finally(() => setEventsLoading(false));
  }, [user, dateRange, selectedFilters]);

  // Function to fetch suggested events
  const fetchSuggestedEvents = async () => {
    if (!user) {
      setSuggestedEvents([]);
      return;
    }

    setSuggestedEventsLoading(true);
    try {
      const response = await suggestEvents(user.uid);
      if (response.error) {
        console.error('Error fetching suggestions:', response.error);
        setSuggestedEvents([]);
        return;
      }

      // Convert the response events to CommunityEvent objects
      const events = response.events.map((e: any) => {
        const eventDate = e.date ? new Date(e.date) : new Date();
        const eventEndTime = e.endTime ? new Date(e.endTime) : undefined;

        return {
          id: e.id,
          name: e.name,
          description: e.description || '',
          category: e.category,
          lat: e.lat,
          long: e.long,
          location: e.location || '',
          date: eventDate,
          endTime: eventEndTime,
          owner: e.owner,
          attendees: e.attendees || [],
          tags: e.tags || [],
          imageUri: e.imageUri || '',
          modelUri: e.modelUri || '',
        } as CommunityEvent;
      });

      setSuggestedEvents(events);
    } catch (error) {
      console.error('Error fetching suggested events:', error);
      setSuggestedEvents([]);
    } finally {
      setSuggestedEventsLoading(false);
    }
  };

  // Fetch suggested events on mount and when user changes
  useEffect(() => {
    fetchSuggestedEvents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Fetch host names for search
  useEffect(() => {
    const fetchHostNames = async () => {
      const hostsMap = new Map<string, string>();
      for (const event of events) {
        if (event.owner && !hostsMap.has(event.id)) {
          try {
            const userRef = doc(db, 'Users', event.owner);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data();
              hostsMap.set(
                event.id,
                userData.Username || userData.displayName || 'Unknown'
              );
            } else {
              hostsMap.set(event.id, 'Unknown');
            }
          } catch (error) {
            console.error('Error fetching host name:', error);
            hostsMap.set(event.id, 'Unknown');
          }
        }
      }
      setEventHosts(hostsMap);
    };
    if (events.length > 0) {
      fetchHostNames();
    }
  }, [events]);

  // Search filter function
  const searchFilter = (event: CommunityEvent) => {
    if (!searchQuery.trim()) return true;

    const searchWords = searchQuery.toLowerCase().trim().split(/\s+/);
    const eventName = event.name?.toLowerCase() || '';
    const hostName = eventHosts.get(event.id)?.toLowerCase() || '';

    return searchWords.some(
      (word) => eventName.includes(word) || hostName.includes(word)
    );
  };

  const handleRSVP = async (eventId: string, isUnRSVP = false) => {
    if (!user) {
      toast.error('Please sign in to RSVP to events');
      return;
    }

    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    // Check if user is the owner
    if (event.owner === user.uid) {
      toast.error('You are the organizer of this event!');
      return;
    }

    const isAttending = event.attendees?.includes(user.uid);

    // If already attending and not trying to un-RSVP, show message
    if (isAttending && !isUnRSVP) {
      toast.error('You are already attending this event!');
      return;
    }

    // If not attending and trying to un-RSVP, show message
    if (!isAttending && isUnRSVP) {
      toast.error('You are not attending this event!');
      return;
    }

    try {
      const eventRef = doc(db, 'Events', eventId);
      const userRef = doc(db, 'Users', user.uid);

      if (isUnRSVP) {
        // Remove user from attendees
        const updatedAttendees =
          event.attendees?.filter((id) => id !== user.uid) || [];
        await updateDoc(eventRef, {
          attendees: updatedAttendees,
        });

        // Remove event from user's rsvpEvents array
        await updateDoc(userRef, {
          rsvpEvents: arrayRemove(eventId),
        });

        // Update local state
        setEvents((prevEvents) =>
          prevEvents.map((e) =>
            e.id === eventId ? { ...e, attendees: updatedAttendees } : e
          )
        );

        toast.success('Successfully removed RSVP!');
      } else {
        // Add user to attendees
        await updateDoc(eventRef, {
          attendees: arrayUnion(user.uid),
        });

        // Add event to user's rsvpEvents array
        await updateDoc(userRef, {
          rsvpEvents: arrayUnion(eventId),
        });

        // Update local state
        setEvents((prevEvents) =>
          prevEvents.map((e) =>
            e.id === eventId
              ? { ...e, attendees: [...(e.attendees || []), user.uid] }
              : e
          )
        );

        toast.success("Successfully RSVP'd to event!");

        // Refresh suggested events after RSVP
        fetchSuggestedEvents();
      }
    } catch (error) {
      console.error('Error updating RSVP:', error);
      toast.error('Failed to update RSVP. Please try again.');
    }
  };

  // Separate and sort events (with search filter)
  const myEvents = user
    ? events
        .filter((e) => e.owner === user.uid || e.attendees?.includes(user.uid))
        .filter(searchFilter)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  // Suggested events (filtered by search)
  const filteredSuggestedEvents = suggestedEvents.filter(searchFilter);

  // Other events (excluding my events, but including suggested events for cross-listing)
  const otherEvents = user
    ? events
        .filter((e) => e.owner !== user.uid && !e.attendees?.includes(user.uid))
        .filter(searchFilter)
        .concat(
          filteredSuggestedEvents.filter(
            (se) =>
              // Only add suggested events that aren't already in the main events list
              !events.some((e) => e.id === se.id)
          )
        )
    : events
        .filter(searchFilter)
        .concat(
          filteredSuggestedEvents.filter(
            (se) => !events.some((e) => e.id === se.id)
          )
        );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#028174]/10 via-background to-[#028174]/5">
      <div className="pt-20 mx-auto max-w-[80%]">
        <header className="flex h-16 shrink-0 items-center justify-between gap-4 px-4 pt-6 lg:px-6 rounded-t-lg">
          {/* Search Input */}
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by event name or host..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Button */}
            <Dialog open={isFilterOpen} onOpenChange={setIsFilterOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  className="font-medium cursor-pointer"
                >
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Filter Events</DialogTitle>
                  <DialogDescription>
                    Refine your event search
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                  {/* Date Range Picker */}
                  <div>
                    <Label className="text-sm font-semibold mb-3 block">
                      Date Range
                    </Label>
                    <div className="flex justify-center">
                      <Calendar
                        mode="range"
                        selected={dateRange}
                        onSelect={setDateRange}
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        className="rounded-md border w-full"
                      />
                    </div>
                    {dateRange?.from && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2"
                        onClick={() => setDateRange(undefined)}
                      >
                        Clear Date Filter
                      </Button>
                    )}
                  </div>

                  {/* Category & Attendance Filters */}
                  {filters.map((filter) => (
                    <div key={filter.name}>
                      <Label className="text-sm font-semibold mb-3 block">
                        {filter.name}
                      </Label>
                      <div className="space-y-2 grid grid-cols-2 @xl/main:grid-cols-2 @4xl/main:grid-cols-2">
                        {filter.items.map((item) => {
                          const isActive =
                            selectedFilters[filter.name]?.has(item);
                          return (
                            <div
                              key={item}
                              className="flex items-center space-x-2"
                            >
                              <Checkbox
                                id={`${filter.name}-${item}`}
                                checked={isActive}
                                onCheckedChange={() =>
                                  toggleFilter(filter.name, item)
                                }
                              />
                              <label
                                htmlFor={`${filter.name}-${item}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {item}
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Create Event Button */}
            {user && <EventDialog />}
          </div>
        </header>

        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col">
            {eventsLoading ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">Loading events…</p>
              </div>
            ) : events.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <p className="text-muted-foreground">
                  No events found. Try adjusting your filters.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-8 py-6 px-4 lg:px-6">
                {/* My Events Section */}
                {myEvents.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                  >
                    <motion.div
                      className="mb-6"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                    >
                      <h2 className="text-2xl font-bold text-foreground mb-1">
                        My Events
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {myEvents.length}{' '}
                        {myEvents.length === 1 ? 'event' : 'events'} you're
                        attending or organizing
                      </p>
                    </motion.div>
                    <div className="grid grid-cols-1 gap-3 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                      {myEvents.map((e, index) => (
                        <motion.div
                          key={e.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: index * 0.05 }}
                        >
                          <EventCard
                            event={e}
                            user={user}
                            onRSVP={handleRSVP}
                            compact
                          />
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Suggested Events Section */}
                {user && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                  >
                    <motion.div
                      className="mb-6"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                    >
                      <h2 className="text-2xl font-bold text-foreground mb-1">
                        AI Suggested Events
                      </h2>
                      {suggestedEventsLoading ? (
                        <p className="text-sm text-muted-foreground">
                          Loading suggestions...
                        </p>
                      ) : filteredSuggestedEvents.length > 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {filteredSuggestedEvents.length}{' '}
                          {filteredSuggestedEvents.length === 1
                            ? 'event'
                            : 'events'}{' '}
                          based on your interests
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          RSVP to some events to get personalized suggestions!
                        </p>
                      )}
                    </motion.div>
                    {filteredSuggestedEvents.length > 0 && (
                      <div className="grid grid-cols-1 gap-3 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                        {filteredSuggestedEvents.map((e, index) => (
                          <motion.div
                            key={e.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{
                              duration: 0.4,
                              delay: 0.3 + index * 0.05,
                            }}
                          >
                            <EventCard
                              event={e}
                              user={user}
                              onRSVP={handleRSVP}
                              compact
                            />
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Discover Events Section */}
                <motion.div
                  className="mb-12"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.4 }}
                >
                  <motion.div
                    className="mb-6"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                  >
                    <h2 className="text-2xl font-bold text-foreground mb-1">
                      {myEvents.length > 0 ? 'Discover Events' : 'All Events'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {otherEvents.length}{' '}
                      {otherEvents.length === 1 ? 'event' : 'events'} available
                    </p>
                  </motion.div>
                  <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
                    {otherEvents.map((e, index) => (
                      <motion.div
                        key={e.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: 0.4,
                          delay: 0.5 + index * 0.05,
                        }}
                      >
                        <EventCard event={e} user={user} onRSVP={handleRSVP} />
                      </motion.div>
                    ))}
                  </div>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
