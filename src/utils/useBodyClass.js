import { useEffect } from 'react';

// Toggles a class on <body> while the calling component is mounted. Used to
// keep body's own background in sync with whichever full-page gradient is
// showing — index.css otherwise leaves body on a fixed default color, and a
// brief scroll-bounce/overscroll flash reveals that mismatched color instead
// of the page's own background.
export function useBodyClass(className) {
  useEffect(() => {
    document.body.classList.add(className);
    return () => document.body.classList.remove(className);
  }, [className]);
}
