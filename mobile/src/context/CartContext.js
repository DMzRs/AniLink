import React, { createContext, useContext, useMemo, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]); // {product, qty}
  const [fulfillment, setFulfillment] = useState('delivery'); // delivery | pickup
  const [orderType, setOrderType] = useState('retail'); // retail | bulk

  const add = (product, qty = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((i) => i.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { product, qty }];
    });
  };

  const updateQty = (productId, qty) => {
    if (qty <= 0) setItems((prev) => prev.filter((i) => i.product.id !== productId));
    else setItems((prev) => prev.map((i) => (i.product.id === productId ? { ...i, qty } : i)));
  };

  const remove = (productId) => setItems((prev) => prev.filter((i) => i.product.id !== productId));
  const clear = () => setItems([]);

  const unitPriceFor = (product, qty, type) => {
    if (type === 'bulk' && product.bulk_price && product.min_bulk_quantity && qty >= product.min_bulk_quantity) {
      return product.bulk_price;
    }
    return product.price_per_unit;
  };

  const subtotal = useMemo(
    () => items.reduce((sum, { product, qty }) => sum + unitPriceFor(product, qty, orderType) * qty, 0),
    [items, orderType]
  );

  const deliveryFee = fulfillment === 'delivery' ? (subtotal > 0 ? 45 : 0) : 0;
  const total = subtotal + deliveryFee;
  const count = items.reduce((n, i) => n + i.qty, 0);

  return (
    <CartContext.Provider
      value={{ items, add, updateQty, remove, clear, fulfillment, setFulfillment, orderType, setOrderType, unitPriceFor, subtotal, deliveryFee, total, count }}
    >
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => {
  const v = useContext(CartContext);
  if (!v) throw new Error('useCart must be inside CartProvider');
  return v;
};
