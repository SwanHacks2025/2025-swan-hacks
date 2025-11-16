"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebaseClient";

import {
  onAuthStateChanged,
  User,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import { CommunityEvent, EventTypes, fetchCommunityEvents, fetchCommunityEventsByUserId } from "@/lib/firebaseEvents";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { EventCard } from "@/components/event-card";
import { useEventFilter } from "@/context/EventFilterContext"
import { Button } from "@/components/ui/button";

export default function EventPage() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);

  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  
  const { dateRange, selectedFilters } = useEventFilter()

  // Listen for auth state
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
    
  useEffect(() => {
    if (!user || loading) return

    fetchCommunityEventsByUserId(user.uid)
      .then((events: CommunityEvent[]) => {
        return events.filter((e) => {
          // --- Filter 1: Date Range ---
          if (dateRange?.from || dateRange?.to) {
            const time = e.date.getTime()
            const from = dateRange.from?.getTime() ?? -Infinity
            const to = dateRange.to?.getTime() ?? Infinity
            if (time <= from || time >= to) return false
          }

          // --- Filter 2: Category ---
          const categoryFilters = selectedFilters["Category"]
          if (categoryFilters && categoryFilters.size > 0) {
            if (e.category && !categoryFilters.has(e.category.toString())) {
              return false
            } else if (!e.category) {
              return false
            }
          }

          // --- Filter 3: Attendance ---
          const attendanceFilters = selectedFilters["Attendance"]
          if (attendanceFilters && attendanceFilters.size > 0) {
            const isOwner = e.owner === user.uid
            const isAttendee = e.attendees ? e.attendees.includes(user.uid) : false

            if (attendanceFilters.has("Organizing") && attendanceFilters.has("Attendee")) {
              return isOwner || isAttendee
            } else if (attendanceFilters.has("Organizing")) {
              return isOwner
            } else if (attendanceFilters.has("Attendee")) {
              return isAttendee
            }

            return false
          }

          // --- Other filters could go here if needed ---

          return true
        })
      })
      .then(setEvents)
      .catch(console.error)
      .finally(() => setEventsLoading(false))
  }, [loading, user, dateRange, selectedFilters])

  if (loading) {
    return ;
  }

  if (!user) {
    return <p className="p-4 mt-11">You must be logged in to view your profile.</p>;
  }
  
  return (
    <div className="mt-11">
      <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
        <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mx-2 data-[orientation=vertical]:h-4"
          />
          <h1 className="text-base font-medium">Registered Events</h1>
        </div>
      </header>

      {loading ? <p className="p-4 mt-10">Loading profile…</p> :
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
              <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-2">
                {eventsLoading ? (
                  <p>Loading events…</p>
                ) : (
                  events.map((e) => (
                    <EventCard key={e.id} event={e} running={e.owner == user.uid} />
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  );
}
