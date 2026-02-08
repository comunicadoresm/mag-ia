export function useHotmartCheckout() {
  const openCheckout = (hotmartUrl: string) => {
    if (!hotmartUrl) return;
    window.open(hotmartUrl, '_blank', 'noopener,noreferrer');
  };

  return { openCheckout };
}
