'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from './ui/textarea';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DateTimePicker } from './date-time-picker';
import {
  CommunityEvent,
  communityEventConverter,
  EventTypes,
  getEventTypeFilename,
} from '@/lib/firebaseEvents';
import { auth, db } from '@/lib/firebaseClient';
import { onAuthStateChanged, User } from '@firebase/auth';
import { doc, getDoc, getFirestore, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import { GeminiEventResult } from '@/app/api/gemini/search/route';
import { toast } from 'sonner';

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

interface AIEventCreateDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  eventData: GeminiEventResult;
}

export function AIEventCreateDialog({
  isOpen,
  onOpenChange,
  eventData,
}: AIEventCreateDialogProps) {
  const [address, setAddress] = useState('');
  const [debouncedAddress, setDebouncedAddress] = useState('');
  const [addressResults, setAddressResults] = useState<NominatimResult[]>([]);
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [addressError, setAddressError] = useState('');

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Map AI category to EventTypes
  const mapCategoryToEventType = (category?: string): EventTypes => {
    if (!category) return EventTypes.VOLUNTEER;
    const catLower = category.toLowerCase();
    if (catLower.includes('volunteer')) return EventTypes.VOLUNTEER;
    if (catLower.includes('sport')) return EventTypes.SPORTS;
    if (catLower.includes('tutor')) return EventTypes.TUTORING;
    if (catLower.includes('art') || catLower.includes('craft'))
      return EventTypes.ARTS;
    if (catLower.includes('yoga')) return EventTypes.YOGA;
    if (catLower.includes('book') || catLower.includes('reading'))
      return EventTypes.BOOKS;
    if (
      catLower.includes('workshop') ||
      catLower.includes('learning') ||
      catLower.includes('class')
    )
      return EventTypes.WORKSHOP;
    if (catLower.includes('music') || catLower.includes('concert'))
      return EventTypes.MUSIC;
    if (catLower.includes('hang') || catLower.includes('social'))
      return EventTypes.HANGOUT;
    if (
      catLower.includes('outdoor') ||
      catLower.includes('nature') ||
      catLower.includes('hiking')
    )
      return EventTypes.OUTDOORS;
    if (
      catLower.includes('food') ||
      catLower.includes('dining') ||
      catLower.includes('restaurant')
    )
      return EventTypes.FOOD;
    return EventTypes.VOLUNTEER;
  };

  // Parse date from AI result
  const parseAIDate = (dateStr?: string, timeStr?: string): Date => {
    if (dateStr && timeStr) {
      const dateTime = new Date(`${dateStr}T${timeStr}`);
      if (!isNaN(dateTime.getTime())) return dateTime;
    }
    if (dateStr) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) return date;
    }
    // Default to tomorrow if no date provided
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
  };

  // Initialize form with AI data when dialog opens
  useEffect(() => {
    if (isOpen && eventData) {
      setAddress(eventData.location || '');
      // Try to geocode the location immediately
      if (eventData.location) {
        fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            eventData.location
          )}`
        )
          .then((res) => res.json())
          .then((data: NominatimResult[]) => {
            if (data && data.length > 0) {
              setLat(data[0].lat);
              setLon(data[0].lon);
            }
          })
          .catch(console.error);
      }
    }
  }, [isOpen, eventData]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedAddress(address);
    }, 800);
    return () => clearTimeout(handle);
  }, [address]);

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
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddressError('');

    if (!user) {
      setAddressError('You must be logged in to create an event.');
      return;
    }

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
    const category =
      (form.get('category') as EventTypes) ||
      mapCategoryToEventType(eventData.category);
    const locationStr = form.get('address')!.toString();
    const dateStr = form.get('date')!.toString();
    const startStr = form.get('startTime')!.toString();
    const endStr = form.get('endTime')!.toString();

    const startDate = new Date(`${dateStr}T${startStr}`);
    const endDate = new Date(`${dateStr}T${endStr}`);

    const owner = user.uid;
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
      '',
      getEventTypeFilename(category),
      [],
      endDate
    );

    const db = getFirestore();
    await setDoc(
      doc(db, 'Events', event.id).withConverter(communityEventConverter),
      event
    );

    // Add event to user's createdEvents array
    const userRef = doc(db, 'Users', user.uid);
    await updateDoc(userRef, {
      createdEvents: arrayUnion(event.id),
    });

    toast.success('Event created successfully!');

    // Close dialog and reset form
    onOpenChange(false);
    // Reset form state
    setAddress('');
    setLat('');
    setLon('');
  };

  if (loading) {
    return null;
  }

  const initialDate = parseAIDate(eventData.date, eventData.time);
  const initialCategory = mapCategoryToEventType(eventData.category);

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Event from AI Search</DialogTitle>
            <DialogDescription>
              Review and edit the event details before creating it.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5">
            {/* Event Name */}
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input
                name="name"
                placeholder="Cleanup in the Park"
                defaultValue={eventData.name}
                required
              />
            </div>

            {/* Description */}
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea
                name="description"
                placeholder="A brief description of your event..."
                defaultValue={eventData.description}
                required
              />
            </div>

            {/* Category */}
            <div className="grid gap-2">
              <Label>Category</Label>
              <Select name="category" defaultValue={initialCategory.toString()}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Category</SelectLabel>
                    <SelectItem value={EventTypes.VOLUNTEER.toString()}>
                      Volunteering
                    </SelectItem>
                    <SelectItem value={EventTypes.SPORTS.toString()}>
                      Sports
                    </SelectItem>
                    <SelectItem value={EventTypes.TUTORING.toString()}>
                      Tutoring
                    </SelectItem>
                    <SelectItem value={EventTypes.ARTS.toString()}>
                      Arts & Crafts
                    </SelectItem>
                    <SelectItem value={EventTypes.YOGA.toString()}>
                      Yoga
                    </SelectItem>
                    <SelectItem value={EventTypes.BOOKS.toString()}>
                      Book Club
                    </SelectItem>
                    <SelectItem value={EventTypes.WORKSHOP.toString()}>
                      Workshop & Learning
                    </SelectItem>
                    <SelectItem value={EventTypes.MUSIC.toString()}>
                      Music & Concert
                    </SelectItem>
                    <SelectItem value={EventTypes.HANGOUT.toString()}>
                      Hang-out
                    </SelectItem>
                    <SelectItem value={EventTypes.OUTDOORS.toString()}>
                      Outdoors & Nature
                    </SelectItem>
                    <SelectItem value={EventTypes.FOOD.toString()}>
                      Food & Dining
                    </SelectItem>
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
                  placeholder="123 Main St"
                  autoComplete="off"
                  value={address}
                  onChange={(e) => {
                    setAddress(e.target.value);
                    setLat('');
                    setLon('');
                  }}
                  onFocus={() => {
                    if (addressResults.length > 0) setIsAddressOpen(true);
                  }}
                  onBlur={() => setTimeout(() => setIsAddressOpen(false), 150)}
                />

                {isAddressOpen && addressResults.length > 0 && (
                  <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto rounded-md border bg-popover shadow">
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

              <input type="hidden" name="lat" value={lat} />
              <input type="hidden" name="lon" value={lon} />
            </div>

            {/* Date + Time Picker */}
            <div className="grid gap-2">
              <Label>Date & Time</Label>
              <DateTimePicker />
              {/* Note: DateTimePicker uses internal state, so default values from AI may not be visible
                  Users can manually set the date/time or it will use the AI-provided values if available */}
              {eventData.date && (
                <input
                  type="hidden"
                  name="date"
                  defaultValue={eventData.date}
                />
              )}
              {eventData.time && (
                <input
                  type="hidden"
                  name="startTime"
                  defaultValue={eventData.time}
                />
              )}
              {!eventData.time && (
                <input type="hidden" name="startTime" defaultValue="10:00" />
              )}
              <input
                type="hidden"
                name="endTime"
                defaultValue={eventData.time ? eventData.time : '11:00'}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Create Event</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
