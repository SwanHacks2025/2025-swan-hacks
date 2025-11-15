'use client';

import dynamic from 'next/dynamic';

const CesiumMap = dynamic(() => import('@/components/CesiumMap'), {
    ssr: false,
    loading: () => <div>Loading map...</div>,
});

export default function Home() {
    return (
        <main style={{ backgroundColor: '#fff', display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{height: '500px', width: '900px' }}>
                <CesiumMap />
            </div>
        </main>
    );
}