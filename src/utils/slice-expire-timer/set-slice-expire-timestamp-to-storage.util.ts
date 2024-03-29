import { storageKeys } from '../../constants/storage-keys.constant';
import {
  TConfig,
  TDefaultServer,
  TReducers,
  TSelectors
} from '../../types/config.type';
import { getSlicesExpireTimeFromStorage } from './get-slices-expire-time-from-storage.util';
import { timeStringToSeconds } from './time-string-to-second.util';

export function setSliceExpireTimestampToStorage<
  GSlice,
  GDefaultServer extends TDefaultServer<GSlice>,
  GSelectors extends TSelectors<GSlice>,
  GReducers extends TReducers<GSlice>
>(params: {
  config: TConfig<GSlice, GDefaultServer, GSelectors, GReducers>;
}): number | null {
  // params.config.expire ? slice expire timestamp : null
  const sliceExpireTimestamp: null | number = params.config.expire
    ? Date.now() +
      timeStringToSeconds({
        timeString: params.config.expire
      }) *
        1000
    : null;

  // set `killuaExpire` with current slice expire timestamp to storage
  const storageValue: Record<string, number> = getSlicesExpireTimeFromStorage();
  if (sliceExpireTimestamp) {
    storageValue[params.config.key] = sliceExpireTimestamp;
  }
  localStorage.setItem(
    storageKeys.killuaExpire,
    btoa(JSON.stringify(storageValue))
  );

  return sliceExpireTimestamp;
}
