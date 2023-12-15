import { TConfig } from '../types/config.type';
import decrypt from './decrypt.util';
import encrypt from './encrypt.util';
import { getSaltKey } from './get-salt-key.util';
import timeStringToSeconds from './time-string-to-second.util';

function setSlicesExpireKeyToLocalstorage<TSlice>(params: {
  config: TConfig<TSlice>;
  default: Record<string, number>;
}): void {
  if (params.config.expire) {
    new BroadcastChannel('killua').postMessage({
      type: 'localstorage-slice-value-not-valid-and-removed',
      key: params.config.key,
    });
  }
  localStorage.setItem(
    'slices-expire-time',
    encrypt({ data: params.default, saltKey: getSaltKey() }),
  );
}

export function getSlicesExpireFromLocalStorage<TSlice>(params: {
  config: TConfig<TSlice>;
}): Record<string, number> {
  // default is `{ [params.config.key]: (params.config.expire ? slice expire timestamp : null)}` (update after get `slices-expire` from localstorage)
  let returnValue: Record<string, number> = {
    ...(params.config.expire && {
      [params.config.key]:
        Date.now() +
        timeStringToSeconds({ timeString: params.config.expire }) * 1000,
    }),
  };

  // get slices expire timestamp from localstorage ((if not exist || is-not valid) && set slices expire key to localstorage)
  try {
    const localStorageValue: string | null =
      localStorage.getItem('slices-expire-time');
    if (localStorageValue) {
      const decryptedStorageValue: Record<string, number> = decrypt({
        data: localStorageValue,
        saltKey: getSaltKey(),
      });
      returnValue = decryptedStorageValue;
    } else {
      setSlicesExpireKeyToLocalstorage({
        config: params.config,
        default: returnValue,
      });
    }
  } catch (error) {
    setSlicesExpireKeyToLocalstorage({
      config: params.config,
      default: returnValue,
    });
  }

  return returnValue;
}