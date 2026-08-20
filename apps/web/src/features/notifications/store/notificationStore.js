import { create } from 'zustand';
import { adminService } from '../../admin/services/adminService';
import { countMockUnread, isMockFallbackActive } from '../mockNotifications';

export const useNotificationStore = create((set, get) => ({
  unreadCount: 0,
  loading: false,
  refresh: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const count = await adminService.getUnreadNotificationCount();
      set({ unreadCount: count || (isMockFallbackActive() ? countMockUnread() : 0) });
    } catch {
      if (isMockFallbackActive()) set({ unreadCount: countMockUnread() });
    } finally {
      set({ loading: false });
    }
  },
  decrement: () => set({ unreadCount: Math.max(0, get().unreadCount - 1) }),
  clear: () => set({ unreadCount: 0 }),
}));
