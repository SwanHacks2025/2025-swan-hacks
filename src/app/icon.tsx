import { ImageResponse } from 'next/og';

// Route segment config
export const size = {
  width: 64,
  height: 64,
};

export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: '#028174',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '12px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffe3b3',
            fontSize: 40,
            fontWeight: 'bold',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            letterSpacing: '-2px',
          }}
        >
          GP
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
