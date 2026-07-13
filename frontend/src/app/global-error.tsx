'use client';

// Catches errors in the root layout itself; must render its own <html>/<body>.
export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en" className="dark">
      <body
        style={{
          display: 'flex',
          minHeight: '100vh',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, sans-serif',
          background: '#08090a',
          color: '#e9eaec',
          gap: '12px',
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 600 }}>Something went wrong</h1>
        <button
          onClick={reset}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            background: '#5e6ad2',
            color: 'white',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
