"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import CesiumMap from "@/components/CesiumMap";



export default function MapPage() {
    const [sidebarOpen, setSidebarOpen] = useState(true);

    return (
        <main className="flex flex-col h-screen bg-black">
            <div className="flex flex-1 relative overflow-hidden">
                {/* Map section (always full width) */}
                <div className="w-full h-full">
                    <CesiumMap />
                </div>

                {/* Sidebar (slides in/out) */}
                <div
                    className={`absolute top-0 right-0 h-full w-2/5 border border-[#028174] p-4 bg-black transition-transform duration-300 ease-in-out ${
                        sidebarOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                >
                    <h2 className="text-white mb-4">Details</h2>
                    <p className="text-white">Sidebar content goes here.</p>
                    <Button
                        variant="outline"
                        onClick={() => setSidebarOpen(false)}
                        className="mb-4"
                    >
                        Close Sidebar
                    </Button>
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