import type { Plugin } from "vue-demi";
import { registerPiniaDevtools } from "./devtools";
import { IS_CLIENT } from "./env";
import { Pinia, piniaSymbol, setActivePinia } from "./rootStore";

/**
 * Vue 2 Plugin that must be installed for pinia to work. Note **you don't need
 * this plugin if you are using Nuxt.js**. Use the `buildModule` instead:
 * https://pinia.vuejs.org/ssr/nuxt.html.
 *
 * @example
 * ```js
 * import Vue from 'vue'
 * import { PiniaVuePlugin, createPinia } from 'pinia'
 *
 * Vue.use(PiniaVuePlugin)
 * const pinia = createPinia()
 *
 * new Vue({
 *   el: '#app',
 *   // ...
 *   pinia,
 * })
 * ```
 *
 * @param _Vue - `Vue` imported from 'vue'.
 */
export const PiniaVuePlugin: Plugin = function (_Vue) {
  // Equivalent of
  // app.config.globalProperties.$pinia = pinia
  // pinia在vue2中的注册逻辑与vuex核心逻辑几乎一致，
  // 首先编写mixin，在beforeCreate生命周期中
  _Vue.mixin({
    beforeCreate() {
      const options = this.$options;
      // 因为我们在根节点中注册了pinia，自然根节点存在pinia，
      if (options.pinia) {
        const pinia = options.pinia as Pinia;
        // HACK: taken from provide(): https://github.com/vuejs/composition-api/blob/master/src/apis/inject.ts#L30
        /* istanbul ignore else */
        if (!(this as any)._provided) {
          const provideCache = {};
          Object.defineProperty(this, "_provided", {
            get: () => provideCache,
            set: (v) => Object.assign(provideCache, v),
          });
        }
        (this as any)._provided[piniaSymbol as any] = pinia;

        // propagate the pinia instance in an SSR friendly way
        // avoid adding it to nuxt twice
        /* istanbul ignore else */
        // 首次注册全部变量不存在，进行存储
        if (!this.$pinia) {
          this.$pinia = pinia;
        }

        // 与vue3保持一致保存了pinia实例
        pinia._a = this as any;
        if (IS_CLIENT) {
          // 这允许在组件设置之外调用 useStore()

          setActivePinia(pinia);
          // 安装 pinia 的插件
          if (__DEV__) {
            registerPiniaDevtools(pinia._a, pinia);
          }
        }
      } else if (!this.$pinia && options.parent && options.parent.$pinia) {
        // 所有子树都继承最上层的pinia，达到共享数据的目的
        this.$pinia = options.parent.$pinia;
      }
    },
    destroyed() {
      delete this._pStores;
    },
  });
};
