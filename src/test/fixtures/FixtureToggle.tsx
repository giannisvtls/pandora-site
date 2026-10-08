import { useState } from 'preact/hooks';

// Test-only island: proves Preact components render and respond to events under Vitest + jsdom.
// Nothing outside src/test imports it, so it never reaches the build output.
export default function FixtureToggle() {
  const [pressed, setPressed] = useState(false);

  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={() => {
        setPressed((value) => !value);
      }}
    >
      Fixture toggle
    </button>
  );
}
