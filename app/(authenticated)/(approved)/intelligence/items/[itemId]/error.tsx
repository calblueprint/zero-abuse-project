"use client";

export default function IntelItemError({ reset }: { reset: () => void }) {
  return (
    <main style={{ padding: "92px 24px", textAlign: "center" }}>
      <h1>Unable to load intelligence item</h1>
      <p>Please try again.</p>
      <button type="button" onClick={reset}>
        Retry
      </button>
    </main>
  );
}
