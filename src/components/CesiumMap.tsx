'use client';

import '@/lib/cesium-setup';
import {
  useRef,
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from 'react';
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
import { MapLoadingScreen } from './MapLoadingScreen';

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

      // Calculate scaling to fit image within circle (object-fit: contain behavior)
      const imgAspect = img.width / img.height;
      const canvasAspect = size / size; // 1:1 for circle
      
      let drawWidth = size;
      let drawHeight = size;
      let drawX = 0;
      let drawY = 0;
      
      if (imgAspect > canvasAspect) {
        // Image is wider - fit to width
        drawHeight = size / imgAspect;
        drawY = (size - drawHeight) / 2;
      } else {
        // Image is taller - fit to height
        drawWidth = size * imgAspect;
        drawX = (size - drawWidth) / 2;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();

      // Draw image centered and scaled to fit
      ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
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
  dateRange?: { from?: Date; to?: Date };
  selectedCategories?: string[];
  onCategoriesChange?: (categories: string[]) => void;
  initialPosition?: { lat: number; lon: number } | null;
}

export interface CesiumMapRef {
  resetView: () => void;
  getAllCategories: () => string[];
  centerOnLocation: (lat: number, lon: number) => void;
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

const CesiumMap = forwardRef<CesiumMapRef, CesiumMapProps>(
  (
    {
      onMarkerClick,
      dateRange,
      selectedCategories = [],
      onCategoriesChange,
      initialPosition,
    },
    ref
  ) => {
    const GOOGLE_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    const ION_TOKEN = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;

    const viewerRef = useRef<CesiumComponentRef<CesiumViewer>>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingMessage, setLoadingMessage] = useState('Initializing map...');
    const [allCategories, setAllCategories] = useState<string[]>([]);

    const markersLoadedRef = useRef(false);
    const clickHandlerRef = useRef<Cesium.ScreenSpaceEventHandler | null>(null);
    const postRenderListenerRef = useRef<(() => void) | null>(null);
    const viewerReadyRef = useRef(false);

    // Expose methods to parent component
    useImperativeHandle(ref, () => ({
      resetView: handleResetView,
      getAllCategories: () => allCategories,
      centerOnLocation: handleCenterOnLocation,
    }));

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

          console.log(
            'CesiumMap initViewer - initialPosition:',
            initialPosition
          );
          const position = initialPosition || INITIAL_POSITION;
          const height = INITIAL_POSITION.height;

          // Shift latitude down by ~50 meters (0.00045 degrees) if initialPosition exists
          const lat = initialPosition ? position.lat - 0.006 : position.lat;

          console.log(
            'Using position:',
            { lon: position.lon, lat },
            'height:',
            height
          );

          viewer.camera.setView({
            destination: Cartesian3.fromDegrees(position.lon, lat, height),
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
                const position = initialPosition || INITIAL_POSITION;
                const height = INITIAL_POSITION.height;

                // Shift latitude down by ~50 meters (0.00045 degrees) if initialPosition exists
                const lat = initialPosition
                  ? position.lat - 0.006
                  : position.lat;

                viewer.camera.flyTo({
                  destination: Cartesian3.fromDegrees(
                    position.lon,
                    lat,
                    height
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
        // Notify parent of all categories initially
        if (onCategoriesChange) {
          onCategoriesChange(categories);
        }

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

    // Apply filters when selectedCategories or dateRange changes
    useEffect(() => {
      const viewer = viewerRef.current?.cesiumElement;
      if (!viewer || !viewerReadyRef.current) return;

      viewer.entities.values.forEach((entity) => {
        const entityWithCategory = entity as any;
        const category = entityWithCategory._category;
        const markerData = entityWithCategory._markerData;

        // Category filter
        const categoryMatch =
          selectedCategories.length === 0 ||
          selectedCategories.includes(category);

        // Date range filter
        let dateMatch = true;
        if ((dateRange?.from || dateRange?.to) && markerData?.date) {
          const eventDate = new Date(markerData.date);
          const eventDateNormalized = new Date(eventDate.setHours(0, 0, 0, 0));

          if (dateRange.from && dateRange.to) {
            // Both from and to dates are set - check if event is within range
            const fromNormalized = new Date(
              dateRange.from.setHours(0, 0, 0, 0)
            );
            const toNormalized = new Date(dateRange.to.setHours(0, 0, 0, 0));
            dateMatch =
              eventDateNormalized.getTime() >= fromNormalized.getTime() &&
              eventDateNormalized.getTime() <= toNormalized.getTime();
          } else if (dateRange.from) {
            // Only from date is set - show events on or after this date
            const fromNormalized = new Date(
              dateRange.from.setHours(0, 0, 0, 0)
            );
            dateMatch =
              eventDateNormalized.getTime() >= fromNormalized.getTime();
          } else if (dateRange.to) {
            // Only to date is set - show events on or before this date
            const toNormalized = new Date(dateRange.to.setHours(0, 0, 0, 0));
            dateMatch = eventDateNormalized.getTime() <= toNormalized.getTime();
          }
        }

        entity.show = categoryMatch && dateMatch;
      });
    }, [selectedCategories, dateRange]);

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

    const handleCenterOnLocation = (lat: number, lon: number) => {
      const viewer = viewerRef.current?.cesiumElement;
      if (!viewer) return;

      viewer.camera.flyTo({
        destination: Cartesian3.fromDegrees(lon, lat, 1000),
        orientation: {
          heading: Cesium.Math.toRadians(0),
          pitch: Cesium.Math.toRadians(-45),
          roll: Cesium.Math.toRadians(0),
        },
        duration: 2,
      });
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
        <MapLoadingScreen isLoading={isLoading} />

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
);

CesiumMap.displayName = 'CesiumMap';

export default CesiumMap;
