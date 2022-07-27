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
  let { id } = options;
  // 实际运行函数
  function useStore() {
    const currentInstance = getCurrentInstance(); // 获取实例
    let pinia: any;
    if (currentInstance) {
      pinia = inject(piniaSymbol); // 获取install阶段的pinia
    }
    if (!pinia) {
      throw new Error("super-mini-pinia在mian中注册了吗?");
    }
    if (!pinia._s.has(id)) {
      // 第一次会不存在，单例模式
      createOptionsStore(id, options, pinia);
    }
    const store = pinia._s.get(id); // 获取当前store的全部数据
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
    pinia.state.value[id] = state ? state() : {}; // pinia.state是Ref
    const localState = toRefs(pinia.state.value[id]);
    return Object.assign(
      localState, // 被ref处理后的state
      actions, // store的action
      Object.keys(getters || {}).reduce((computedGetters, name) => {
        computedGetters[name] = markRaw(
          computed(() => {
            const store = pinia._s.get(id)!;
            return getters![name].call(store, store);
          })
        );
        return computedGetters;
      }, {} as Record<string, ComputedRef>) // 将getters处理为computed
    );
  }
  let store = createSetupStore(id, setup, pinia);
  return store;
}

/**
 * 处理action以及配套API将其加入store
 * @param $id
 * @param setup
 * @param pinia
 */
function createSetupStore($id: string, setup: any, pinia: any) {
  // 所有pinia的methods
  let partialStore = {
    _p: pinia,
    $id,
    $reset: () => console.log("reset"), // 该版本不实现
    $patch: () => console.log("patch"), // 该版本不实现
    $onAction: () => console.log("onAction"), // 该版本不实现
    $subscribe: () => console.log("subscribe"), // 该版本不实现
    $dispose: () => console.log("dispose"), // 该版本不实现
  };

  // 将effect数据存放如pinia._e、setupStore
  let scope!: EffectScope;
  const setupStore = pinia._e.run(() => {
    scope = effectScope();
    return scope.run(() => setup());
  });

  // 合并methods与store
  const store: any = reactive(
    Object.assign(toRaw({}), partialStore, setupStore)
  );
  // 将其加入pinia
  pinia._s.set($id, store);
  
  return store;
}
