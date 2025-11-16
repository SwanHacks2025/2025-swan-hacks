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
import { CommunityEvent, EventTypes } from "@/lib/firebaseEvents";

type NominatimResult = {
  display_name: string;
  lat: string;
  lon: string;
};

export function EventDialog() {
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [debouncedAddress, setDebouncedAddress] = useState("");
  const [addressResults, setAddressResults] = useState<NominatimResult[]>([]);
  const [isAddressOpen, setIsAddressOpen] = useState(false);
  const [addressError, setAddressError] = useState("");

  // Debounce address input (~1s)
  useEffect(() => {
    const handle = setTimeout(() => {
      setDebouncedAddress(address);
    }, 500);

    return () => clearTimeout(handle);
  }, [address]);

  // Fetch suggestions when debounced value changes
  useEffect(() => {
    if (!debouncedAddress.trim()) {
      setAddressResults([]);
      setIsAddressOpen(false);
      return;
    }

    const controller = new AbortController();

    const fetchAddresses = async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            debouncedAddress
          )}`,
          {
            signal: controller.signal,
            headers: {
              Accept: "application/json",
            },
          }
        );

        if (!res.ok) return;

        const data = (await res.json()) as NominatimResult[];
        setAddressResults(data);
        setIsAddressOpen(data.length > 0);
      } catch (err: any) {
        if (err.name === "AbortError") return;
        console.error("Error fetching address suggestions", err);
      }
    };

    fetchAddresses();

    return () => controller.abort();
  }, [debouncedAddress]);

  const handleSelectAddress = (result: NominatimResult) => {
    setAddress(result.display_name);
    setIsAddressOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setAddressError("");

    // If user did NOT choose from the dropdown, re-fetch address
    if (!lat || !lon) {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
        );

        const results = await res.json();

        if (!results || results.length === 0) {
          setAddressError("Address not found. Please select a valid address.");
          return;
        }

        // take best match
        setLat(results[0].lat);
        setLon(results[0].lon);
      } catch (err) {
        setAddressError("Failed to look up address.");
        return;
      }
    }

    // After validation, we can assemble the event object:
    const formData = new FormData(e.currentTarget);

    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const category = formData.get("category") as EventTypes;
    const locationStr = formData.get("address") as string;
    const dateStr = formData.get("date") as string;   // you may adjust depending on DateTimePicker
    const timeStr = formData.get("time") as string;
  
    // Combine date + time into Date object
    const date = new Date(`${dateStr}T${timeStr}`);

    // Owner & attendees default
    const owner = "CURRENT_USER_UID";     // replace with auth user.uid
    const attendees: string[] = [];       // default empty

    // Create CommunityEvent object
    const event = new CommunityEvent(
      crypto.randomUUID(),        // id
      name,
      description,
      category,
      parseFloat(lat),
      parseFloat(lon),
      locationStr,
      date,
      owner,
      attendees
    );

    console.log("Created Event:", event);
  
    // optionally send to Firestore...
    // await addDoc(collection(db, "Events"), event)
  
    // Close modal etc.
  };

  return (
    <Dialog>
      <form onSubmit={handleSubmit}>
        <DialogTrigger asChild>
          <SidebarMenuButton>
            <Plus />
            <span>Create new event</span>
          </SidebarMenuButton>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Create new event</DialogTitle>
            <DialogDescription>
              Schedule a new event in you&apos;re community.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid gap-3">
              <Label htmlFor="name-1">Name</Label>
              <Input
                id="name-1"
                name="name"
                placeholder="Cleanup in the Park"
              />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="description-1">Description</Label>
              <Textarea
                id="description-1"
                name="description"
                placeholder="A brief description of your event"
              />
            </div>

            <div className="grid gap-5">
              <Select name="category">
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select a category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Category</SelectLabel>
                    <SelectItem value="volunteering">Volunteering</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="tutoring">Tutoring</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-5">
              <DateTimePicker />
            </div>

            <div className="grid gap-3">
              <Label htmlFor="address-1">Address</Label>
              <div className="relative">
                <Input
                  id="address-1"
                  name="address"
                  placeholder="2520 Osborn Dr, Ames, IA 50011"
                  autoComplete="off"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  onFocus={() => {
                    if (addressResults.length > 0) {
                      setIsAddressOpen(true);
                    }
                  }}
                  onBlur={() => {
                    setTimeout(() => setIsAddressOpen(false), 150);
                  }}
                />

                <input type="hidden" name="lat" value={lat} />
                <input type="hidden" name="lon" value={lon} />

                {isAddressOpen && addressResults.length > 0 && (
                  <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md">
                    {addressResults.map((result, index) => (
                      <button
                        key={`${result.lat}-${result.lon}-${index}`}
                        type="button"
                        className="flex w-full items-start px-3 py-2 text-left text-sm hover:bg-accent"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => handleSelectAddress(result)}
                      >
                        {result.display_name}
                      </button>
                    ))}
                  </div>
                )}

                {addressError && (
                  <p className="text-sm text-red-500">{addressError}</p>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit">Save changes</Button>
          </DialogFooter>
        </DialogContent>
      </form>
    </Dialog>
  );
}
