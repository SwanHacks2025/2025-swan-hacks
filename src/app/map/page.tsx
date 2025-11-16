"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from "framer-motion";

const CesiumMap = dynamic(() => import('@/components/CesiumMap'), {
    ssr: false,
    loading: () => <div>Loading Cesium...</div>,
});

export default function MapPage() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [selectedMarker, setSelectedMarker] = useState<any>(null);

    const handleMarkerClick = (markerId: string, markerData: any) => {
        console.log('Marker clicked:', markerId, markerData);
        setSelectedMarker(markerData);
        setSidebarOpen(true);
    };

    const DataRow = ({ label, value }: { label: string; value: any }) => (
        <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{label}:</span>
            <span className="font-medium">{value}</span>
        </div>
    );

    return (
        <main className="flex flex-col h-screen bg-black">
            <div className="flex flex-1 relative overflow-hidden">
                {/* Map section (always full width) */}
                <div className="w-full h-full">
                    <CesiumMap onMarkerClick={handleMarkerClick} />
                </div>

                {/* Floating Sidebar */}
                <AnimatePresence>
                {sidebarOpen && (
                    <motion.div
                        initial={{ x: 400, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 400, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 160, damping: 22 }}
                        className="
                        absolute top-20 right-4
                        h-[calc(100vh-6rem)] w-96
                        rounded-xl backdrop-blur-xl
                        bg-background/70 border border-border
                        shadow-2xl
                        overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-4 border-b border-border">
                            <h2 className="text-foreground font-semibold text-xl">
                                Details
                            </h2>

                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setSidebarOpen(false)}
                                className="hover:bg-primary/10"
                            >
                                <X className="h-5 w-5 text-foreground" />
                            </Button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-5">
                            {selectedMarker ? (
                                <div className="space-y-6 text-foreground">
                                    {/* Title */}
                                    <div className="text-center">
                                        <h3 className="text-2xl font-bold">{selectedMarker.name}</h3>
                                    </div>

                                    {/* Image */}
                                    {selectedMarker.imageUri && (
                                        <div className="flex justify-center">
                                            <img
                                                src={selectedMarker.imageUri}
                                                alt={selectedMarker.name}
                                                className="
                w-40 h-40
                rounded-xl object-cover
                border border-border shadow-md
              "
                                            />
                                        </div>
                                    )}

                                    {/* Data rows */}
                                    <div className="space-y-3">
                                        <DataRow label="ID" value={selectedMarker.id} />
                                        <DataRow label="Latitude" value={selectedMarker.latitude} />
                                        <DataRow label="Longitude" value={selectedMarker.longitude} />
                                        <DataRow label="Height" value={selectedMarker.height} />
                                    </div>
                                </div>
                            ) : (
                                <p className="text-muted-foreground">
                                    Click on a marker to see details.
                                </p>
                            )}
                        </div>
                    </motion.div>
                )}
                </AnimatePresence>
            </div>
        </main>
    );
}