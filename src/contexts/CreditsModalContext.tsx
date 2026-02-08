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
  const { planType } = usePlanPermissions();

  const showUpsell = useCallback(() => setUpsellOpen(true), []);
  
  // Only magnetic users can access BuyCreditsModal
  const showBuyCredits = useCallback(() => {
    if (planType === 'magnetic') {
      setBuyCreditsOpen(true);
    } else {
      // For basic users, show upsell to magnetic instead
      setUpsellOpen(true);
    }
  }, [planType]);

  return (
    <CreditsModalContext.Provider value={{ showUpsell, showBuyCredits }}>
      {children}
      <UpsellModal
        open={upsellOpen}
        onOpenChange={setUpsellOpen}
        onBuyCredits={() => {
          setUpsellOpen(false);
          if (planType === 'magnetic') {
            setBuyCreditsOpen(true);
          }
        }}
      />
      {planType === 'magnetic' && (
        <BuyCreditsModal open={buyCreditsOpen} onOpenChange={setBuyCreditsOpen} />
      )}
    </CreditsModalContext.Provider>
  );
}
