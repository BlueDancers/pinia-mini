import {
  computed,
  ComputedRef,
  effectScope,
  EffectScope,
  inject,
  markRaw,
  reactive,
  toRaw,
  toRefs,
} from "vue";
import { getCurrentInstance } from "vue";
import { piniaSymbol } from "./helper";

/**
 * 创建store
 * @param options
 * @returns
 */
export function defineStore(options: {
  id: string;
  state: any;
  getters: any;
  actions: any;
}) {
  let { id, state, actions } = options;

  // 实际运行函数
  function useStore() {
    const currentInstance = getCurrentInstance();
    let pinia: any;
    if (currentInstance) {
      pinia = inject(piniaSymbol);
    }
    if (!pinia) {
      throw new Error("super-mini-pinia在mian中注册了吗?");
    }
    // 单例模式
    if (!pinia._s.has(id)) {
      createOptionsStore(id, options, pinia);
    }
    const store = pinia._s.get(id);
    console.log(pinia);

    return store;
  }
  useStore.$id = id;
  return useStore;
}

/**
 * 处理state getters
 * @param id
 * @param options
 * @param pinia
 */
function createOptionsStore(id: string, options: any, pinia: any) {
  const { state, actions, getters } = options;
  function setup() {
    pinia.state.value[id] = state ? state() : {};
    const localState = toRefs(pinia.state.value[id]);
    let allData = Object.assign(
      localState,
      actions,
      Object.keys(getters || {}).reduce((computedGetters, name) => {
        computedGetters[name] = markRaw(
          computed(() => {
            const store = pinia._s.get(id)!;
            return getters![name].call(store, store);
          })
        );
        return computedGetters;
      }, {} as Record<string, ComputedRef>)
    );
    return allData;
  }
  let store = createSetupStore(id, setup, options, pinia);
  return store;
}

/**
 * 处理action以及配套API将其加入store
 * @param $id
 * @param setup
 * @param options
 * @param pinia
 */
function createSetupStore($id: string, setup: any, options: any, pinia: any) {
  let partialStore = {
    _p: pinia,
    $id,
    $reset: () => console.log("reset"),
    $patch: () => console.log("patch"),
    $onAction: () => console.log("onAction"),
    $subscribe: () => console.log("subscribe"),
    $dispose: () => console.log("dispose"),
  };

  let scope!: EffectScope;
  const setupStore = pinia._e.run(() => {
    scope = effectScope();
    return scope.run(() => setup());
  });

  for (const key in setupStore) {
    const prop = setupStore[key];
    if (typeof prop === "function") {
      setupStore[key] = prop;
    }
  }

  const store: any = reactive(
    Object.assign(toRaw({}), partialStore, setupStore)
  );
  pinia._s.set($id, store);
  return store;
}
