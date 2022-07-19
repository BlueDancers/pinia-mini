import { Pinia, PiniaPlugin, setActivePinia, piniaSymbol } from "./rootStore";
import { ref, App, markRaw, effectScope, isVue2, Ref } from "vue-demi";
import { registerPiniaDevtools, devtoolsPlugin } from "./devtools";
import { IS_CLIENT } from "./env";
import { StateTree, StoreGeneric } from "./types";

/**
 * 创建Pinia实例并返回
 */
export function createPinia(): Pinia {
  console.log("createPinia");

  // vue3.2新增属性 EffectScope，他是副作用生效的作用域，在作用域内的副作用可以统一生效或者失效，而不跟着页面走。
  // https://juejin.cn/post/7019241635942760455
  // == 首先使用effectScope创建一个响应式作用域，然后在作用域内创建一个响应式的ref，最后成为pinia上的一个属性
  const scope = effectScope(true);

  // NOTE: here we could check the window object for a state and directly set it
  // if there is anything like it with Vue 3 SSR

  //注意：这里我们可以检查window对象的状态并直接设置它
  //如果Vue 3 SSR有类似的功能

  // 在scope中声明一个响应式ref
  const state = scope.run<Ref<Record<string, StateTree>>>(() =>
    ref<Record<string, StateTree>>({})
  )!;

  // ==  _p用来存储Store的插件，toBeInstalled用来存储install之前就use的插件
  let _p: Pinia["_p"] = [];
  // 在调用 app.use(pinia) 之前添加的插件
  let toBeInstalled: PiniaPlugin[] = []; // 待安装插件

  // == 使用markRaw标记pinia使其不会被转化为响应式
  // 包装好pinia，下一步注册
  const pinia: Pinia = markRaw({
    // 当我们使用use进行pinia的注册时，就会触发install方法，方法中首先执行setActivePinia来保存pinia到全局变量
    // 然后判断是否是vue2，如果不是，则保存app实例，再通过provide进行注入，同时将pinia挂载到app实例上
    // 最后便是对install之前的插件进行处理将其加入到_p中，最后置空toBeInstalled
    install(app: App) {
      console.log('pinia挂载');
      
      // 这允许在组件设置之外调用 useStore()
      // 安装 pinia 的插件  保存当前pinia实例
      setActivePinia(pinia);

      if (!isVue2) {
        pinia._a = app;
        app.provide(piniaSymbol, pinia);
        app.config.globalProperties.$pinia = pinia;
        /* istanbul ignore else */
        if (__DEV__ && IS_CLIENT) {
          registerPiniaDevtools(app, pinia);
        }
        toBeInstalled.forEach((plugin) => _p.push(plugin));
        toBeInstalled = [];
      }
    },
    // 如果_a不存在则说明未install，并且不是vue2环境，将插件存入toBeInstalled，install之后再处理
    // 如果已经install，则将插件直接放入_p中
    use(plugin) {
      if (!this._a && !isVue2) {
        toBeInstalled.push(plugin);
      } else {
        _p.push(plugin);
      }
      return this;
    },

    _p, // 所有pinia的插件
    // it's actually undefined here
    // @ts-expect-error
    _a: null, // app实例，在install的时候会被设置
    _e: scope, // pinia的作用域对象
    _s: new Map<string, StoreGeneric>(),
    state,
  });

  // pinia devtools 仅依赖于开发功能，因此它们不能被强制使用，除非
  // 使用 Vue 的开发版本
  // 我们在测试模式下也不需要开发工具
  if (__DEV__ && IS_CLIENT && !__TEST__) {
    pinia.use(devtoolsPlugin);
  }

  //vue3的pinia创建逻辑到此处就结束了，我们可以看到对vue2版本的判断，然后pinia是支持vue2的，vue2的pinia创建逻辑在PiniaVuePlugin之中。
  return pinia;
}


// 小结经过对createPinia的分析后，我们可以得知在vue3中创建pinia对象，并挂载到全局
// vue2则在注册的时候增加mixin，将pinia的实例挂在到每个页面
