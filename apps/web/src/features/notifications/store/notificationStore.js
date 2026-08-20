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
      const next = count || 0;
      // Skip identity churn when the badge value is unchanged.
      if (next !== get().unreadCount) set({ unreadCount: next });
    } catch {
      /* keep last count */
    } finally {
      set({ loading: false });
    }
  },
  decrement: () => set({ unreadCount: Math.max(0, get().unreadCount - 1) }),
  clear: () => set({ unreadCount: 0 }),
}));
