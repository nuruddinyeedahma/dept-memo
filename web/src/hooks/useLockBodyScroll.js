import { useEffect } from 'react';

// overflow:hidden on body alone doesn't block touch-driven scroll on iOS Safari
// (including standalone PWA mode) - pinning the body with position:fixed at its
// current scroll offset is the technique that actually holds there.
export default function useLockBodyScroll(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const { body } = document;
    const scrollY = window.scrollY;
    const original = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';

    return () => {
      body.style.position = original.position;
      body.style.top = original.top;
      body.style.left = original.left;
      body.style.right = original.right;
      body.style.width = original.width;
      body.style.overflow = original.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [active]);
}
