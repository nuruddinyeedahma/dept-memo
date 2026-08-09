import { useEffect } from 'react';

export default function useLockBodyScroll(active = true) {
  useEffect(() => {
    if (!active) return undefined;
    const original = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = original;
    };
  }, [active]);
}
