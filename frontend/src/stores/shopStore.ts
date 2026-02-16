import { create } from "zustand";
import api from "../services/api";
import type { Shop } from "../types";

interface ShopState {
  shops: Shop[];
  loading: boolean;
  selectedShopId: string | null;
  fetchShops: () => Promise<void>;
  createShop: (data: {
    shop_name: string;
    tts_shop_id?: string;
    market?: string;
    category?: string;
  }) => Promise<Shop>;
  deleteShop: (id: string) => Promise<void>;
  selectShop: (id: string | null) => void;
}

export const useShopStore = create<ShopState>((set, get) => ({
  shops: [],
  loading: false,
  selectedShopId: null,

  fetchShops: async () => {
    set({ loading: true });
    try {
      const { data } = await api.get<Shop[]>("/shops/");
      set({ shops: data, loading: false });
      if (!get().selectedShopId && data.length > 0) {
        set({ selectedShopId: data[0].id });
      }
    } catch {
      set({ loading: false });
    }
  },

  createShop: async (shopData) => {
    const { data } = await api.post<Shop>("/shops/", shopData);
    set((s) => ({ shops: [data, ...s.shops] }));
    if (!get().selectedShopId) {
      set({ selectedShopId: data.id });
    }
    return data;
  },

  deleteShop: async (id) => {
    await api.delete(`/shops/${id}`);
    set((s) => ({
      shops: s.shops.filter((shop) => shop.id !== id),
      selectedShopId: s.selectedShopId === id ? null : s.selectedShopId,
    }));
  },

  selectShop: (id) => set({ selectedShopId: id }),
}));
