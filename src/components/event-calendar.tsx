"use client";

import { useEffect, useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar";
import { CommunityEvent } from "@/lib/firebaseEvents";
import { db } from "@/lib/firebaseClient";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { User } from "firebase/auth";
import { format } from "date-fns";

interface EventCalendarProps {
  user: User | null;
}

export function EventCalendar({ user }: EventCalendarProps) {
  const [rsvpEvents, setRsvpEvents] = useState<CommunityEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [eventsByDate, setEventsByDate] = useState<Map<string, CommunityEvent[]>>(new Map());

  useEffect(() => {
    if (!user) {
      setRsvpEvents([]);
      return;
    }

    const userRef = doc(db, 'Users', user.uid);
    const unsubscribe = onSnapshot(userRef, async (userSnap) => {
      if (!userSnap.exists()) {
        setRsvpEvents([]);
        return;
      }

      const userData = userSnap.data();
      const rsvpEventIds: string[] = userData.rsvpEvents || [];

      if (rsvpEventIds.length === 0) {
        setRsvpEvents([]);
        return;
      }

      // Fetch all RSVPed events
      const events: CommunityEvent[] = [];
      for (const eventId of rsvpEventIds) {
        try {
          const eventRef = doc(db, 'Events', eventId);
          const eventSnap = await getDoc(eventRef);
          if (eventSnap.exists()) {
            const data = eventSnap.data();
            let eventDate: Date;
            if (data.date) {
              if (data.date.toDate && typeof data.date.toDate === 'function') {
                eventDate = data.date.toDate();
              } else if (data.date._seconds) {
                eventDate = new Date(data.date._seconds * 1000);
              } else {
                eventDate = new Date(data.date);
              }
            } else {
              eventDate = new Date();
            }

            let eventEndTime: Date | undefined;
            if (data.endTime) {
              if (data.endTime.toDate && typeof data.endTime.toDate === 'function') {
                eventEndTime = data.endTime.toDate();
              } else if (data.endTime._seconds) {
                eventEndTime = new Date(data.endTime._seconds * 1000);
              } else {
                eventEndTime = new Date(data.endTime);
              }
            }

            events.push({
              id: eventSnap.id,
              name: data.name,
              description: data.description,
              category: data.category,
              lat: data.lat,
              long: data.long,
              location: data.location,
              date: eventDate,
              endTime: eventEndTime,
              owner: data.owner,
              attendees: data.attendees || [],
              tags: data.tags || [],
              imageUri: data.imageUri,
              modelUri: data.modelUri,
            } as CommunityEvent);
          }
        } catch (error) {
          console.error(`Error fetching event ${eventId}:`, error);
        }
      }

      setRsvpEvents(events);

      // Group events by date
      const byDate = new Map<string, CommunityEvent[]>();
      events.forEach((event) => {
        const dateKey = format(event.date, 'yyyy-MM-dd');
        if (!byDate.has(dateKey)) {
          byDate.set(dateKey, []);
        }
        byDate.get(dateKey)!.push(event);
      });
      setEventsByDate(byDate);
    });

    return () => unsubscribe();
  }, [user]);

  const selectedDateKey = selectedDate ? format(selectedDate, 'yyyy-MM-dd') : null;
  const eventsOnSelectedDate = selectedDateKey ? eventsByDate.get(selectedDateKey) || [] : [];

  // Custom day renderer to show event indicators
  const modifiers = {
    hasEvents: (date: Date) => {
      const dateKey = format(date, 'yyyy-MM-dd');
      return eventsByDate.has(dateKey);
    },
  };

  const modifiersClassNames = {
    hasEvents: 'bg-primary/20 border-primary/50',
  };

  return (
    <SidebarGroup>
      <SidebarGroupLabel>My Calendar</SidebarGroupLabel>
      <SidebarGroupContent className="space-y-4">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          modifiers={modifiers}
          modifiersClassNames={modifiersClassNames}
          className="rounded-md border"
        />
        
        {selectedDate && eventsOnSelectedDate.length > 0 && (
          <div className="space-y-2 mt-4">
            <p className="text-sm font-medium">
              Events on {format(selectedDate, 'MMMM d, yyyy')}:
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {eventsOnSelectedDate.map((event) => (
                <div
                  key={event.id}
                  className="p-2 rounded-md border bg-card text-sm space-y-1"
                >
                  <div className="font-medium">{event.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {event.date && format(event.date, 'h:mm a')}
                    {event.endTime && ` - ${format(event.endTime, 'h:mm a')}`}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {event.location}
                  </div>
                  {event.tags && event.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {event.tags.slice(0, 3).map((tag, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {selectedDate && eventsOnSelectedDate.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">
            No events on this date
          </p>
        )}

        {!user && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sign in to view your calendar
          </p>
        )}
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

