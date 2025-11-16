"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles } from "lucide-react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { suggestEvents } from "@/lib/geminiSuggestService";
import { CommunityEvent } from "@/lib/firebaseEvents";
import { useAuth } from "@/lib/firebaseAuth";
import { EventCard } from "./event-card";
import { db } from "@/lib/firebaseClient";
import { doc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

interface AIEventSuggestionsProps {
  onRSVP?: (eventId: string, isUnRSVP?: boolean) => void;
}

export function AIEventSuggestions({ onRSVP }: AIEventSuggestionsProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedEvents, setSuggestedEvents] = useState<CommunityEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleRSVP = async (eventId: string, isUnRSVP = false) => {
    if (!user) {
      alert('Please sign in to RSVP to events');
      return;
    }

    const event = suggestedEvents.find((e) => e.id === eventId);
    if (!event) return;

    if (event.owner === user.uid) {
      alert('You are the organizer of this event!');
      return;
    }

    const isAttending = event.attendees?.includes(user.uid);

    if (isAttending && !isUnRSVP) {
      alert('You are already attending this event!');
      return;
    }

    if (!isAttending && isUnRSVP) {
      alert('You are not attending this event!');
      return;
    }

    try {
      const eventRef = doc(db, 'Events', eventId);
      const userRef = doc(db, 'Users', user.uid);

      if (isUnRSVP) {
        const updatedAttendees = event.attendees?.filter((id) => id !== user.uid) || [];
        await updateDoc(eventRef, {
          attendees: updatedAttendees,
        });
        await updateDoc(userRef, {
          rsvpEvents: arrayRemove(eventId),
        });
        setSuggestedEvents((prev) =>
          prev.map((e) => (e.id === eventId ? { ...e, attendees: updatedAttendees } : e))
        );
        alert('Successfully removed RSVP!');
      } else {
        await updateDoc(eventRef, {
          attendees: arrayUnion(user.uid),
        });
        await updateDoc(userRef, {
          rsvpEvents: arrayUnion(eventId),
        });
        setSuggestedEvents((prev) =>
          prev.map((e) =>
            e.id === eventId ? { ...e, attendees: [...(e.attendees || []), user.uid] } : e
          )
        );
        alert("Successfully RSVP'd to event!");
      }

      // Call parent handler if provided
      onRSVP?.(eventId, isUnRSVP);
    } catch (error) {
      console.error('Error updating RSVP:', error);
      alert('Failed to update RSVP. Please try again.');
    }
  };

  const handleGetSuggestions = async () => {
    if (!user) {
      setError("Please sign in to get event suggestions");
      return;
    }

    setIsLoading(true);
    setError(null);
    setMessage(null);
    setSuggestedEvents([]);

    try {
      const response = await suggestEvents(user.uid);

      if (response.error) {
        setError(response.error);
      } else {
        // Convert the response events to CommunityEvent objects
        // API returns dates as ISO strings
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
        if (response.message) {
          setMessage(response.message);
        }
        if (events.length === 0) {
          setMessage("No suggestions available. Try RSVPing to some events first!");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to get suggestions");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-load suggestions when component mounts if user is logged in
  useEffect(() => {
    if (user) {
      handleGetSuggestions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <SidebarGroup>
      <SidebarGroupLabel>AI Event Suggestions</SidebarGroupLabel>
      <SidebarGroupContent className="space-y-3">
        <Button
          onClick={handleGetSuggestions}
          disabled={isLoading || !user}
          className="w-full"
          variant="outline"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Get Suggestions
            </>
          )}
        </Button>

        {error && (
          <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {message && !error && (
          <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
            {message}
          </div>
        )}

        {suggestedEvents.length > 0 && (
          <div className="space-y-2">
            <SidebarSeparator className="mx-0" />
            <div className="text-sm font-medium">
              Suggested Events ({suggestedEvents.length})
            </div>
            <div className="max-h-96 space-y-2 overflow-y-auto">
              {suggestedEvents.map((event) => (
                <div key={event.id} className="border rounded-lg p-2 hover:bg-accent/50 transition-colors">
                  <EventCard event={event} user={user} onRSVP={handleRSVP} compact />
                </div>
              ))}
            </div>
          </div>
        )}

        {!user && (
          <p className="text-sm text-muted-foreground text-center py-2">
            Sign in to get personalized event suggestions
          </p>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

