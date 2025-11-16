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
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, X, Calendar as CalendarIcon } from 'lucide-react';
import { SidebarMenuButton } from './ui/sidebar';
import { Textarea } from './ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
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
import {
  collection,
  doc,
  getDoc,
  getFirestore,
  setDoc,
  updateDoc,
  arrayUnion,
} from 'firebase/firestore';
import { redirect, RedirectType } from 'next/navigation';
import { toast } from 'sonner';

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

export function EventDialog() {
  const [address, setAddress] = useState('');
  const [debouncedAddress, setDebouncedAddress] = useState('');
  const [addressResults, setAddressResults] = useState<NominatimResult[]>([]);
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [addressError, setAddressError] = useState('');

  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(true);
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [eventDate, setEventDate] = useState<Date | undefined>(undefined);
  const [startTime, setStartTime] = useState('10:30');
  const [endTime, setEndTime] = useState('');

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

  // -----------------------
  // SUBMIT HANDLER
  // -----------------------
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
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
      toast.error('Please select a date');
      return;
    }

    const startDate = new Date(
      `${eventDate.toISOString().split('T')[0]}T${startTime}`
    );
    const endDateTime = endTime
      ? new Date(`${eventDate.toISOString().split('T')[0]}T${endTime}`)
      : undefined;

    // Hardcode temporarily (replace with auth)
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
      model,
      tags,
      endDateTime
    );

    console.log('EVENT OBJECT:', event);

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
    window.location.reload();
  };

  if (loading) {
    return <p>Loading...</p>;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="bg-[#028174] hover:bg-[#026d60] text-white font-medium cursor-pointer">
          <Plus className="h-4 w-4 mr-2" />
          Create Event
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
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
              <Input name="name" placeholder="Community Cleanup" required />
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
              <Select name="category">
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
                  placeholder="Enter location address..."
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
            <div className="grid gap-4">
              <div className="flex flex-col gap-3">
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
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={eventDate}
                      onSelect={setEventDate}
                      disabled={(date) =>
                        date < new Date(new Date().setHours(0, 0, 0, 0))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-3">
                  <Label>Start Time</Label>
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="bg-background"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <Label>End Time</Label>
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>
            </div>

            {/* Hidden lat/lon fields */}
            <input type="hidden" name="lat" value={lat} />
            <input type="hidden" name="lon" value={lon} />

            {/* Tags */}
            <div className="grid gap-2">
              <Label>Tags (optional)</Label>
              <div className="flex gap-2">
                <Input
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  placeholder="Add a tag..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      if (newTag.trim() && !tags.includes(newTag.trim())) {
                        setTags([...tags, newTag.trim()]);
                        setNewTag('');
                      }
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (newTag.trim() && !tags.includes(newTag.trim())) {
                      setTags([...tags, newTag.trim()]);
                      setNewTag('');
                    }
                  }}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.map((tag, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1 bg-muted px-2 py-1 rounded-md text-sm"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => setTags(tags.filter((_, idx) => idx !== i))}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
            <Button type="submit" className="bg-[#028174] hover:bg-[#026d60]">
              Create Event
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
