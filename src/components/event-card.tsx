import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Badge } from './ui/badge';
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from './ui/card';
import { CommunityEvent } from '@/lib/firebaseEvents';
import { Button } from './ui/button';
import { User } from 'firebase/auth';
import { db } from '@/lib/firebaseClient';
import { doc, getDoc } from 'firebase/firestore';
import { MapPin } from 'lucide-react';
import { toast } from 'sonner';

export function EventCard({
  event,
  user,
  onRSVP,
  compact = false,
}: {
  event: CommunityEvent;
  user: User | null;
  onRSVP?: (eventId: string, isUnRSVP?: boolean) => void;
  compact?: boolean;
}) {
  const router = useRouter();
  const [hostName, setHostName] = useState<string>('');

  // Fetch host name
  useEffect(() => {
    const fetchHostName = async () => {
      if (event.owner) {
        try {
          const userRef = doc(db, 'Users', event.owner);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const userData = userSnap.data();
            setHostName(userData.Username || userData.displayName || 'Unknown');
          } else {
            setHostName('Unknown');
          }
        } catch (error) {
          console.error('Error fetching host name:', error);
          setHostName('Unknown');
        }
      }
    };
    fetchHostName();
  }, [event.owner]);

  const isOwner = user?.uid === event.owner;
  const isAttending = user && event.attendees?.includes(user.uid);

  if (compact) {
    return (
      <div
        className="@container/card p-3 rounded-lg border bg-card text-muted-foreground hover:text-foreground hover:bg-background/50 hover:border-primary/30 transition-all cursor-pointer flex flex-col gap-2"
        onClick={() => router.push(`/events/${event.id}`)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold line-clamp-1 text-foreground">
              {event.name}
            </h3>
            <p className="text-xs mt-1">{event.category}</p>
          </div>
          <div className="flex items-center gap-1">
            {isOwner ? (
              <Badge
                variant="outline"
                className="bg-[#ffe3b3]/30 text-[#028174] border-[#ffe3b3] text-xs"
              >
                Organizing
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="bg-[#028174]/30 text-[#028174] border-[#028174] text-xs"
              >
                Going
              </Badge>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 hover:bg-[#028174]/10"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/map?event=${event.id}`);
              }}
            >
              <MapPin className="h-3.5 w-3.5 text-[#028174]" />
            </Button>
          </div>
        </div>
        <div className="space-y-1.5">
          <div className="flex flex-col gap-0.5 text-xs">
            <span className="text-muted-foreground">Date:</span>
            <span className="font-semibold text-foreground">
              {event.date
                ? new Date(event.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                  })
                : 'TBD'}
            </span>
            {event.date && (
              <span className="text-[10px] text-muted-foreground">
                {new Date(event.date).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                {(event as any).endTime && (
                  <> - {new Date((event as any).endTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}</>
                )}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs">
            <span>Host:</span>
            <span className="font-semibold text-foreground line-clamp-1">
              {hostName || 'Loading...'}
            </span>
          </div>
          <p className="text-xs line-clamp-2 mt-2">{event.location}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="@container/card rounded-lg border bg-card hover:border-[#028174]/30 transition-all flex flex-col p-4 gap-3 cursor-pointer"
      onClick={() => router.push(`/events/${event.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[#028174] font-medium mb-1">
            {event.category}
          </p>
          <h3 className="text-lg font-bold line-clamp-2 text-foreground">
            {event.name}
          </h3>
        </div>
        {isOwner ? (
          <Badge
            variant="outline"
            className="bg-[#ffe3b3]/30 text-[#028174] border-[#ffe3b3] text-xs"
          >
            Your Event
          </Badge>
        ) : isAttending ? (
          <Badge
            variant="outline"
            className="bg-[#028174]/30 text-[#028174] border-[#028174] text-xs"
          >
            Attending
          </Badge>
        ) : null}
      </div>

      <p className="text-sm text-muted-foreground line-clamp-2">
        {event.description}
      </p>

      {/* Info */}
      <div className="space-y-2 text-sm">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground min-w-[60px]">Date:</span>
            <span className="font-semibold text-foreground">
              {event.date
                ? new Date(event.date).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })
                : 'TBD'}
            </span>
          </div>
          {event.date && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground min-w-[60px]">Time:</span>
              <span className="text-foreground text-xs">
                {new Date(event.date).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
                {(event as any).endTime && (
                  <> - {new Date((event as any).endTime).toLocaleTimeString('en-US', {
                    hour: 'numeric',
                    minute: '2-digit',
                  })}</>
                )}
              </span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground min-w-[60px]">Host:</span>
          <span className="text-foreground line-clamp-1">
            {hostName || 'Loading...'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground min-w-[60px]">Location:</span>
          <span className="text-foreground line-clamp-1">{event.location}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground min-w-[60px]">Attendees:</span>
          <span className="text-foreground">
            {event.attendees?.length || 0}{' '}
            {event.attendees?.length === 1 ? 'person' : 'people'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2 pt-1">
        {user ? (
          isOwner ? (
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-[#ffe3b3] text-[#028174] hover:bg-[#ffd89d] font-semibold"
                disabled
                onClick={(e) => e.stopPropagation()}
              >
                Your Event
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/map?event=${event.id}`);
                }}
                className="border-[#028174]/30 hover:bg-[#028174]/10 hover:border-[#028174]/50"
              >
                <MapPin className="h-4 w-4 text-[#028174]" />
              </Button>
            </div>
          ) : isAttending ? (
            <>
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-[#028174] hover:bg-[#026d60] text-white font-semibold"
                  disabled
                  onClick={(e) => e.stopPropagation()}
                >
                  ✓ Attending
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/map?event=${event.id}`);
                  }}
                  className="border-[#028174]/30 hover:bg-[#028174]/10 hover:border-[#028174]/50"
                >
                  <MapPin className="h-4 w-4 text-[#028174]" />
                </Button>
              </div>
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRSVP?.(event.id, true);
                }}
                variant="outline"
                className="w-full font-medium border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
              >
                Remove RSVP
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onRSVP?.(event.id, false);
                }}
                className="flex-1 bg-[#ff4958] hover:bg-[#d63e4b] text-white font-semibold cursor-pointer"
              >
                RSVP to Event
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/map?event=${event.id}`);
                }}
                className="border-[#028174]/30 hover:bg-[#028174]/10 hover:border-[#028174]/50"
              >
                <MapPin className="h-4 w-4 text-[#028174]" />
              </Button>
            </div>
          )
        ) : (
          <div className="flex gap-2">
            <Button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toast.error('Please sign in to RSVP to events');
              }}
              className="flex-1 bg-[#ff4958] hover:bg-[#d63e4b] text-white font-semibold cursor-pointer"
            >
              Sign in to RSVP
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/map?event=${event.id}`);
              }}
              className="border-[#028174]/30 hover:bg-[#028174]/10 hover:border-[#028174]/50"
            >
              <MapPin className="h-4 w-4 text-[#028174]" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
