import { useEffect, useState } from 'react';

/**
 * Gives a temporary URL for a file or blob held in memory, so an <img> can display it.
 * The browser keeps the data alive for as long as the URL exists, so the URL is released
 * when the blob changes or the component leaves the screen.
 */
export function useObjectUrl(blob: Blob | null): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (blob === null) {
      return;
    }
    const url = URL.createObjectURL(blob);
    // The lint rule warns that state set in an effect can usually be derived during render.
    // Not here: the URL must be created and released as a pair, and only an effect has a cleanup.
    // oxlint-disable-next-line react/set-state-in-effect
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
      setObjectUrl(null);
    };
  }, [blob]);

  return objectUrl;
}
