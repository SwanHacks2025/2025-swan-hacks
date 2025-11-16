'use client';

import '@/lib/cesium-setup';
import { useRef, useState, useEffect } from 'react';
import { Viewer, CesiumComponentRef } from 'resium';
import { fetchCommunityEvents, CommunityEvent } from '@/lib/firebaseEvents';
import {
  Ion,
  Viewer as CesiumViewer,
  createWorldTerrainAsync,
  createGooglePhotorealistic3DTileset,
  Cartesian3,
} from 'cesium';
import 'cesium/Build/Cesium/Widgets/widgets.css';
import * as Cesium from 'cesium';
import { Button } from '@/components/ui/button';
import { Home, Filter } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';

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
    img.onerror = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      resolve(canvas);
    };
    img.src = url;
  });
}

interface CesiumMapProps {
  onMarkerClick?: (markerId: string, markerData: any) => void;
}

// Initial camera position
const INITIAL_POSITION = {
  lon: -93.647072,
  lat: 42.015421,
  height: 1000,
  heading: 0,
  pitch: -45,
  roll: 0,
};

export default function CesiumMap({ onMarkerClick }: CesiumMapProps) {
  const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;

  const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState('Initializing map...');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);

  const markersLoadedRef = useRef(false);
  const clickHandlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);
  const postRenderListenerRef = useRef<(() => void) | null>(null);
  const viewerReadyRef = useRef(false);

  useEffect(() => {
    if (ION_TOKEN) {
      Ion.defaultAccessToken = ION_TOKEN;
    }
  }, [ION_TOKEN]);

  useEffect(() => {
    const initViewer = async () => {
      if (!viewerRef.current?.cesiumElement) return;
      const viewer = viewerRef.current.cesiumElement;

      try {
        (viewer.cesiumWidget.creditContainer as HTMLElement).style.display =
          'none';
      } catch (e) {
        // ignore
      }

      try {
        setLoadingMessage('Setting camera position...');
        setLoadingProgress(20);

        viewer.camera.setView({
          destination: Cartesian3.fromDegrees(
            INITIAL_POSITION.lon,
            INITIAL_POSITION.lat,
            INITIAL_POSITION.height
          ),
        });

        setLoadingMessage('Loading terrain...');
        setLoadingProgress(40);
        const terrain = await createWorldTerrainAsync();
        viewer.terrainProvider = terrain;

        viewer.scene.globe.depthTestAgainstTerrain = true;
        viewer.scene.globe.enableLighting = false;

        viewer.imageryLayers.addImageryProvider(
          new Cesium.UrlTemplateImageryProvider({
            url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_only_labels/{z}/{x}/{y}.png',
            subdomains: ['a', 'b', 'c', 'd'],
            credit: 'Map tiles by CartoDB, under CC BY 3.0',
          })
        );

        if (GOOGLE_KEY) {
          setLoadingMessage('Loading Google 3D Tiles...');
          setLoadingProgress(60);
          try {
            const tileset = await createGooglePhotorealistic3DTileset({
              key: GOOGLE_KEY,
            });
            viewer.scene.primitives.add(tileset);
            setLoadingProgress(80);

            setTimeout(() => {
              viewer.camera.flyTo({
                destination: Cartesian3.fromDegrees(
                  INITIAL_POSITION.lon,
                  INITIAL_POSITION.lat,
                  INITIAL_POSITION.height
                ),
                orientation: {
                  heading: Cesium.Math.toRadians(INITIAL_POSITION.heading),
                  pitch: Cesium.Math.toRadians(INITIAL_POSITION.pitch),
                  roll: Cesium.Math.toRadians(INITIAL_POSITION.roll),
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

    const timer = setTimeout(initViewer, 500);
    return () => clearTimeout(timer);
  }, [GOOGLE_KEY]);

  useEffect(() => {
    let mounted = true;

    const loadMarkersFromFirestore = async () => {
      const viewer = viewerRef.current?.cesiumElement;
      if (!viewer) {
        setTimeout(loadMarkersFromFirestore, 100);
        return;
      }

      if (markersLoadedRef.current) {
        return;
      }

      markersLoadedRef.current = true;

      let events: CommunityEvent[] = [];
      try {
        events = await fetchCommunityEvents();
        console.log('Fetched events:', events);
      } catch (err) {
        console.error('Error fetching community events:', err);
        setLoadingProgress(100);
        setLoadingMessage('Complete!');
        setTimeout(() => setIsLoading(false), 1200);
        return;
      }

      if (!mounted) return;

      // Extract unique categories
      const categories = Array.from(
        new Set(events.map((e) => e.category).filter(Boolean))
      ) as string[];
      setAllCategories(categories);
      setSelectedCategories(categories); // Initially show all

      // build entities
      for (const evt of events) {
        const lng = (evt as any).long ?? (evt as any).longitude ?? 0;
        const lat = (evt as any).lat ?? (evt as any).latitude ?? 0;
        const height = 290;

        const pos = Cesium.Cartesian3.fromDegrees(lng, lat, height);

        let circleImage: HTMLCanvasElement | string = '/file.svg';
        if (evt.imageUri) {
          try {
            circleImage = await createCircularImage(evt.imageUri, 128);
          } catch (err) {
            console.warn('Failed to create circular image', err);
            circleImage = evt.imageUri;
          }
        }

        const entity = viewer.entities.add({
          id: evt.id,
          name: evt.name,
          position: pos,
          model: evt.modelUri
            ? {
                uri: evt.modelUri,
                scale: 1,
                minimumPixelSize: 32,
              }
            : undefined,
          billboard: {
            image: circleImage,
            scale: 0.6,
            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
            disableDepthTestDistance: 0,
            eyeOffset: new Cesium.Cartesian3(0, 0, 0),
            pixelOffset: new Cesium.Cartesian2(0, -40),
          },
        });

        (entity as any)._pos = pos;
        (entity as any)._markerData = evt;
        (entity as any)._category = evt.category;
      }

      if (!postRenderListenerRef.current) {
        const fn = () => {
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
        };

        viewer.scene.postRender.addEventListener(fn);
        postRenderListenerRef.current = fn;
      }

      viewerReadyRef.current = true;
      console.log('Viewer is now ready, markers loaded');

      setLoadingProgress(100);
      setLoadingMessage('Complete!');
      setTimeout(() => setIsLoading(false), 1200);
    };

    const timer = setTimeout(loadMarkersFromFirestore, 1000);

    return () => {
      mounted = false;
      clearTimeout(timer);

      const viewer = viewerRef.current?.cesiumElement;
      if (postRenderListenerRef.current && viewer) {
        viewer.scene.postRender.removeEventListener(
          postRenderListenerRef.current
        );
        postRenderListenerRef.current = null;
      }
    };
  }, []);

  // Apply filter when selectedCategories changes
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || !viewerReadyRef.current) return;

    viewer.entities.values.forEach((entity) => {
      const entityWithCategory = entity as any;
      const category = entityWithCategory._category;

      entity.show =
        selectedCategories.length === 0 ||
        selectedCategories.includes(category);
    });
  }, [selectedCategories]);

  // Single click handler useEffect
  useEffect(() => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer || !viewerReadyRef.current) {
      return;
    }

    if (clickHandlerRef.current) {
      clickHandlerRef.current.destroy();
    }

    clickHandlerRef.current = new Cesium.ScreenSpaceEventHandler(
      viewer.scene.canvas
    );
    clickHandlerRef.current.setInputAction((click: any) => {
      const pickedObject = viewer.scene.pick(click.position);

      if (Cesium.defined(pickedObject) && Cesium.defined(pickedObject.id)) {
        const entity = pickedObject.id as any;
        if (onMarkerClick && entity._markerData) {
          onMarkerClick(entity.id, entity._markerData);
        }
      }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      if (clickHandlerRef.current) {
        clickHandlerRef.current.destroy();
        clickHandlerRef.current = null;
      }
    };
  }, [onMarkerClick, viewerReadyRef.current]);

  const handleResetView = () => {
    const viewer = viewerRef.current?.cesiumElement;
    if (!viewer) return;

    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(
        INITIAL_POSITION.lon,
        INITIAL_POSITION.lat,
        INITIAL_POSITION.height
      ),
      orientation: {
        heading: Cesium.Math.toRadians(INITIAL_POSITION.heading),
        pitch: Cesium.Math.toRadians(INITIAL_POSITION.pitch),
        roll: Cesium.Math.toRadians(INITIAL_POSITION.roll),
      },
      duration: 2,
    });
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
      {/* Control Buttons */}
      <div className="absolute top-4 left-4 z-50 flex gap-2">
        <Button
          onClick={handleResetView}
          variant="outline"
          size="sm"
          className="bg-background/80 backdrop-blur-sm"
        >
          <Home className="h-4 w-4 mr-2" />
          Reset View
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="bg-background/80 backdrop-blur-sm"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter ({selectedCategories.length}/{allCategories.length})
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
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
      </div>

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

          <div
            style={{
              color: 'rgba(255, 255, 255, 0.7)',
              fontSize: '0.9rem',
            }}
          >
            {loadingMessage}
          </div>

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
        geocoder={false}
        homeButton={false}
        navigationHelpButton={false}
        sceneModePicker={false}
        infoBox={false}
      />
    </div>
  );
}
