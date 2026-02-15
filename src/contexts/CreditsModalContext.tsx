import React, { createContext, useContext, useState, useCallback } from 'react';
import { UpsellModal } from '@/components/modals/UpsellModal';
import { BuyCreditsModal } from '@/components/modals/BuyCreditsModal';
import { usePlanPermissions } from '@/hooks/usePlanPermissions';

interface CreditsModalContextType {
  showUpsell: () => void;
  showBuyCredits: () => void;
}

const CreditsModalContext = createContext<CreditsModalContextType>({
  showUpsell: () => {},
  showBuyCredits: () => {},
});

export function useCreditsModals() {
  return useContext(CreditsModalContext);
}

export function CreditsModalProvider({ children }: { children: React.ReactNode }) {
  const [upsellOpen, setUpsellOpen] = useState(false);
  const [buyCreditsOpen, setBuyCreditsOpen] = useState(false);
  const { canBuyCredits } = usePlanPermissions();

  const showUpsell = useCallback(() => setUpsellOpen(true), []);

  const showBuyCredits = useCallback(() => {
    if (canBuyCredits) {
      setBuyCreditsOpen(true);
    } else {
      setUpsellOpen(true);
    }
  }, [canBuyCredits]);

  return (
    <CreditsModalContext.Provider value={{ showUpsell, showBuyCredits }}>
      {children}
      <UpsellModal
        open={upsellOpen}
        onOpenChange={setUpsellOpen}
        onBuyCredits={() => {
          setUpsellOpen(false);
          if (canBuyCredits) {
            setBuyCreditsOpen(true);
          }
        }}
      />
      <BuyCreditsModal open={buyCreditsOpen} onOpenChange={setBuyCreditsOpen} />
    </CreditsModalContext.Provider>
  );
}
