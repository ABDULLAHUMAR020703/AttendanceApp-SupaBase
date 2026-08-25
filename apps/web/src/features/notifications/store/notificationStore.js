import { create } from 'zustand';
import { adminService } from '../../admin/services/adminService';

export const useNotificationStore = create((set, get) => ({
  unreadCount: 0,
  loading: false,
  refresh: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const count = await adminService.getUnreadNotificationCount();
      set({ unreadCount: Number(count) || 0 });
    } catch {
      set({ unreadCount: 0 });
    } finally {
      set({ loading: false });
    }
  },
  decrement: () => set({ unreadCount: Math.max(0, get().unreadCount - 1) }),
  clear: () => set({ unreadCount: 0 }),
}));
