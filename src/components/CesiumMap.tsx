'use client';

import '@/lib/cesium-setup';
import { useRef, useState, useEffect } from 'react';
import { Viewer, CesiumComponentRef } from 'resium';
import {
  Ion,
  Viewer as CesiumViewer,
  createWorldTerrainAsync,
  createGooglePhotorealistic3DTileset,
  Cartesian3,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import * as Cesium from 'cesium';

export async function createCircularImage(
  url: string,
  size = 128
): Promise<HTMLCanvasElement> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;

      // Draw circle mask
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Draw image inside the clipped circle
      ctx.drawImage(img, 0, 0, size, size);

      resolve(canvas);
    };
    img.src = url;
  });
}

export default function CesiumMap() {
  const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;

  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);
  const [status, setStatus] = useState<string>('Initializing...');

  useEffect(() => {
    console.log('Setting Ion token');
    if (ION_TOKEN) {
      Ion.defaultAccessToken = ION_TOKEN;
    }
  }, [ION_TOKEN]);

  useEffect(() => {
    console.log('Checking for viewer...');

    const initViewer = async () => {
      if (!viewerRef.current?.cesiumElement) {
        console.log('Viewer not ready yet, waiting...');
        return;
      }

      const viewer = viewerRef.current.cesiumElement;
      console.log('=== VIEWER FOUND ===', viewer);

      try {
        setStatus('Setting camera position...');

        // Set camera position immediately
        viewer.camera.setView({
          destination: Cartesian3.fromDegrees(-93.646072, 42.025421, 2000),
        });
        console.log('Camera position set');

        setStatus('Loading terrain...');
        const terrain = await createWorldTerrainAsync();
        viewer.terrainProvider = terrain;
        console.log('Terrain loaded');
        setStatus('Terrain loaded');

        viewer.scene.globe.depthTestAgainstTerrain = true;

        // Load Google 3D Tiles
        if (GOOGLE_KEY) {
          setStatus('Loading Google 3D Tiles...');
          console.log('Loading Google 3D Tiles...');

          try {
            const tileset = await createGooglePhotorealistic3DTileset({
              key: GOOGLE_KEY,
            });

            console.log('Tileset created:', tileset);
            viewer.scene.primitives.add(tileset);
            console.log('Tileset added to scene');
            setStatus('Google 3D Tiles loaded!');

            // Fly to location after tiles are visible
            setTimeout(() => {
              viewer.camera.flyTo({
                destination: Cartesian3.fromDegrees(
                  -93.646072,
                  42.025421,
                  2000
                ),
                duration: 2,
              });
            }, 1000);
          } catch (googleError: any) {
            console.error('Google 3D Tiles error:', googleError);
            setStatus(`Google error: ${googleError.message}`);
          }
        } else {
          setStatus('Ready (no Google key)');
        }
      } catch (err: any) {
        console.error('Initialization error:', err);
        setStatus(`Error: ${err.message}`);
      }
    };

    // Give the viewer a moment to initialize
    const timer = setTimeout(() => {
      initViewer();
    }, 500);

    return () => clearTimeout(timer);
  }, [GOOGLE_KEY]);

  useEffect(() => {
    const fetchMarkers = async () => {
      const res = await fetch('/mock-markers.json');
      const markers = await res.json();
      //const circleImage = await createCircularImage("/dude.jpg", 128);

      const viewer = viewerRef.current?.cesiumElement;
      if (!viewer) return;

      // 1. Add all markers
      for (const marker of markers) {
        const pos = Cesium.Cartesian3.fromDegrees(
          marker.longitude,
          marker.latitude,
          marker.height
        );

        const circleImage = await createCircularImage(marker.imageUri, 128);

        const entity = viewer.entities.add({
          id: marker.id,
          name: marker.name,
          position: pos,
          model: {
            uri: marker.modelUri,
            scale: 1,
            minimumPixelSize: 32,
          },
          billboard: {
            image: circleImage,
            disableDepthTestDistance: 0,
            eyeOffset: new Cesium.Cartesian3(0, 0, 0),

            scale: 0.5,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -40), // move image above the model

            scaleByDistance: undefined,
            pixelOffsetScaleByDistance: undefined,
          },
        });
        (entity as any)._pos = pos; // custom field for rotation logic
      }

      // 2. Add global rotation handler (only once)
      viewer.scene.postRender.addEventListener(() => {
        const camera = viewer.camera;

        const carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(
          camera.position
        );
        const height = carto.height;

        const minHeight = 500;
        const maxHeight = 30000;

        if (height < minHeight) {
          carto.height = minHeight;
          camera.position =
            Cesium.Ellipsoid.WGS84.cartographicToCartesian(carto);
        } else if (height > maxHeight) {
          carto.height = maxHeight;
          camera.position =
            Cesium.Ellipsoid.WGS84.cartographicToCartesian(carto);
        }

        const cameraPos = viewer.camera.positionWC;

        viewer.entities.values.forEach((entity) => {
          const entityWithPos = entity as any;
          if (!entityWithPos._pos) return;

          const pos = entityWithPos._pos as any;

          const toCamera = Cesium.Cartesian3.subtract(
            cameraPos,
            pos,
            new Cesium.Cartesian3()
          );

          toCamera.z = 0; // horizontal rotation only
          Cesium.Cartesian3.normalize(toCamera, toCamera);

          const heading = Math.atan2(toCamera.x, toCamera.y);

          entityWithPos.orientation =
            Cesium.Transforms.headingPitchRollQuaternion(
              pos,
              new Cesium.HeadingPitchRoll(heading, 0, 0)
            ) as any;
        });
      });
    };
    fetchMarkers();
  }, []);

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
