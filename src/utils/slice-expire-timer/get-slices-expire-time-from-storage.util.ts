import { storageKeys } from '../../constants/storage-keys.constant';

export function getSlicesExpireTimeFromStorage(): Record<string, number> {
  const storageValue: string | null = localStorage.getItem(
    storageKeys.killuaExpire
  );
  if (storageValue === null) {
    return {};
  } else {
    return JSON.parse(atob(storageValue));
  }
}
