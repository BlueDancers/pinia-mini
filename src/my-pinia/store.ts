// import { DefineStoreOptionsBase, PiniaCustomProperties, PiniaCustomStateProperties, Store, _StoreWithGetters, _StoreWithState } from "pinia/src";
// import { UnwrapRef } from "vue";

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

// type Record<K extends keyof any, T> = {
//   [P in K]: T;
// };

// type StateTree = Record<string | number | symbol, any>;

// type _GettersTree<S extends StateTree> = Record<
//   string,
//   | ((state: UnwrapRef<S> & UnwrapRef<PiniaCustomStateProperties<S>>) => any)
//   | (() => any)
// >;

// export declare interface DefineStoreOptions<
//   Id extends string,
//   S extends StateTree,
//   G,
//   A
// > extends DefineStoreOptionsBase<S, Store<Id, S, G, A>> {
//   id: Id;
//   state?: () => S;
//   getters?: G &
//     ThisType<UnwrapRef<S> & _StoreWithGetters<G> & PiniaCustomProperties> &
//     _GettersTree<S>;
//   actions?: A &
//     ThisType<
//       A &
//         UnwrapRef<S> &
//         _StoreWithState<Id, S, G, A> &
//         _StoreWithGetters<G> &
//         PiniaCustomProperties
//     >;
// }

// export function defineStore<
//   Id extends string,
//   S extends StateTree = {},
//   G extends _GettersTree<S> = {},
//   A = {}
// >(option: DefineStoreOptions<Id, S, G, A>) {
//   let { id, state, actions } = option;
//   console.log(id, state, actions);

//   function useStore() {}

//   return useStore;
// }

export function defineStore<S>(options: {
  id: string;
  state: () => S;
  getters: {
    [params: string]: (arg0: S) => ReturnType<any>;
  };
  actions: any;
}) {
  let { id, state, actions } = options;
  console.log(id, state, actions);

  function useStore() {
    const currentInstance = getCurrentInstance();
    let pinia: any;
    if (currentInstance) {
      pinia = inject(piniaSymbol);
    }

    if (!pinia._s.has(id)) {
      createOptionsStore(id, options, pinia);
    }
    const store = pinia._s.get(id);
    return store;
  }

  return useStore;
}

/**
 *
 * @param id
 * @param options
 * @param pinia
 */
function createOptionsStore(id: any, options: any, pinia: any) {
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
 *
 * @param $id
 * @param setup
 * @param options
 * @param pinia
 */
function createSetupStore($id: string, setup: any, options: any, pinia: any) {
  let partialStore = {
    _p: pinia,
    $id,
    $reset: () => {
      console.log("有空再开发");
    },
  };
  const store: any = reactive(Object.assign({}, partialStore));
  pinia._s.set($id, store);

  let scope!: EffectScope;
  const setupStore = pinia._e.run(() => {
    scope = effectScope();
    return scope.run(() => setup());
  })!;

  for (const key in setupStore) {
    const prop = setupStore[key];
    if (typeof prop === "function") {
      setupStore[key] = prop;
    }
  }
  console.log(setupStore);
  Object.assign(toRaw(store), setupStore);
  return store;
}
