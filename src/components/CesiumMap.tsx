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
      const ctx = canvas.getContext('2d', { alpha: true })!;

      ctx.clearRect(0, 0, size, size);

      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      ctx.drawImage(img, 0, 0, size, size);
      ctx.restore();

      const imageData = ctx.getImageData(0, 0, size, size);
      const data = imageData.data;
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2;

      for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
          const dx = x - centerX;
          const dy = y - centerY;
          const distance = Math.sqrt(dx * dx + dy * dy);

          const idx = (y * size + x) * 4;

          if (distance > radius) {
            data[idx + 3] = 0;
          } else if (distance > radius - 2) {
            const alpha = (radius - distance) / 2;
            data[idx + 3] = Math.floor(data[idx + 3] * alpha);
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas);
    };
    img.src = url;
  });
}

// Add this interface at the top of the file, after imports
interface CesiumMapProps {
  onMarkerClick?: (markerId: string, markerData: any) => void;
}

export default function CesiumMap({ onMarkerClick }: CesiumMapProps) {
  const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;

  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing map...');

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
        setLoadingMessage('Setting camera position...');
        setLoadingProgress(20);

        viewer.camera.setView({
          destination: Cartesian3.fromDegrees(-93.647072, 42.015421, 1000),
        });
        console.log('Camera position set');

        setLoadingMessage('Loading terrain...');
        setLoadingProgress(40);
        const terrain = await createWorldTerrainAsync();
        viewer.terrainProvider = terrain;
        console.log('Terrain loaded');

        viewer.scene.globe.depthTestAgainstTerrain = true;

        if (GOOGLE_KEY) {
          setLoadingMessage('Loading Google 3D Tiles...');
          setLoadingProgress(60);
          console.log('Loading Google 3D Tiles...');

          try {
            const tileset = await createGooglePhotorealistic3DTileset({
              key: GOOGLE_KEY,
            });

            console.log('Tileset created:', tileset);
            viewer.scene.primitives.add(tileset);
            console.log('Tileset added to scene');

            setLoadingProgress(80);

            setTimeout(() => {
              viewer.camera.flyTo({
                destination: Cartesian3.fromDegrees(
                  -93.647072,
                  42.015421,
                  1000
                ),
                orientation: {
                  heading: Cesium.Math.toRadians(0),
                  pitch: Cesium.Math.toRadians(-45),
                  roll: Cesium.Math.toRadians(0),
                },
                duration: 2,
              });
            }, 1000);
          } catch (googleError: any) {
            console.error('Google 3D Tiles error:', googleError);
          }
        }

        setLoadingMessage('Loading markers...');
        setLoadingProgress(90);
      } catch (err: any) {
        console.error('Initialization error:', err);
        setLoadingMessage('Error loading map');
      }
    };

    const timer = setTimeout(() => {
      initViewer();
    }, 500);

    return () => clearTimeout(timer);
  }, [GOOGLE_KEY]);

  useEffect(() => {
    let handler: Cesium.ScreenSpaceEventHandler | null = null;

    const fetchMarkers = async () => {
      const viewer = viewerRef.current?.cesiumElement;
      if (!viewer) {
        setTimeout(fetchMarkers, 100);
        return;
      }

      // Check if markers already exist to prevent duplicate additions
      if (viewer.entities.values.length > 0) {
        console.log('Markers already loaded');
        return;
      }

      const res = await fetch('/mock-markers.json');
      const markers = await res.json();

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
            scale: 0.5,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            pixelOffset: new Cesium.Cartesian2(0, -40),
            disableDepthTestDistance: Number.POSITIVE_INFINITY,
          },
        });
        // Add custom properties after entity creation
        (entity as any)._pos = pos;
        (entity as any)._markerData = marker;
      }

      // Add click handler for entities
      handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      handler.setInputAction((click: any) => {
        const pickedObject = viewer.scene.pick(click.position);

        if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
          const entity = pickedObject.id as any;

          // Call the callback if it exists
          if (onMarkerClick && entity._markerData) {
            onMarkerClick(entity.id, entity._markerData);
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

      viewer.scene.postRender.addEventListener(() => {
        const camera = viewer.camera;
        const carto = Cesium.Ellipsoid.WGS84.cartesianToCartographic(
          camera.position
        );
        let height = carto.height;

        const minHeight = 500;
        const maxHeight = 2000;

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

          toCamera.z = 0;
          Cesium.Cartesian3.normalize(toCamera, toCamera);

          const heading = Math.atan2(toCamera.x, toCamera.y);

          entityWithPos.orientation =
            Cesium.Transforms.headingPitchRollQuaternion(
              pos,
              new Cesium.HeadingPitchRoll(heading, 0, 0)
            ) as any;
        });
      });

      //await new Promise(resolve => setTimeout(resolve, 2000));

      setLoadingProgress(100);
      setLoadingMessage('Complete!');

      setTimeout(() => {
        setIsLoading(false);
      }, 2500);
    };

    // Start fetching markers with a delay to ensure viewer is ready
    const timer = setTimeout(fetchMarkers, 1000);

    // Cleanup
    return () => {
      clearTimeout(timer);
      if (handler) {
        handler.destroy();
      }
    };
  }, []); // Empty dependency array - only run once

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
      {/* Loading Screen Overlay */}
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: '#028174',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            transition: 'opacity 0.5s ease-out',
          }}
        >
          {/* Logo or Title */}
          <div
            style={{
              fontSize: '2rem',
              fontWeight: 'bold',
              color: '#ffe3b3',
              marginBottom: '2rem',
            }}
          >
            Loading Map
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: '300px',
              height: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.1)',
              borderRadius: '4px',
              overflow: 'hidden',
              marginBottom: '1rem',
            }}
          >
            <div
              style={{
                width: `${loadingProgress}%`,
                height: '100%',
                backgroundColor: '#ff4958',
                transition: 'width 0.3s ease-out',
              }}
            />
          </div>

          {/* Loading Message */}
          <div
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.9rem',
            }}
          >
            {loadingMessage}
          </div>

          {/* Percentage */}
          <div
            style={{
              color: '#ffe3b3',
              fontSize: '1.5rem',
              marginTop: '1rem',
              fontWeight: 'bold',
            }}
          >
            {loadingProgress}%
          </div>
        </div>
      )}

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
