import { useContext } from 'react';
import { ShopsContext } from '@/contexts/ShopsContext';

export function useShops() {
  const ctx = useContext(ShopsContext);
  if (!ctx) throw new Error('useShops must be used within ShopsProvider');
  return ctx;
}
