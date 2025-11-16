"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { SidebarMenuButton } from "./ui/sidebar";
import { Textarea } from "./ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DateTimePicker } from "./date-time-picker";
import { CommunityEvent, communityEventConverter, EventTypes } from "@/lib/firebaseEvents";
import { auth, db } from "@/lib/firebaseClient";
import { onAuthStateChanged, User } from "@firebase/auth";
import { collection, doc, getDoc, getFirestore, setDoc } from "firebase/firestore";

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

export function EventDialog() {
  const [address, setAddress] = useState("");
  const [debouncedAddress, setDebouncedAddress] = useState("");
  const [addressResults, setAddressResults] = useState<NominatimResult[]>([]);
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [addressError, setAddressError] = useState("");

  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

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
    setAddressError("");
  };

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      if (!firebaseUser) {
        setLoading(false);
        return;
      }

      const userRef = doc(db, "Users", firebaseUser.uid);
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data() as { Username?: string };
        setUsername(data.Username || firebaseUser.displayName || "");
      } else {
        setUsername(firebaseUser.displayName || "");
      }

      setLoading(false);
    });

    return () => unsub();
  }, []);
    
  // -----------------------
  // SUBMIT HANDLER
  // -----------------------
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddressError("");

    // If no lat/lon, re-fetch to validate
    if (!lat || !lon) {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          address
        )}`
      );
      const results: NominatimResult[] = await res.json();

      if (!results || results.length === 0) {
        setAddressError("Address not found. Please select a valid address.");
        return;
      }

      setLat(results[0].lat);
      setLon(results[0].lon);
    }

    const form = new FormData(e.currentTarget);

    const name = form.get("name")!.toString();
    const description = form.get("description")!.toString();
    const category = form.get("category") as EventTypes;
    const locationStr = form.get("address")!.toString();
    const dateStr = form.get("date")!.toString();
    const startStr = form.get("startTime")!.toString();
    const endStr = form.get("endTime")!.toString();

    const startDate = new Date(`${dateStr}T${startStr}`);
    const endDate = new Date(`${dateStr}T${endStr}`);

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
      attendees
    );

    console.log("EVENT OBJECT:", event);

    const db = getFirestore();
    await setDoc(doc(db, "Events", event.id).withConverter(communityEventConverter), event);
  };
  
  if (loading) {
    return (<p>Loading...</p>);
  }

  return (
      <Dialog>
  <DialogTrigger asChild>
    <SidebarMenuButton>
      <Plus />
      <span>Create new event</span>
    </SidebarMenuButton>
  </DialogTrigger>

  <DialogContent className="sm:max-w-[500px]">
    <form onSubmit={handleSubmit}>
      <DialogHeader>
        <DialogTitle>Create new event</DialogTitle>
        <DialogDescription>
          Schedule a new event in your community.
        </DialogDescription>
      </DialogHeader>

          <div className="grid gap-5">

            {/* Event Name */}
            <div className="grid gap-2">
              <Label>Name</Label>
              <Input name="name" placeholder="Cleanup in the Park" required />
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
                    <SelectItem value={EventTypes.VOLUNTEER.toString()}>Volunteering</SelectItem>
                    <SelectItem value={EventTypes.SPORTS.toString()}>Sports</SelectItem>
                    <SelectItem value={EventTypes.TUTORING.toString()}>Tutoring</SelectItem>
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
                    setLat("");
                    setLon("");
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
            <DateTimePicker />
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
