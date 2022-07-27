import { StateTree, StoreGeneric } from "pinia";
import { effectScope, markRaw, ref, Ref } from "vue";
import { App } from "vue-demi";
import { piniaSymbol } from "./helper";

/**
 * 创建Pinia
 */
export function createPinia() {
  // 创建响应空间
  const scope = effectScope(true);
  const state = scope.run<Ref<Record<string, StateTree>>>(() =>
    ref<Record<string, StateTree>>({})
  )!;
  // markRaw使其不具备响应式
  const pinia = markRaw({
    install(app: App) {
      // 注入pinia
      app.provide(piniaSymbol, pinia);
    },
    use() {},
    _s: new Map<string, StoreGeneric>(), // 保存处理后的store数据全部数据
    state, // 保存可访问state
    _e: scope, // 相应空间
  });
  return pinia;
}
