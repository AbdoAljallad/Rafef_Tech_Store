import { useAuthStore } from '../../modules/auth/stores/authStore';

export function usePermission(permission?: string) {
  return useAuthStore((state) => {
    if (!permission) {
      return true;
    }

    return state.permissions.has(permission);
  });
}
