'use client';
import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import dynamic from 'next/dynamic';
import { X, Calendar as CalendarIcon, Home, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { auth, db } from '@/lib/firebaseClient';
import { onAuthStateChanged, User } from '@firebase/auth';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuCheckboxItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import type { CesiumMapRef } from '@/components/CesiumMap';

const CesiumMap = dynamic(() => import('@/components/CesiumMap'), {
    ssr: false,
    loading: () => <div>Loading Cesium...</div>,
});

export default function MapPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedMarker, setSelectedMarker] = useState<any>(null);
    const [user, setUser] = useState<User | null>(null);
    const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({});
    const [hostName, setHostName] = useState<string>('');
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [allCategories, setAllCategories] = useState<string[]>([]);
    const mapRef = useRef<CesiumMapRef>(null);

    useEffect(() => {
        const unsub = onAuthStateChanged(auth, (firebaseUser) => {
            setUser(firebaseUser);
        });
        return () => unsub();
    }, []);

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

    const handleRSVP = async () => {
        if (!user || !selectedMarker) {
            alert('Please sign in to RSVP to events');
            return;
        }

        // Check if already attending
        if (selectedMarker.attendees?.includes(user.uid)) {
            alert('You are already attending this event!');
            return;
        }

        // Check if user is the owner
        if (selectedMarker.owner === user.uid) {
            alert('You are the organizer of this event!');
            return;
        }

        try {
            const eventRef = doc(db, 'Events', selectedMarker.id);
            await updateDoc(eventRef, {
                attendees: arrayUnion(user.uid),
            });

            // Update local state
            setSelectedMarker({
                ...selectedMarker,
                attendees: [...(selectedMarker.attendees || []), user.uid],
            });

            alert('Successfully RSVP\'d to event!');
        } catch (error) {
            console.error('Error RSVPing to event:', error);
            alert('Failed to RSVP. Please try again.');
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
        <main className="flex flex-col h-screen bg-black">
            <div className="flex flex-1 relative overflow-hidden">
                {/* Map section (always full width) */}
                <div className="w-full h-full">
                    <CesiumMap
                        ref={mapRef}
                        onMarkerClick={handleMarkerClick}
                        dateRange={dateRange}
                        selectedCategories={selectedCategories}
                        onCategoriesChange={handleCategoriesChange}
                    />
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
                                <DropdownMenuItem disabled>No categories found</DropdownMenuItem>
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
                                            {dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {dateRange.to.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </span>
                                    ) : (
                                        dateRange.from.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                    )
                                ) : (
                                    'Date Range'
                                )}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
                            <Calendar
                                mode="range"
                                selected={dateRange}
                                onSelect={(range) => setDateRange(range || {})}
                                disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
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
                            initial={{ x: 400, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 400, opacity: 0 }}
                            transition={{ type: 'spring', stiffness: 160, damping: 22 }}
                            className="
                            absolute top-20 right-4
                            max-h-[calc(100vh-6rem)] w-[360px]
                            rounded-2xl backdrop-blur-xl
                            bg-background/95 border border-border/50
                            shadow-2xl
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
                                                        {new Date(selectedMarker.date).toLocaleDateString('en-US', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            year: 'numeric',
                                                        })}
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
                                                    {selectedMarker.attendees?.length || 0} {selectedMarker.attendees?.length === 1 ? 'person' : 'people'}
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
                                                selectedMarker.attendees?.includes(user.uid) ? (
                                                    <Button
                                                        className="w-full h-11 bg-[#028174] hover:bg-[#026d60] text-base font-semibold rounded-lg"
                                                        disabled
                                                    >
                                                        ✓ Already Attending
                                                    </Button>
                                                ) : selectedMarker.owner === user.uid ? (
                                                    <Button
                                                        className="w-full h-11 bg-[#ffe3b3] text-[#028174] hover:bg-[#ffd89d] text-base font-semibold rounded-lg"
                                                        disabled
                                                    >
                                                        Your Event
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        onClick={handleRSVP}
                                                        className="w-full h-11 bg-[#ff4958] hover:bg-[#d63e4b] text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
                                                    >
                                                        RSVP to Event
                                                    </Button>
                                                )
                                            ) : (
                                                <Button
                                                    onClick={() => alert('Please sign in to RSVP to events')}
                                                    className="w-full h-11 bg-[#ff4958] hover:bg-[#d63e4b] text-base font-semibold rounded-lg shadow-lg hover:shadow-xl transition-all"
                                                >
                                                    Sign in to RSVP
                                                </Button>
                                            )}

                                            {/* More Info Button */}
                                            <Button
                                                onClick={() => window.location.href = `/events/${selectedMarker.id}`}
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