import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { notFound } from "next/navigation";
import Image from "next/image";
import dynamic from "next/dynamic";

import ModelViewerClient from "./ModelViewerClient";

export default async function EventPage({ params }: { params: { eventId: string } }) {
  const event = null; //await getCommunityEvent(params.eventId);
  if (!event) return notFound();

  return (
    <div className="container mx-auto max-w-7xl py-10">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        
        {/* LEFT SIDE — Event Info */}
        <div className="lg:col-span-2 space-y-10">
          <Card>
            <CardHeader>
              <CardTitle className="text-4xl font-bold flex justify-between">
                {event.name}
                <Badge variant="secondary" className="text-lg">
                  {event.category}
                </Badge>
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-muted-foreground text-lg">{event.description}</p>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <InfoBlock label="Date" value={event.date.toString()} />
                <InfoBlock label="Location" value={event.location} />
                <InfoBlock label="Owner" value={event.owner} />
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold text-xl mb-2">Attendees</h3>
                <div className="flex flex-wrap gap-2">
                  {event.attendees.map((a) => (
                    <Badge key={a} variant="outline">
                      {a}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT SIDE — Image + 3D Model */}
        <div className="flex flex-col gap-10">
          
          {/* Image */}
          <Card>
            <CardHeader>
              <CardTitle>Event Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative w-full h-80 rounded-xl overflow-hidden shadow">
                <Image
                  src={event.imageUri}
                  alt={event.name}
                  fill
                  className="object-cover"
                />
              </div>
            </CardContent>
          </Card>

          {/* 3D Viewer */}
          <Card className="h-[400px]">
            <CardHeader>
              <CardTitle>3D Model</CardTitle>
            </CardHeader>
            <CardContent className="h-full">
              <ModelViewerClient modelUrl={event.modelUri} />
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
