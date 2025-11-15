'use client';

console.log("cesium-setup.ts loaded");

if (typeof window !== 'undefined') {
    // Make Cesium find its Workers/Assets/Widgets under /cesium
    (window as any).CESIUM_BASE_URL = '/cesium';
}