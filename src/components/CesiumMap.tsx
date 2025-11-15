"use client";

import '@/lib/cesium-setup';
import { useRef, useState, useEffect } from "react";
import { Viewer, CesiumComponentRef } from "resium";
import {
    Ion,
    Viewer as CesiumViewer,
    createWorldTerrainAsync,
    createGooglePhotorealistic3DTileset,
    Cartesian3, Transforms, HeadingPitchRoll,
} from "cesium";
import "cesium/Build/Cesium/Widgets/widgets.css";
import * as Cesium from "cesium";

export default function CesiumMap() {
    const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;

    const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);
    const [status, setStatus] = useState<string>("Initializing...");


    useEffect(() => {
        console.log("Setting Ion token");
        if (ION_TOKEN) {
            Ion.defaultAccessToken = ION_TOKEN;
        }
    }, [ION_TOKEN]);

    useEffect(() => {
        console.log("Checking for viewer...");

        const initViewer = async () => {
            if (!viewerRef.current?.cesiumElement) {
                console.log("Viewer not ready yet, waiting...");
                return;
            }

            const viewer = viewerRef.current.cesiumElement;
            console.log("=== VIEWER FOUND ===", viewer);

            try {
                setStatus("Setting camera position...");

                // Set camera position immediately
                viewer.camera.setView({
                    destination: Cartesian3.fromDegrees(-93.646072, 42.025421, 2000),
                });
                console.log("Camera position set");

                setStatus("Loading terrain...");
                const terrain = await createWorldTerrainAsync();
                viewer.terrainProvider = terrain;
                console.log("Terrain loaded");
                setStatus("Terrain loaded");


                // Load Google 3D Tiles
                if (GOOGLE_KEY) {
                    setStatus("Loading Google 3D Tiles...");
                    console.log("Loading Google 3D Tiles...");

                    try {
                        const tileset = await createGooglePhotorealistic3DTileset({
                            key: GOOGLE_KEY,
                        });

                        console.log("Tileset created:", tileset);
                        viewer.scene.primitives.add(tileset);
                        console.log("Tileset added to scene");
                        setStatus("Google 3D Tiles loaded!");

                        // Fly to location after tiles are visible
                        setTimeout(() => {
                            viewer.camera.flyTo({
                                destination: Cartesian3.fromDegrees(-93.646072, 42.025421, 2000),
                                duration: 2,
                            });
                        }, 1000);

                        viewer.entities.add({
                            name: "Drone Strike Target",
                            position: Cartesian3.fromDegrees(-93.646072, 42.025421, 300),
                            orientation: Transforms.headingPitchRollQuaternion(Cartesian3.fromDegrees(-93.646072, 42.025421, 300), new HeadingPitchRoll(0,Cesium.Math.toRadians(-90), 0)),
                            model: {
                                uri: "/models/VolunteeringMarker.glb",
                                scale: 10,
                                minimumPixelSize: 32,
                            }
                        });
                    } catch (googleError: any) {
                        console.error("Google 3D Tiles error:", googleError);
                        setStatus(`Google error: ${googleError.message}`);
                    }
                } else {
                    setStatus("Ready (no Google key)");
                }
            } catch (err: any) {
                console.error("Initialization error:", err);
                setStatus(`Error: ${err.message}`);
            }
        };

        // Give the viewer a moment to initialize
        const timer = setTimeout(() => {
            initViewer();
        }, 500);

        return () => clearTimeout(timer);
    }, [GOOGLE_KEY]);

    if (!ION_TOKEN) {
        return (
            <div style={{ padding: '20px' }}>
                <h2>Error: Missing Cesium Ion Token</h2>
                <p>Please set NEXT_PUBLIC_CESIUM_ION_TOKEN in your .env.local file</p>
            </div>
        );
    }

    return (
        <div style={{ width: '100%', height: '100%', position: 'relative' }}>
            <Viewer
                ref={viewerRef}
                full
                baseLayerPicker={false}
                timeline={false}
                animation={false}
            />
        </div>
    );
}