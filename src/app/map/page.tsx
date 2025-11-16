'use client';
import { useState, useEffect, useRef, Suspense } from 'react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { X, Calendar as CalendarIcon, Home, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { MapLoadingScreen } from '@/components/MapLoadingScreen';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from 'react-day-picker';
import { auth, db } from '@/lib/firebaseClient';
import { onAuthStateChanged, User } from '@firebase/auth';
import {
  doc,
  updateDoc,
  arrayUnion,
  arrayRemove,
  getDoc,
} from 'firebase/firestore';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { CesiumMapRef } from '@/components/CesiumMap';
import { useSearchParams, useRouter } from 'next/navigation';

const CesiumMap = dynamic(() => import('@/components/CesiumMap'), {
  ssr: false,
  loading: () => <div>Loading Cesium...</div>,
});

function MapPageContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [user, setUser] = useState<User | null>(null);
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [hostName, setHostName] = useState<string>('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [initialPosition, setInitialPosition] = useState<{
    lat: number;
    lon: number;
  } | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const mapRef = useRef<CesiumMapRef>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsub();
  }, []);

  // Handle event query parameter - set initial position before map loads
  useEffect(() => {
    const eventId = searchParams.get('event');
    if (eventId) {
      // Fetch event from Firestore
      const fetchEvent = async () => {
        try {
          const eventRef = doc(db, 'Events', eventId);
          const eventSnap = await getDoc(eventRef);
          if (eventSnap.exists()) {
            const eventData = { id: eventSnap.id, ...eventSnap.data() };

            console.log('Fetched event data:', eventData);
            console.log(
              'Event lat:',
              (eventData as any).lat,
              'long:',
              (eventData as any).long
            );

            // Set initial position for map to use (using correct field names: lat and long)
            if ((eventData as any).lat && (eventData as any).long) {
              const newPosition = {
                lat: (eventData as any).lat,
                lon: (eventData as any).long,
              };
              console.log('Setting initialPosition to:', newPosition);
              setInitialPosition(newPosition);
            } else {
              console.log('Event missing lat/long coordinates');
            }

            setSelectedMarker(eventData);
            // Don't open sidebar yet - wait for map to load
          }
        } catch (error) {
          console.error('Error fetching event:', error);
        } finally {
          // Allow map to render after we've processed the event
          setMapReady(true);
          // Clear the query parameter after everything is set
          router.replace('/map', { scroll: false });
        }
      };
      fetchEvent();
    } else {
      // No event parameter, map can render immediately
      setMapReady(true);
    }
  }, [searchParams, router]);

  // Open sidebar after a delay when selectedMarker is set and map is ready
  useEffect(() => {
    if (selectedMarker && mapReady) {
      // Wait a bit for the map to fully render, then open sidebar
      const timer = setTimeout(() => {
        setSidebarOpen(true);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [selectedMarker, mapReady]);

  // Fetch host name when selectedMarker changes
  useEffect(() => {
    const fetchHostName = async () => {
      if (selectedMarker?.owner) {
        try {
          const userRef = doc(db, 'Users', selectedMarker.owner);
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
  }, [selectedMarker]);

  const handleMarkerClick = (markerId: string, markerData: any) => {
    console.log('=== handleMarkerClick called ===');
    console.log('Marker clicked:', markerId, markerData);
    console.log('Setting selectedMarker to:', markerData);
    console.log('Setting sidebarOpen to: true');
    setSelectedMarker(markerData);
    setSidebarOpen(true);
    console.log('State updates queued');
  };

  const handleRSVP = async (isUnRSVP = false) => {
    if (!user || !selectedMarker) {
      toast.error('Please sign in to RSVP to events');
      return;
    }

    // Check if user is the owner
    if (selectedMarker.owner === user.uid) {
      toast.error('You are the organizer of this event!');
      return;
    }

    const isAttending = selectedMarker.attendees?.includes(user.uid);

    // If already attending and not trying to un-RSVP, show message
    if (isAttending && !isUnRSVP) {
      toast.error('You are already attending this event!');
      return;
    }

    // If not attending and trying to un-RSVP, show message
    if (!isAttending && isUnRSVP) {
      toast.error('You are not attending this event!');
      return;
    }

    try {
      const eventRef = doc(db, 'Events', selectedMarker.id);
      const userRef = doc(db, 'Users', user.uid);

      if (isUnRSVP) {
        // Remove user from attendees
        const updatedAttendees =
          selectedMarker.attendees?.filter((id: string) => id !== user.uid) ||
          [];
        await updateDoc(eventRef, {
          attendees: updatedAttendees,
        });

        // Remove event from user's rsvpEvents array
        await updateDoc(userRef, {
          rsvpEvents: arrayRemove(selectedMarker.id),
        });

        // Update local state
        setSelectedMarker({
          ...selectedMarker,
          attendees: updatedAttendees,
        });

        toast.success('Successfully removed RSVP!');
      } else {
        // Add user to attendees
        await updateDoc(eventRef, {
          attendees: arrayUnion(user.uid),
        });

        // Add event to user's rsvpEvents array
        await updateDoc(userRef, {
          rsvpEvents: arrayUnion(selectedMarker.id),
        });

        // Update local state
        setSelectedMarker({
          ...selectedMarker,
          attendees: [...(selectedMarker.attendees || []), user.uid],
        });

        toast.success("Successfully RSVP'd to event!");
      }
    } catch (error) {
      console.error('Error updating RSVP:', error);
      toast.error('Failed to update RSVP. Please try again.');
    }
  };

  const handleResetView = () => {
    mapRef.current?.resetView();
  };

  const toggleCategory = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category)
        ? prev.filter((c) => c !== category)
        : [...prev, category]
    );
  };

  const toggleAllCategories = () => {
    if (selectedCategories.length === allCategories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(allCategories);
    }
  };

  const handleCategoriesChange = (categories: string[]) => {
    setAllCategories(categories);
    setSelectedCategories(categories);
  };

  const DataRow = ({ label, value }: { label: string; value: any }) => (
    <div className="flex justify-between text-sm">
      <span className="text-muted-foreground">{label}:</span>
      <span className="font-medium">{value || 'N/A'}</span>
    </div>
  );

  return (
    <main className="flex flex-col h-screen">
      <div className="flex flex-1 relative overflow-hidden bg-gradient-to-br from-[#028174]/10 via-background to-[#028174]/5">
        {/* Loading screen while preparing map */}
        {!mapReady && <MapLoadingScreen isLoading={true} />}

        {/* Map section (always full width) */}
        <div className="w-full h-full">
          {mapReady && (
            <CesiumMap
              ref={mapRef}
              onMarkerClick={handleMarkerClick}
              dateRange={dateRange}
              selectedCategories={selectedCategories}
              onCategoriesChange={handleCategoriesChange}
              initialPosition={initialPosition}
            />
          )}
        </div>

        {/* Control Buttons - Bottom Right */}
        <div className="absolute bottom-6 right-6 z-40 flex flex-col gap-2">
          {/* Reset View Button */}
          <Button
            onClick={handleResetView}
            variant="outline"
            size="default"
            className="bg-background/90 backdrop-blur-md shadow-lg border-border hover:bg-background/95 transition-all font-medium"
          >
            <Home className="h-4 w-4 mr-2" />
            Reset View
          </Button>

          {/* Category Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className="bg-background/90 backdrop-blur-md shadow-lg border-border hover:bg-background/95 transition-all font-medium"
              >
                <Filter className="h-4 w-4 mr-2" />
                Categories ({selectedCategories.length}/{allCategories.length})
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuCheckboxItem
                checked={selectedCategories.length === allCategories.length}
                onCheckedChange={toggleAllCategories}
              >
                <span className="font-semibold">All Categories</span>
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {allCategories.map((category) => (
                <DropdownMenuCheckboxItem
                  key={category}
                  checked={selectedCategories.includes(category)}
                  onCheckedChange={() => toggleCategory(category)}
                >
                  {category}
                </DropdownMenuCheckboxItem>
              ))}
              {allCategories.length === 0 && (
                <DropdownMenuItem disabled>
                  No categories found
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Date Range Filter */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="default"
                className="bg-background/90 backdrop-blur-md shadow-lg border-border hover:bg-background/95 transition-all font-medium"
              >
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <span className="line-clamp-1">
                      {dateRange.from.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}{' '}
                      -{' '}
                      {dateRange.to.toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  ) : (
                    dateRange.from.toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })
                  )
                ) : (
                  'Date Range'
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                mode="range"
                selected={dateRange as DateRange}
                onSelect={(range) => setDateRange(range || {})}
                disabled={(date) =>
                  date < new Date(new Date().setHours(0, 0, 0, 0))
                }
                numberOfMonths={2}
                initialFocus
              />
              {(dateRange.from || dateRange.to) && (
                <div className="p-3 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => setDateRange({})}
                  >
                    Clear Filter
                  </Button>
                </div>
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Floating Sidebar */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.div
              initial={{ x: -400, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -400, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 160, damping: 22 }}
              className="
                            absolute top-20 left-4
                            max-h-[calc(100vh-6rem)] w-[360px]
                            rounded-2xl backdrop-blur-xl
                            bg-background/70 border border-border
                            shadow-lg
                            overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="relative px-5 py-4 border-b border-border/50">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSidebarOpen(false)}
                  className="absolute top-3 right-3 h-8 w-8 hover:bg-muted/50 rounded-full"
                >
                  <X className="h-4 w-4" />
                </Button>
                <h2 className="text-foreground font-bold text-lg pr-8">
                  Event Details
                </h2>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5">
                {selectedMarker ? (
                  <div className="space-y-4">
                    {/* Image */}
                    {selectedMarker.imageUri && (
                      <div className="relative w-full h-40 rounded-lg overflow-hidden">
                        <img
                          src={selectedMarker.imageUri}
                          alt={selectedMarker.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}

                    {/* Title */}
                    <div>
                      <h3 className="text-xl font-bold text-foreground mb-1.5 line-clamp-2">
                        {selectedMarker.name}
                      </h3>
                      {selectedMarker.category && (
                        <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#028174]/20 text-[#028174] dark:bg-[#028174]/30 dark:text-[#4dd0c0]">
                          {selectedMarker.category}
                        </span>
                      )}
                    </div>

                    {/* Info Cards */}
                    <div className="space-y-2">
                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                          Hosted by
                        </p>
                        <p className="font-semibold text-sm text-foreground line-clamp-1">
                          {hostName || 'Loading...'}
                        </p>
                      </div>

                      {selectedMarker.date && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                            Date
                          </p>
                          <p className="font-semibold text-sm text-foreground">
                            {new Date(selectedMarker.date).toLocaleDateString(
                              'en-US',
                              {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              }
                            )}
                          </p>
                        </div>
                      )}

                      {selectedMarker.date && (
                        <div className="bg-muted/30 rounded-lg p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                            Time
                          </p>
                          <p className="font-semibold text-sm text-foreground">
                            {new Date(selectedMarker.date).toLocaleTimeString(
                              'en-US',
                              {
                                hour: 'numeric',
                                minute: '2-digit',
                              }
                            )}
                            {selectedMarker.endTime && (
                              <>
                                {' '}
                                -{' '}
                                {new Date(
                                  selectedMarker.endTime
                                ).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                              </>
                            )}
                          </p>
                        </div>
                      )}

                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                          Location
                        </p>
                        <p className="font-semibold text-sm text-foreground line-clamp-2">
                          {selectedMarker.location}
                        </p>
                      </div>

                      <div className="bg-muted/30 rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">
                          Attendees
                        </p>
                        <p className="font-semibold text-sm text-foreground">
                          {selectedMarker.attendees?.length || 0}{' '}
                          {selectedMarker.attendees?.length === 1
                            ? 'person'
                            : 'people'}
                        </p>
                      </div>
                    </div>

                    {/* Description */}
                    {selectedMarker.description && (
                      <div>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-1.5">
                          Description
                        </p>
                        <p className="text-sm text-foreground leading-relaxed line-clamp-3">
                          {selectedMarker.description}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="pt-2 space-y-2">
                      {user ? (
                        selectedMarker.owner === user.uid ? (
                          <Button
                            className="w-full h-11 bg-[#ffe3b3] text-[#028174] hover:bg-[#ffd89d] text-base font-semibold rounded-lg"
                            disabled
                          >
                            Your Event
                          </Button>
                        ) : selectedMarker.attendees?.includes(user.uid) ? (
                          <>
                            <Button
                              className="w-full h-11 bg-[#028174] hover:bg-[#026d60] text-base font-semibold rounded-lg"
                              disabled
                            >
                              ✓ Attending
                            </Button>
                            <Button
                              onClick={() => handleRSVP(true)}
                              variant="outline"
                              className="w-full h-11 text-base font-medium rounded-lg border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-950"
                            >
                              Remove RSVP
                            </Button>
                          </>
                        ) : (
                          <Button
                            onClick={() => handleRSVP(false)}
                            className="w-full h-11 bg-[#ff4958] hover:bg-[#d63e4b] text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
                          >
                            RSVP to Event
                          </Button>
                        )
                      ) : (
                        <Button
                          onClick={() =>
                            alert('Please sign in to RSVP to events')
                          }
                          className="w-full h-11 bg-[#ff4958] hover:bg-[#d63e4b] text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
                        >
                          Sign in to RSVP
                        </Button>
                      )}

                      {/* More Info Button */}
                      <Button
                        onClick={() =>
                          (window.location.href = `/events/${selectedMarker.id}`)
                        }
                        variant="outline"
                        className="w-full h-11 text-base font-medium rounded-lg border-border hover:bg-muted/50"
                      >
                        More Info
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground text-center text-sm">
                      Click on a marker to see details.
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}

export default function MapPage() {
  return (
    <Suspense fallback={<MapLoadingScreen isLoading={true} />}>
      <MapPageContent />
    </Suspense>
  );
}
