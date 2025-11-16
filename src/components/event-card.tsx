import Link from "next/link";
import { Badge } from "./ui/badge";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./ui/card";
import { CommunityEvent } from "@/lib/firebaseEvents";

export function EventCard({
    event, running
}: {
    event: CommunityEvent,
    running: boolean
}) {
    return (
      <Link href={`/events/${event.id}`}>
        <Card className="@container/card hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-all duration-200 group-hover:shadow-xl group-hover:scale-[1.02] cursor-pointer">
          <CardHeader>
            <CardDescription>
              {event.category} Event
            </CardDescription>
            <CardTitle className="text-2xl font-semibold tabular-nums @[250px]/card:text-3xl">
                {event.name}
            </CardTitle>
            <CardAction>
            {running ? 
              <Badge variant="outline" className="bg-chart-2/16">
                Organizing
              </Badge> : 
              <Badge variant="outline" className="bg-chart-4/16">
                Attending
              </Badge> 
            }
            </CardAction>
          </CardHeader>
          <CardContent>
            {event.description}
          </CardContent>
          <CardFooter className="flex-col items-start gap-1.5 text-sm">
            <div className="line-clamp-1 flex gap-2 font-medium">
              {event.date ? event.date.toDateString() : null}
            </div>
            <div className="text-muted-foreground">
              {event.location}
            </div>
          </CardFooter>
        </Card>
      </Link>
    )
}