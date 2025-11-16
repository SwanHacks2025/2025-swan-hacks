"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { useEventFilter } from "@/context/EventFilterContext";

export function EventSearch() {
  const { searchText, setSearchText } = useEventFilter();

  return (
    <SidebarGroup>
      <SidebarGroupLabel>Search Events</SidebarGroupLabel>
      <SidebarGroupContent>
        <div className="space-y-2">
          <Label htmlFor="event-search">Search by name</Label>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="event-search"
              type="text"
              placeholder="Search events by name..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

