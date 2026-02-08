import { useEffect, useRef } from 'react';

const HOTMART_SCRIPT_URL = 'https://static.hotmart.com/checkout/widget.min.js';
const HOTMART_CSS_URL = 'https://static.hotmart.com/css/hotmart-fb.min.css';

let loaded = false;

function ensureHotmartLoaded() {
  if (loaded) return;
  loaded = true;

  const script = document.createElement('script');
  script.src = HOTMART_SCRIPT_URL;
  script.async = true;
  document.head.appendChild(script);

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = HOTMART_CSS_URL;
  document.head.appendChild(link);
}

export function useHotmartCheckout() {
  useEffect(() => {
    ensureHotmartLoaded();
  }, []);

  const openCheckout = (hotmartUrl: string) => {
    // Create a temporary invisible anchor and click it to trigger the Hotmart widget
    const anchor = document.createElement('a');
    anchor.href = hotmartUrl;
    anchor.className = 'hotmart-fb hotmart__button-checkout';
    anchor.style.display = 'none';
    anchor.onclick = () => false;
    document.body.appendChild(anchor);
    anchor.click();
    // Clean up after a short delay
    setTimeout(() => document.body.removeChild(anchor), 500);
  };

  return { openCheckout };
}
