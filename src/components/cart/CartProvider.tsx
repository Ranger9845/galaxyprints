"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface CartItem {
  productId: string;
  slug: string;
  name: string;
  priceCents: number;
  imageEmoji: string;
  color: string;
  material: string;
  quantity: number;
  stock: number;
}

interface CartContextValue {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  removeItem: (productId: string) => void;
  setQuantity: (productId: string, quantity: number) => void;
  clear: () => void;
  subtotalCents: number;
  totalQuantity: number;
}

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "galaxyprints_cart";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      // One-time hydration from localStorage on mount; must stay in an effect
      // (not a lazy useState initializer) so SSR output matches the first
      // client render and we avoid a hydration mismatch.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore corrupt local storage
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "quantity">, quantity = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.productId === item.productId);
      if (existing) {
        const nextQty = Math.min(existing.quantity + quantity, item.stock);
        return prev.map((i) => (i.productId === item.productId ? { ...i, quantity: nextQty } : i));
      }
      return [...prev, { ...item, quantity: Math.min(quantity, item.stock) }];
    });
  }, []);

  const removeItem = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.productId !== productId));
  }, []);

  const setQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      prev
        .map((i) =>
          i.productId === productId ? { ...i, quantity: Math.max(0, Math.min(quantity, i.stock)) } : i
        )
        .filter((i) => i.quantity > 0)
    );
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const subtotalCents = useMemo(
    () => items.reduce((sum, i) => sum + i.priceCents * i.quantity, 0),
    [items]
  );
  const totalQuantity = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const value = useMemo(
    () => ({ items, addItem, removeItem, setQuantity, clear, subtotalCents, totalQuantity }),
    [items, addItem, removeItem, setQuantity, clear, subtotalCents, totalQuantity]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
