import { storageKeys } from '../../constants/storage-keys.constant';
import {
  TConfig,
  TDefaultServer,
  TReducers,
  TSelectors
} from '../../types/config.type';
import { generateSliceConfigChecksum } from './generate-slice-config-checksum.util';
import { getSlicesChecksumFromStorage } from './get-slices-checksum-from-storage.util';

export function setSliceConfigChecksumToStorage<
  GSlice,
  GDefaultServer extends TDefaultServer<GSlice>,
  GSelectors extends TSelectors<GSlice>,
  GReducers extends TReducers<GSlice>
>(params: {
  config: TConfig<GSlice, GDefaultServer, GSelectors, GReducers>;
}): string | null {
  // generate slice checksum
  const sliceChecksum: string = generateSliceConfigChecksum({
    config: params.config
  });

  // set `killuaChecksum` with current slice checksum to storage
  const storageValue: Record<string, string> = getSlicesChecksumFromStorage();
  storageValue[params.config.key] = sliceChecksum;

  localStorage.setItem(
    storageKeys.killuaChecksum,
    btoa(JSON.stringify(storageValue))
  );

  return sliceChecksum;
}
