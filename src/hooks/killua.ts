import * as CryptoJS from 'crypto-js';
import { useEffect, useState } from 'react';
import { ThunderType } from '../types/thunder.type';
import { RemoveNeverProperties } from '../utills';
import { useSSRKillua } from '../providers/ssr';

type Tail<T extends any[]> = T extends [any, ...infer Rest] ? Rest : never;
type RemoveFirstArg<T> = T extends (...args: infer Args) => infer R
  ? (...args: Tail<Args>) => R
  : T;

//* get uniqe user id for salt key
function getUniqeUserId(): string {
  let parsedValue = '';
  function setSaltKeyToLocalstorage(): void {
    parsedValue = Math.floor(Math.random() * Date.now()).toString(36);
    localStorage.setItem(
      'thundersSaltKey',
      CryptoJS.AES.encrypt(parsedValue, 'thunder').toString(),
    );
  }
  const localStorageValue = localStorage.getItem('thundersSaltKey');
  if (localStorageValue) {
    try {
      parsedValue = CryptoJS.AES.decrypt(localStorageValue, 'thunder').toString(
        CryptoJS.enc.Utf8,
      );
    } catch {
      setSaltKeyToLocalstorage();
    }
  } else {
    setSaltKeyToLocalstorage();
  }
  return parsedValue;
}

function useKillua<
  TDefault,
  TEvents extends
    | {
        initialize?: (state: TDefault) => void;
        update?: (state: TDefault) => void;
      }
    | undefined,
  TReducers extends
    | Record<string, (thunder: TDefault, payload?: any) => TDefault>
    | undefined = undefined,
  TSelectors extends
    | Record<string, (thunder: TDefault, payload?: any) => any>
    | undefined = undefined,
  TExpire extends null | number = null,
>(
  args: ThunderType<TDefault, TEvents, TReducers, TSelectors, TExpire>,
): RemoveNeverProperties<{
  thunder: TDefault;
  setThunder: (value: TDefault | ((value: TDefault) => TDefault)) => void;
  reducers: [TReducers] extends [undefined]
    ? never
    : {
        [K in keyof TReducers]: RemoveFirstArg<TReducers[K]>;
      };
  selectors: [TSelectors] extends [undefined]
    ? never
    : {
        [K in keyof TSelectors]: RemoveFirstArg<TSelectors[K]>;
      };
  isReadyInSsr: boolean;
}> {
  //* current thunder key name in localstorage
  const thunderKeyName = `thunder${args.key
    .charAt(0)
    .toUpperCase()}${args.key.slice(1)}`;

  //* broadcast channel
  const broadcastChannel = new BroadcastChannel('killua');

  //* broadcast channel for run update thunder
  useEffect(() => {
    broadcastChannel.onmessage = (e) => {
      if (e.data === 'updateThunder') {
        const thunderLocalstorage = getThunderFromLocalstorage();
        setThunderState(thunderLocalstorage);
        if (args.events?.update) {
          args.events.update(thunderLocalstorage);
        }
      }
    };
  }, []);

  //* set to localstorage
  function setToLocalstorage(args: {
    key: string;
    data: any;
    encrypt: boolean;
  }): void {
    localStorage.setItem(
      args.key,
      args.encrypt
        ? CryptoJS.AES.encrypt(
            JSON.stringify(args.data),
            getUniqeUserId(),
          ).toString()
        : JSON.stringify(args.data),
    );
  }

  //* get thunder from localstorage
  function getThunderFromLocalstorage(): any {
    // if ssr and not wrapped with SSRKilluaProvider && throw error
    if (typeof window === 'undefined')
      throw new Error(
        'please wrap your app with <SSRKilluaProvider></SSRKilluaProvider> in ssr',
      );
    // if thunder config property 'encrypt' and 'default' and 'expire' not changed by developer && get thunder from localStorage
    let parsedValue = args.default;
    if (
      Object(getThundersChecksumFromLocalstorage())[thunderKeyName] ===
      CryptoJS.MD5(
        JSON.stringify({
          default: args.default,
          encrypt: args.encrypt,
          expire: args.expire,
        }),
      ).toString()
    ) {
      const localStorageValue = localStorage.getItem(thunderKeyName);
      if (localStorageValue) {
        try {
          parsedValue = JSON.parse(
            args.encrypt
              ? CryptoJS.AES.decrypt(
                  localStorageValue,
                  getUniqeUserId(),
                ).toString(CryptoJS.enc.Utf8)
              : localStorageValue,
          );
        } catch {
          setThunderToLocalstorageAndStateHandler({
            key: thunderKeyName,
            data: args.default,
            encrypt: args.encrypt,
          });
        }
      } else {
        setThunderToLocalstorageAndStateHandler({
          key: thunderKeyName,
          data: args.default,
          encrypt: args.encrypt,
        });
      }
    }
    return parsedValue;
  }

  //* get 'thundersExpire' from localStorage
  function getThundersExpireFromLocalstorage(): Object {
    const removeAllThundersFromLocalstorage = () => {
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('thunder') && key !== 'thunderExpire') {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((key) => {
        localStorage.removeItem(key);
      });
    };
    let parsedValue = {};
    const localStorageValue = localStorage.getItem('thundersExpire');
    if (localStorageValue) {
      try {
        parsedValue = JSON.parse(
          CryptoJS.AES.decrypt(localStorageValue, getUniqeUserId()).toString(
            CryptoJS.enc.Utf8,
          ),
        );
      } catch {
        setToLocalstorage({
          key: 'thundersExpire',
          data: {},
          encrypt: true,
        });
        removeAllThundersFromLocalstorage();
      }
    } else {
      setToLocalstorage({
        key: 'thundersExpire',
        data: {},
        encrypt: true,
      });
      removeAllThundersFromLocalstorage();
    }
    return parsedValue;
  }

  //* get 'thundersChecksum' from localStorage
  function getThundersChecksumFromLocalstorage(): Object {
    let parsedValue = {};
    const localStorageValue = localStorage.getItem('thundersChecksum');
    if (localStorageValue) {
      try {
        parsedValue = JSON.parse(
          CryptoJS.AES.decrypt(localStorageValue, getUniqeUserId()).toString(
            CryptoJS.enc.Utf8,
          ),
        );
      } catch {
        setToLocalstorage({
          key: 'thundersChecksum',
          data: {},
          encrypt: true,
        });
      }
    } else {
      setToLocalstorage({
        key: 'thundersChecksum',
        data: {},
        encrypt: true,
      });
    }
    return parsedValue;
  }

  //* detect change thunder config by developer and create again thunder key in localstorage
  useEffect(() => {
    setTimeout(() => {
      const thundersChecksumLocalstorage =
        getThundersChecksumFromLocalstorage();
      // update thunder checksum property 'encrypt' and 'default' and 'expire' in localStorage && reset thunder-key&thunder-state to default value handler
      const updateThunderChecksumHandler = (): void => {
        Object(thundersChecksumLocalstorage)[thunderKeyName] = CryptoJS.MD5(
          JSON.stringify({
            default: args.default,
            encrypt: args.encrypt,
            expire: args.expire,
          }),
        ).toString();
        setToLocalstorage({
          key: 'thundersChecksum',
          data: thundersChecksumLocalstorage,
          encrypt: true,
        });
        setThunderToLocalstorageAndStateHandler({
          key: thunderKeyName,
          data: args.default,
          encrypt: args.encrypt,
        });
      };
      // update expire time in 'thundersExpire' object
      function updateExpireTimeHandler(): void {
        const thundersExpireLocalstorage = getThundersExpireFromLocalstorage();
        Object(thundersExpireLocalstorage)[thunderKeyName] =
          args.expire === null ? null : Date.now() + args.expire * 60 * 1000;
        setToLocalstorage({
          key: 'thundersExpire',
          data: thundersExpireLocalstorage,
          encrypt: true,
        });
      }
      thundersChecksumLocalstorage;
      // if 'thundersChecksum' is not in localStorage ? (add key to 'thundersChecksum' with checksum property 'encrypt' and 'default' and 'expire' && update thunder expire with args.expire && reset thunder-key&thunder-state to default value) : (if changed thunder config by developer && (update checksum && reset thunder-key&thunder-state to default value))
      if (!thundersChecksumLocalstorage.hasOwnProperty(thunderKeyName)) {
        updateThunderChecksumHandler();
        updateExpireTimeHandler();
      } else {
        if (
          Object(thundersChecksumLocalstorage)[thunderKeyName] !==
          CryptoJS.MD5(
            JSON.stringify({
              default: args.default,
              encrypt: args.encrypt,
              expire: args.expire,
            }),
          ).toString()
        ) {
          updateThunderChecksumHandler();
          updateExpireTimeHandler();
        }
      }
    }, 200);
  }, []);

  //* thunder state with initial-value from localstorage
  const isServer = useSSRKillua();
  const [isInitializedThunderState, setIsInitializedThunderState] =
    useState<boolean>(false);
  const [thunderState, setThunderState] = useState<any>(
    isServer
      ? undefined
      : () => {
          return getThunderFromLocalstorage();
        },
  );
  useEffect(() => {
    if (isServer) {
      const thunderLocalstorageValue = getThunderFromLocalstorage();
      if (thunderLocalstorageValue !== thunderState) {
        setThunderState(getThunderFromLocalstorage());
      }
    }
  }, []);

  //* initialize thunder event call
  useEffect(() => {
    if (thunderState !== undefined && !isInitializedThunderState) {
      setIsInitializedThunderState(true);
      if (args.events && args.events.initialize) {
        args.events.initialize(thunderState);
      }
    }
  }, [thunderState]);

  //* set thunder to localstorage and state handler
  function setThunderToLocalstorageAndStateHandler(args: {
    key: string;
    data: TDefault;
    encrypt: boolean;
  }): void {
    setToLocalstorage({
      key: thunderKeyName,
      data: args.data,
      encrypt: args.encrypt,
    });
    setThunderState(args.data);
  }

  //* update thunder state after updated localstorage value
  useEffect(() => {
    const getUpdatedThunderFromLocalstorage = (): void => {
      if (
        Object(getThundersChecksumFromLocalstorage())[thunderKeyName] ===
        CryptoJS.MD5(
          JSON.stringify({
            default: args.default,
            encrypt: args.encrypt,
            expire: args.expire,
          }),
        ).toString()
      ) {
        const thunderLocalstorageValue = getThunderFromLocalstorage();
        if (thunderLocalstorageValue !== thunderState) {
          setThunderState(getThunderFromLocalstorage());
        }
      }
    };
    window.addEventListener('storage', getUpdatedThunderFromLocalstorage);
    return (): void => {
      window.removeEventListener('storage', getUpdatedThunderFromLocalstorage);
    };
  }, []);

  //* set expire time and remove expired thunder from localstorage
  useEffect(() => {
    let intervalId: any;
    const thundersExpireLocalstorage = getThundersExpireFromLocalstorage();
    // function for set expire time to 'thundersExpire' object
    function addThunderToThundersExpireLocalstorageHandler() {
      Object(thundersExpireLocalstorage)[thunderKeyName] =
        args.expire === null ? null : Date.now() + args.expire * 60 * 1000;
      setToLocalstorage({
        key: 'thundersExpire',
        data: thundersExpireLocalstorage,
        encrypt: true,
      });
    }

    // function for remove expired thunder from localStorage and 'thundersExpire'
    function removeExpiredThunderHandler() {
      setThunderToLocalstorageAndStateHandler({
        key: thunderKeyName,
        data: args.default,
        encrypt: args.encrypt,
      });
      addThunderToThundersExpireLocalstorageHandler();
    }
    // if thunder is not in 'thundersExpire' object && push it to 'thundersExpire' with expire time
    if (!thundersExpireLocalstorage.hasOwnProperty(thunderKeyName)) {
      addThunderToThundersExpireLocalstorageHandler();
    }
    // if thunder is with expired time in 'thundersExpire' object ? (if thunder expired ? remove from localStorage and 'thundersExpire' object) : (setInterval for remove from localStorage and 'thundersExpire' object)
    if (Object(thundersExpireLocalstorage)[thunderKeyName]) {
      if (Date.now() > Object(thundersExpireLocalstorage)[thunderKeyName]) {
        removeExpiredThunderHandler();
      } else {
        intervalId = setInterval(
          () => {
            removeExpiredThunderHandler();
          },
          Object(thundersExpireLocalstorage)[thunderKeyName] - Date.now(),
        );
      }
    }
    return (): void => {
      clearInterval(intervalId);
    };
  }, [thunderState]);

  //* return thunder state and setThunder state function and detect isReady thunder state and reducers object
  // assign thunder config reducers to reducers object
  const reducers: Record<string, Function> = {};
  if (args.reducers) {
    for (const actionName in args.reducers) {
      if (Object.prototype.hasOwnProperty.call(args.reducers, actionName)) {
        const actionFunc = args.reducers[actionName];
        reducers[actionName] = (payload: any) => {
          setToLocalstorage({
            key: thunderKeyName,
            data: (actionFunc as (prev: TDefault, payload: any) => TDefault)(
              thunderState,
              payload,
            ),
            encrypt: args.encrypt,
          });
          // update thunder event call
          if (thunderState !== getThunderFromLocalstorage()) {
            broadcastChannel.postMessage('updateThunder');
          }
        };
      }
    }
  }
  // assign thunder config selectors to selectors with object
  const selectors: Record<string, (payload?: any) => any> = {};
  if (args.selectors) {
    for (const selectorName in args.selectors) {
      if (Object.prototype.hasOwnProperty.call(args.selectors, selectorName)) {
        const selectorFunc = args.selectors[selectorName];
        selectors[selectorName] = (payload: any) =>
          (selectorFunc as (prev: TDefault, payload: any) => any)(
            thunderState,
            payload,
          );
      }
    }
  }
  // handler for update thunder state
  function setThunderHandler(
    value: TDefault | ((prev: TDefault) => TDefault),
  ): void {
    if (typeof value === 'function') {
      setThunderToLocalstorageAndStateHandler({
        key: thunderKeyName,
        data: (value as (prev: TDefault) => TDefault)(thunderState),
        encrypt: args.encrypt,
      });
    } else {
      setToLocalstorage({
        key: thunderKeyName,
        data: value,
        encrypt: args.encrypt,
      });
    }
    // update thunder event call
    if (thunderState !== getThunderFromLocalstorage()) {
      broadcastChannel.postMessage('updateThunder');
    }
  }

  return {
    thunder: thunderState,
    setThunder: setThunderHandler,
    reducers,
    selectors,
    isReadyInSsr: thunderState !== undefined,
  } as any;
}

export default useKillua;
