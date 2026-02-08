import React, { createContext, useContext, useState, useCallback } from 'react';
import { UpsellModal } from '@/components/modals/UpsellModal';
import { BuyCreditsModal } from '@/components/modals/BuyCreditsModal';

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

  const showUpsell = useCallback(() => setUpsellOpen(true), []);
  const showBuyCredits = useCallback(() => setBuyCreditsOpen(true), []);

  return (
    <CreditsModalContext.Provider value={{ showUpsell, showBuyCredits }}>
      {children}
      <UpsellModal
        open={upsellOpen}
        onOpenChange={setUpsellOpen}
        onBuyCredits={() => {
          setUpsellOpen(false);
          setBuyCreditsOpen(true);
        }}
      />
      <BuyCreditsModal open={buyCreditsOpen} onOpenChange={setBuyCreditsOpen} />
    </CreditsModalContext.Provider>
  );
}
