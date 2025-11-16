"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import dynamic from 'next/dynamic';

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

    return (
        <main className="flex flex-col h-screen bg-black">
            <div className="flex flex-1 relative overflow-hidden">
                {/* Map section (always full width) */}
                <div className="w-full h-full">
                    <CesiumMap onMarkerClick={handleMarkerClick} />
                </div>
                {/* Sidebar (slides in/out) */}
                <div
                    className={`absolute top-0 right-0 h-full w-2/5 border border-[#028174] p-4 bg-black transition-transform duration-300 ease-in-out ${
                        sidebarOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                >
                    <div className="flex justify-between items-center mb-4 mt-8">
                        <h2 className="text-white">Details</h2>
                        <Button
                            variant="outline"
                            onClick={() => setSidebarOpen(false)}
                            size="sm"
                        >
                            Hide Sidebar
                        </Button>
                    </div>

                    {selectedMarker ? (
                        <div className="text-white space-y-3">
                            <div>
                                <h3 className="text-xl font-bold mb-2">{selectedMarker.name}</h3>
                            </div>
                            <div>
                                <strong>ID:</strong> {selectedMarker.id}
                            </div>
                            <div>
                                <strong>Latitude:</strong> {selectedMarker.latitude}
                            </div>
                            <div>
                                <strong>Longitude:</strong> {selectedMarker.longitude}
                            </div>
                            <div>
                                <strong>Height:</strong> {selectedMarker.height}
                            </div>

                            {/* Add image preview if available */}
                            {selectedMarker.imageUri && (
                                <div className="mt-4">
                                    <strong>Image:</strong>
                                    <img
                                        src={selectedMarker.imageUri}
                                        alt={selectedMarker.name}
                                        className="w-32 h-32 object-cover mt-2 rounded-lg"
                                    />
                                </div>
                            )}
                        </div>
                    ) : (
                        <p className="text-white">Click on a marker to see details.</p>
                    )}
                </div>
                {/* Toggle button (floats over map when sidebar closed) */}
                {!sidebarOpen && (
                    <Button
                        variant="outline"
                        onClick={() => setSidebarOpen(true)}
                        className="absolute top-24 right-4 z-10"
                    >
                        Open Sidebar
                    </Button>
                )}
            </div>
        </main>
    );
}