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

  return (
    <Dialog>
      <form>
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
