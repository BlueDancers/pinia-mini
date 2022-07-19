import { StateTree, StoreGeneric } from "pinia";
import { effectScope, markRaw, ref, Ref } from "vue";
import { App } from "vue-demi";
import { piniaSymbol } from "./helper";

/**
 * 创建Pinia
 */
export function createPinia() {
  const scope = effectScope(true);
  //   const state = scope.run<Ref<Record<string, StateTree>>>(() =>
  //     ref<Record<string, StateTree>>({})
  //   )!;

  const state = ref({});

  const pinia = markRaw({
    install(app: App) {
      console.log("完成mini-pinia初始化");
      //   pinia._a = app;
      // app.config.globalProperties.$pinia = pinia;
      app.provide(piniaSymbol, pinia);
    },
    use() {},
    _s: new Map<string, StoreGeneric>(),
    state,
    _e: scope,
  });
  return pinia;
}
