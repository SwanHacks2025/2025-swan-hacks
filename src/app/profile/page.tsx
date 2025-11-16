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

import { CommunityEvent, fetchCommunityEvents } from "@/lib/firebaseEvents";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { EventCard } from "@/components/event-card";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [events, setEvents] = useState<CommunityEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);

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

  // Fetch events
  useEffect(() => {
    fetchCommunityEvents()
      .then((events) => setEvents(events))
      .catch((err) => console.error(err))
      .finally(() => setEventsLoading(false));
  }, []);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    setMessage(null);

    try {
      const userRef = doc(db, "Users", user.uid);

      await setDoc(
        userRef,
        { Username: username },
        { merge: true }
      );

      setMessage("Username updated!");
    } catch (err: any) {
      console.error(err);
      setMessage("Error saving username.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <p className="p-4">Loading profile…</p>;
  }

  if (!user) {
    return <p className="p-4">You must be logged in to view your profile.</p>;
  }

  return (
    <div>
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

      <div className="flex flex-1 flex-col">
        <div className="@container/main flex flex-1 flex-col gap-2">
          <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t *:data-[slot=card]:shadow-xs lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-2">
              {eventsLoading ? (
                <p>Loading events…</p>
              ) : (
                events.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
