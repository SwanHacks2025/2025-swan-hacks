"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, Loader2, MapPin, Calendar, Sparkles } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { searchEvents, GeminiEventResult } from "@/lib/geminiService";
import { AIEventCreateDialog } from "./ai-event-create-dialog";

export function AIEventSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<GeminiEventResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<GeminiEventResult | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError("Please enter a search query");
      return;
    }

    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      const response = await searchEvents({
        query: searchQuery.trim(),
        location: location.trim() || undefined,
      });

      if (response.error) {
        setError(response.error);
      } else {
        setResults(response.events);
        if (response.events.length === 0) {
          setError("No events found. Try a different search query.");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to search for events");
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateEvent = (event: GeminiEventResult) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isSearching) {
      handleSearch();
    }
  };

  return (
    <>
      <SidebarGroup>
        <SidebarGroupLabel>AI Event Search</SidebarGroupLabel>
        <SidebarGroupContent className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="search-query">Search Query</Label>
            <Input
              id="search-query"
              placeholder="e.g., volunteer opportunities, sports events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSearching}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="search-location">Location (optional)</Label>
            <Input
              id="search-location"
              placeholder="e.g., San Francisco, CA or 94102"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={isSearching}
            />
          </div>

          <Button
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className="w-full"
          >
            {isSearching ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-2 h-4 w-4" />
                AI Search Events
              </>
            )}
          </Button>

          {error && (
            <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          {results.length > 0 && (
            <div className="space-y-2">
              <SidebarSeparator className="mx-0" />
              <div className="text-sm font-medium">Search Results ({results.length})</div>
              <div className="max-h-96 space-y-2 overflow-y-auto">
                {results.map((event, index) => (
                  <div
                    key={index}
                    className="rounded-lg border bg-card p-3 space-y-2"
                  >
                    <div className="font-medium text-sm">{event.name}</div>
                    {event.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                      {event.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span className="truncate">{event.location}</span>
                        </div>
                      )}
                      {(event.date || event.time) && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            {event.date && event.time
                              ? `${event.date} at ${event.time}`
                              : event.date || event.time}
                          </span>
                        </div>
                      )}
                      {event.category && (
                        <div className="flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          <span>{event.category}</span>
                        </div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => handleCreateEvent(event)}
                    >
                      Create Event
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </SidebarGroupContent>
      </SidebarGroup>

      {selectedEvent && (
        <AIEventCreateDialog
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          eventData={selectedEvent}
        />
      )}
    </>
  );
}

