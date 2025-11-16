'use client';

import { useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebaseClient';

import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';

import {
  CommunityEvent,
  EventTypes,
  fetchCommunityEvents,
  getEventTypeFilename,
  communityEventConverter,
} from '@/lib/firebaseEvents';
import { suggestEvents } from '@/lib/geminiSuggestService';
import { EventCard } from '@/components/event-card';
import { useEventFilter } from '@/context/EventFilterContext';
import { Button } from '@/components/ui/button';
import { Filter, Plus, X, CalendarIcon, Search } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

export default function EventPage() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [suggestedEvents, setSuggestedEvents] = useState<CommunityEvent[]>([]);
  const [suggestedEventsLoading, setSuggestedEventsLoading] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [eventHosts, setEventHosts] = useState<Map<string, string>>(new Map());

  const { dateRange, setDateRange, selectedFilters, toggleFilter, filters } =
    useEventFilter();

  // Event creation state
  const [address, setAddress] = useState('');
  const [debouncedAddress, setDebouncedAddress] = useState('');
  const [addressResults, setAddressResults] = useState<NominatimResult[]>([]);
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [addressError, setAddressError] = useState('');
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('10:30');

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

  // Debounce address search
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedAddress(address);
    }, 800);
    return () => clearTimeout(handle);
  }, [address]);

  // Fetch address suggestions
  useEffect(() => {
    if (!debouncedAddress.trim()) {
      setAddressResults([]);
      setIsAddressOpen(false);
      return;
    }

    (async () => {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          debouncedAddress
        )}`
      );
      const data: NominatimResult[] = await res.json();
      setAddressResults(data);
      setIsAddressOpen(data.length > 0);
    })();
  }, [debouncedAddress]);

  const handleSelectAddress = (result: NominatimResult) => {
    setAddress(result.display_name);
    setLat(result.lat);
    setLon(result.lon);
    setIsAddressOpen(false);
    setAddressError('');
  };

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
      alert('Please sign in to RSVP to events');
      return;
    }

    const event = events.find((e) => e.id === eventId);
    if (!event) return;

    // Check if user is the owner
    if (event.owner === user.uid) {
      alert('You are the organizer of this event!');
      return;
    }

    const isAttending = event.attendees?.includes(user.uid);

    // If already attending and not trying to un-RSVP, show message
    if (isAttending && !isUnRSVP) {
      alert('You are already attending this event!');
      return;
    }

    // If not attending and trying to un-RSVP, show message
    if (!isAttending && isUnRSVP) {
      alert('You are not attending this event!');
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

        alert('Successfully removed RSVP!');
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

        alert("Successfully RSVP'd to event!");
        
        // Refresh suggested events after RSVP
        fetchSuggestedEvents();
      }
    } catch (error) {
      console.error('Error updating RSVP:', error);
      alert('Failed to update RSVP. Please try again.');
    }
  };

  const handleEventCreate = async (e: React.FormEvent<HTMLFormElement>) => {
    if (!user || loading) return;

    e.preventDefault();
    setAddressError('');

    // If no lat/lon, re-fetch to validate
    if (!lat || !lon) {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}`
      );
      const results: NominatimResult[] = await res.json();

      if (!results || results.length === 0) {
        setAddressError('Address not found. Please select a valid address.');
        return;
      }

      setLat(results[0].lat);
      setLon(results[0].lon);
    }

    const form = new FormData(e.currentTarget);

    const name = form.get('name')!.toString();
    const description = form.get('description')!.toString();
    const category = form.get('category') as EventTypes;
    const model = getEventTypeFilename(category);
    const locationStr = form.get('address')!.toString();
    const image = form.get('image')!.toString();

    if (!eventDate) {
      alert('Please select a date');
      return;
    }

    const startDate = new Date(
      `${eventDate.toISOString().split('T')[0]}T${startTime}`
    );

    const owner = user?.uid;
    const attendees: string[] = [];

    const event = new CommunityEvent(
      crypto.randomUUID(),
      name,
      description,
      category,
      parseFloat(lat),
      parseFloat(lon),
      locationStr,
      startDate,
      owner,
      attendees,
      image,
      model
    );

    console.log('EVENT OBJECT:', event);

    await setDoc(
      doc(db, 'Events', event.id).withConverter(communityEventConverter),
      event
    );

    // Reset form
    setIsCreateOpen(false);
    setAddress('');
    setLat('');
    setLon('');
    setEventDate(undefined);
    window.location.reload();
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
        .concat(filteredSuggestedEvents.filter((se) => 
          // Only add suggested events that aren't already in the main events list
          !events.some((e) => e.id === se.id)
        ))
    : events.filter(searchFilter).concat(filteredSuggestedEvents.filter((se) => 
        !events.some((e) => e.id === se.id)
      ));

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
                  className="font-medium"
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
                    <Calendar
                      mode="range"
                      selected={dateRange}
                      onSelect={setDateRange}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      className="rounded-md border"
                    />
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
            {user && (
              <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-[#028174] hover:bg-[#026d60] text-white font-medium">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Event
                  </Button>
                </DialogTrigger>

                <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                  <form onSubmit={handleEventCreate}>
                    <DialogHeader>
                      <DialogTitle>Create New Event</DialogTitle>
                      <DialogDescription>
                        Schedule a new community event
                      </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-5 mt-4">
                      {/* Event Name */}
                      <div className="grid gap-2">
                        <Label>Name</Label>
                        <Input
                          name="name"
                          placeholder="Community Cleanup"
                          required
                        />
                      </div>

                      {/* Description */}
                      <div className="grid gap-2">
                        <Label>Description</Label>
                        <Textarea
                          name="description"
                          placeholder="A brief description of your event..."
                          required
                        />
                      </div>

                      {/* Category */}
                      <div className="grid gap-2">
                        <Label>Category</Label>
                        <Select name="category" required>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                          <SelectContent>
                          <SelectGroup>
                            <SelectLabel>Category</SelectLabel>
                              {Object.values(EventTypes)
                                .filter((v) => typeof v === "string" && v != 'NO_CATEGORY') // Does not work
                                .map((category) => (
                                  <SelectItem key={category} value={category}>
                                    {category}
                                  </SelectItem>
                                ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Address + Autocomplete */}
                      <div className="grid gap-2">
                        <Label>Address</Label>
                        <div className="relative">
                          <Input
                            name="address"
                            placeholder="Enter location address..."
                            autoComplete="off"
                            value={address}
                            onChange={(e) => {
                              setAddress(e.target.value);
                              setLat('');
                              setLon('');
                            }}
                            onFocus={() => {
                              if (addressResults.length > 0)
                                setIsAddressOpen(true);
                            }}
                            onBlur={() =>
                              setTimeout(() => setIsAddressOpen(false), 150)
                            }
                          />

                          {isAddressOpen && addressResults.length > 0 && (
                            <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-popover shadow-lg">
                              {addressResults.map((r, i) => (
                                <button
                                  key={i}
                                  type="button"
                                  className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                                  onMouseDown={(e) => e.preventDefault()}
                                  onClick={() => handleSelectAddress(r)}
                                >
                                  {r.display_name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>

                        {addressError && (
                          <p className="text-sm text-red-500">{addressError}</p>
                        )}
                      </div>

                      {/* Date + Time Picker */}
                      <div className="flex gap-4">
                        <div className="flex flex-col gap-3 flex-1">
                          <Label>Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className="justify-between font-normal"
                              >
                                {eventDate
                                  ? eventDate.toLocaleDateString()
                                  : 'Select date'}
                                <CalendarIcon className="h-4 w-4" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              className="w-auto p-0"
                              align="start"
                            >
                              <Calendar
                                mode="single"
                                selected={eventDate}
                                onSelect={setEventDate}
                                disabled={(date) =>
                                  date <
                                  new Date(new Date().setHours(0, 0, 0, 0))
                                }
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>

                        <div className="flex flex-col gap-3">
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={startTime}
                            onChange={(e) => setStartTime(e.target.value)}
                            className="bg-background"
                          />
                        </div>
                      </div>

                      {/* Image URL */}
                      <div className="grid gap-2">
                        <Label>Image URL</Label>
                        <Input
                          name="image"
                          placeholder="https://example.com/image.jpg"
                          required
                        />
                      </div>
                    </div>

                    <DialogFooter className="mt-6">
                      <DialogClose asChild>
                        <Button variant="outline">Cancel</Button>
                      </DialogClose>
                      <Button
                        type="submit"
                        className="bg-[#028174] hover:bg-[#026d60]"
                      >
                        Create Event
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            )}
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
                  <div>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-foreground mb-1">
                        My Events
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {myEvents.length}{' '}
                        {myEvents.length === 1 ? 'event' : 'events'} you're
                        attending or organizing
                      </p>
                    </div>
                    <div className="grid grid-cols-1 gap-3 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                      {myEvents.map((e) => (
                        <EventCard
                          key={e.id}
                          event={e}
                          user={user}
                          onRSVP={handleRSVP}
                          compact
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Suggested Events Section */}
                {user && (
                  <div>
                    <div className="mb-6">
                      <h2 className="text-2xl font-bold text-foreground mb-1">
                        Suggested for You
                      </h2>
                      {suggestedEventsLoading ? (
                        <p className="text-sm text-muted-foreground">
                          Loading suggestions...
                        </p>
                      ) : filteredSuggestedEvents.length > 0 ? (
                        <p className="text-sm text-muted-foreground">
                          {filteredSuggestedEvents.length}{' '}
                          {filteredSuggestedEvents.length === 1 ? 'event' : 'events'} based on your interests
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          RSVP to some events to get personalized suggestions!
                        </p>
                      )}
                    </div>
                    {filteredSuggestedEvents.length > 0 && (
                      <div className="grid grid-cols-1 gap-3 @xl/main:grid-cols-2 @5xl/main:grid-cols-4">
                        {filteredSuggestedEvents.map((e) => (
                          <EventCard
                            key={e.id}
                            event={e}
                            user={user}
                            onRSVP={handleRSVP}
                            compact
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Discover Events Section */}
                <div className="mb-12">
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-foreground mb-1">
                      {myEvents.length > 0 ? 'Discover Events' : 'All Events'}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {otherEvents.length}{' '}
                      {otherEvents.length === 1 ? 'event' : 'events'} available
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 @xl/main:grid-cols-2 @4xl/main:grid-cols-4">
                    {otherEvents.map((e) => (
                      <EventCard
                        key={e.id}
                        event={e}
                        user={user}
                        onRSVP={handleRSVP}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
