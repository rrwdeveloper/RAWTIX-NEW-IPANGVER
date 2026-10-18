import { useEffect, useState, useCallback } from "react";

export interface StoredOrder {
  orderNumber: string;
  total: number;
  email: string;
  customerName?: string;
  createdAt: string;
  status: "pending" | "paid" | "cancelled";
  itemCount?: number;
  itemsSummary?: string;
}

const STORAGE_KEY = "rawtix_guest_orders";
const EVENT_NAME = "rawtix_orders_updated";

/**
 * Mendapatkan daftar riwayat pesanan yang tersimpan di browser/device ini
 */
export function getStoredOrders(): StoredOrder[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.error("Gagal membaca riwayat pesanan dari localStorage:", err);
    return [];
  }
}

/**
 * Menyimpan atau memperbarui pesanan ke riwayat pesanan browser
 */
export function saveOrderToHistory(order: StoredOrder): void {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredOrders();
    const existingIndex = current.findIndex(
      (item) => item.orderNumber.toUpperCase() === order.orderNumber.toUpperCase()
    );

    let updated: StoredOrder[];
    if (existingIndex >= 0) {
      // Perbarui data yang ada dengan menggabungkan field terbaru
      updated = [...current];
      updated[existingIndex] = {
        ...updated[existingIndex],
        ...order,
      };
    } else {
      // Tambahkan ke urutan paling atas
      updated = [order, ...current];
    }

    // Batasi riwayat maksimal 50 pesanan di storage lokal
    if (updated.length > 50) {
      updated = updated.slice(0, 50);
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
  } catch (err) {
    console.error("Gagal menyimpan pesanan ke localStorage:", err);
  }
}

/**
 * Memperbarui status pesanan yang sudah tersimpan
 */
export function updateStoredOrderStatus(
  orderNumber: string,
  status: "pending" | "paid" | "cancelled"
): void {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredOrders();
    const existingIndex = current.findIndex(
      (item) => item.orderNumber.toUpperCase() === orderNumber.toUpperCase()
    );

    if (existingIndex >= 0) {
      const updated = [...current];
      updated[existingIndex] = {
        ...updated[existingIndex],
        status,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
    }
  } catch (err) {
    console.error("Gagal memperbarui status pesanan di localStorage:", err);
  }
}

/**
 * Menghapus pesanan dari riwayat lokal jika diinginkan pembeli
 */
export function removeStoredOrder(orderNumber: string): void {
  if (typeof window === "undefined") return;
  try {
    const current = getStoredOrders();
    const updated = current.filter(
      (item) => item.orderNumber.toUpperCase() !== orderNumber.toUpperCase()
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: updated }));
  } catch (err) {
    console.error("Gagal menghapus pesanan dari localStorage:", err);
  }
}

/**
 * Hook React untuk mendengarkan perubahan riwayat pesanan secara realtime
 */
export function useStoredOrders() {
  const [orders, setOrders] = useState<StoredOrder[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshOrders = useCallback(() => {
    setOrders(getStoredOrders());
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    refreshOrders();

    const handleUpdate = () => {
      setOrders(getStoredOrders());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, [refreshOrders]);

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const paidOrders = orders.filter((o) => o.status === "paid");
  const cancelledOrders = orders.filter((o) => o.status === "cancelled");

  return {
    orders,
    pendingOrders,
    paidOrders,
    cancelledOrders,
    hasPending: pendingOrders.length > 0,
    isLoaded,
    refreshOrders,
  };
}
