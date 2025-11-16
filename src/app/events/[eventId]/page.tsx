"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { notFound } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";

import ModelViewerClient from "./ModelViewerClient";
import { useEffect, useState } from "react";
import { CommunityEvent, getCommunityEvent } from "@/lib/firebaseEvents";
import React from "react";

export default function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const [loading, setLoading] = useState(true);
  const [communityEvent, setEvents] = useState<CommunityEvent>();
  
  const { eventId } = React.use(params);

  useEffect(() => {
    getCommunityEvent(eventId)
    .then((e) => {
      if (e) {
        setEvents(e);
      } else {
        console.warn("Event not found");
      }
    })
    .catch(console.error)
    .finally(() => setLoading(false));
  }, [loading, eventId]);

  if (loading) return (<p>Loading...</p>);
  if (!communityEvent) return notFound(); 

  return (
    <div className="container mx-auto max-w-7xl py-10 mt-11">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* LEFT SIDE — Event Info */}
        <div className="lg:col-span-2 space-y-10">
          <Card>
            <CardHeader>
              <CardTitle className="text-4xl font-bold flex justify-between">
                {communityEvent.name}
                <Badge variant="secondary" className="text-lg">
                  {communityEvent.category}
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-lg">{communityEvent.description}</p>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <InfoBlock label="Date" value={communityEvent.date.toString()} />
                <InfoBlock label="Location" value={communityEvent.location} />
                <InfoBlock label="Owner" value={communityEvent.owner} />
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold text-xl mb-2">Attendees</h3>
                <div className="flex flex-wrap gap-2">
                  {communityEvent.attendees.map((a) => (
                    <Badge key={a} variant="outline">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-10">
          
          {/* Image */}
          <Card>
            <CardHeader>
              <CardTitle>Event Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-80 rounded-xl overflow-hidden shadow">
                <Image
                  src={communityEvent.imageUri}
                  alt={communityEvent.name}
                  fill
                  unoptimized
                  className="object-cover"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <p className="text-lg font-medium">{value}</p>
    </div>
  );
}
