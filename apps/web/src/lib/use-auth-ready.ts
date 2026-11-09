import { useSyncExternalStore } from 'react';
import { useAuthStore } from './auth-store';

// Trả về true khi trạng thái đăng nhập đã được đọc xong từ localStorage.
// Trước thời điểm đó token luôn là null nên chưa được kết luận "chưa đăng nhập".
export function useAuthReady(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => useAuthStore.persist.onFinishHydration(onStoreChange),
    () => useAuthStore.persist.hasHydrated(),
    () => false,
  );
}
