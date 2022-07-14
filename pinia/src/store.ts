import {
  watch,
  computed,
  inject,
  getCurrentInstance,
  reactive,
  DebuggerEvent,
  WatchOptions,
  UnwrapRef,
  markRaw,
  isRef,
  isReactive,
  effectScope,
  EffectScope,
  ComputedRef,
  toRaw,
  toRef,
  toRefs,
  Ref,
  ref,
  set,
  del,
  nextTick,
  isVue2,
} from "vue-demi";
import {
  StateTree,
  SubscriptionCallback,
  _DeepPartial,
  isPlainObject,
  Store,
  _Method,
  DefineStoreOptions,
  StoreDefinition,
  _GettersTree,
  MutationType,
  StoreOnActionListener,
  _ActionsTree,
  SubscriptionCallbackMutation,
  DefineSetupStoreOptions,
  DefineStoreOptionsInPlugin,
  StoreGeneric,
  _StoreWithGetters,
  _ExtractActionsFromSetupStore,
  _ExtractGettersFromSetupStore,
  _ExtractStateFromSetupStore,
  _StoreWithState,
} from "./types";
import { setActivePinia, piniaSymbol, Pinia, activePinia } from "./rootStore";
import { IS_CLIENT } from "./env";
import { patchObject } from "./hmr";
import { addSubscription, triggerSubscriptions, noop } from "./subscriptions";

type _ArrayType<AT> = AT extends Array<infer T> ? T : never;

function mergeReactiveObjects<T extends StateTree>(
  target: T,
  patchToApply: _DeepPartial<T>
): T {
  // no need to go through symbols because they cannot be serialized anyway
  for (const key in patchToApply) {
    if (!patchToApply.hasOwnProperty(key)) continue;
    const subPatch = patchToApply[key];
    const targetValue = target[key];
    if (
      isPlainObject(targetValue) &&
      isPlainObject(subPatch) &&
      target.hasOwnProperty(key) &&
      !isRef(subPatch) &&
      !isReactive(subPatch)
    ) {
      target[key] = mergeReactiveObjects(targetValue, subPatch);
    } else {
      // @ts-expect-error: subPatch is a valid value
      target[key] = subPatch;
    }
  }

  return target;
}

const skipHydrateSymbol = __DEV__
  ? Symbol("pinia:skipHydration")
  : /* istanbul ignore next */ Symbol();
const skipHydrateMap = /*#__PURE__*/ new WeakMap<any, any>();

/**
 * Tells Pinia to skip the hydration process of a given object. This is useful in setup stores (only) when you return a
 * stateful object in the store but it isn't really state. e.g. returning a router instance in a setup store.
 *
 * @param obj - target object
 * @returns obj
 */
export function skipHydrate<T = any>(obj: T): T {
  return isVue2
    ? // in @vue/composition-api, the refs are sealed so defineProperty doesn't work...
      /* istanbul ignore next */ skipHydrateMap.set(obj, 1) && obj
    : Object.defineProperty(obj, skipHydrateSymbol, {});
}

function shouldHydrate(obj: any) {
  return isVue2
    ? /* istanbul ignore next */ !skipHydrateMap.has(obj)
    : !isPlainObject(obj) || !obj.hasOwnProperty(skipHydrateSymbol);
}

const { assign } = Object;

function isComputed<T>(
  value: ComputedRef<T> | unknown
): value is ComputedRef<T>;
function isComputed(o: any): o is ComputedRef {
  return !!(isRef(o) && (o as any).effect);
}

function createOptionsStore<
  Id extends string,
  S extends StateTree,
  G extends _GettersTree<S>,
  A extends _ActionsTree
>(
  id: Id, // storeid
  options: DefineStoreOptions<Id, S, G, A>, // state action getters
  pinia: Pinia, // 当前store实例
  hot?: boolean
): Store<Id, S, G, A> {
  const { state, actions, getters } = options;
  console.log("进入createOptionsStore", state());

  // 获取state中是否已经存在该store实例
  const initialState: StateTree | undefined = pinia.state.value[id];
  console.log("initialState", initialState);
  let store: Store<Id, S, G, A>;
  //
  function setup() {
    console.log("开始createOptionsStore的setup函数", state());

    if (!initialState && (!__DEV__ || !hot)) {
      /* istanbul ignore if */
      if (isVue2) {
        set(pinia.state.value, id, state ? state() : {});
      } else {
        // 将数据存储到pinia中，因为state时通过ref进行创建所以他时具备响应时的对象
        pinia.state.value[id] = state ? state() : {};
      }
    }

    // 避免在 pinia.state.value 中创建状态
    console.log(11, pinia.state.value[id]);
    console.log(22, toRefs(pinia.state.value[id]));

    const localState =
      __DEV__ && hot
        ? // 使用 ref() 来解开状态 TODO 中的 refs：检查这是否仍然是必要的
          toRefs(ref(state ? state() : {}).value)
        : toRefs(pinia.state.value[id]);
    // 经过toRefs的处理后，localState.xx.value 就等同于给state中的xx赋值
    let aa = assign(
      localState, // state => Refs(state)
      actions, //
      Object.keys(getters || {}).reduce((computedGetters, name) => {
        if (__DEV__ && name in localState) {
          // 如果getters名称与state中的名称相同，则抛出错误
          console.warn(
            `[🍍]: A getter cannot have the same name as another state property. Rename one of them. Found with "${name}" in store "${id}".`
          );
        }
        // markRow 防止对象被重复代理
        computedGetters[name] = markRaw(
          // 使用计算属性处理getters的距离逻辑，并且通过call处理this指向问题
          computed(() => {
            setActivePinia(pinia);
            // 它是在之前创建的
            const store = pinia._s.get(id)!;

            // allow cross using stores
            /* istanbul ignore next */
            if (isVue2 && !store._r) return;

            // @ts-expect-error
            // return getters![name].call(context, context)
            // TODO: avoid reading the getter while assigning with a global variable
            // 将store的this指向getters中实现getters中this的正常使用
            return getters![name].call(store, store);
          })
        );

        return computedGetters;
      }, {} as Record<string, ComputedRef>)
    );
    console.log("aa", aa);
    return aa;
  }
  // 使用createSetupStore创建store
  store = createSetupStore(id, setup, options, pinia, hot, true);

  // 重写$store方法 options才能使用该API
  store.$reset = function $reset() {
    const newState = state ? state() : {};
    // we use a patch to group all changes into one single subscription
    this.$patch(($state) => {
      assign($state, newState);
    });
  };

  return store as any;
}

function createSetupStore<
  Id extends string,
  SS,
  S extends StateTree,
  G extends Record<string, _Method>,
  A extends _ActionsTree
>(
  $id: Id,
  setup: () => SS,
  options:
    | DefineSetupStoreOptions<Id, S, G, A>
    | DefineStoreOptions<Id, S, G, A> = {},
  pinia: Pinia,
  hot?: boolean,
  isOptionsStore?: boolean
): Store<Id, S, G, A> {
  let scope!: EffectScope;

  //将defineStore声明的对象合并到变量中，并且兼容action不存在的场景
  const optionsForPlugin: DefineStoreOptionsInPlugin<Id, S, G, A> = assign(
    { actions: {} as A },
    options
  );

  console.log(optionsForPlugin);

  /* istanbul ignore if */
  // @ts-expect-error: active is an internal property
  // 如果pinia._e.active不存在，则说明effectscope不存在，提示pinia已经被销毁
  if (__DEV__ && !pinia._e.active) {
    throw new Error("Pinia destroyed");
  }

  // watcher options for $subscribe
  // $subscribe的观察者选项
  const $subscribeOptions: WatchOptions = {
    deep: true,
    // flush: 'post',
  };
  /* istanbul ignore else */
  if (__DEV__ && !isVue2) {
    $subscribeOptions.onTrigger = (event) => {
      /* istanbul ignore else */
      if (isListening) {
        debuggerEvents = event;
        // avoid triggering this while the store is being built and the state is being set in pinia
      } else if (isListening == false && !store._hotUpdating) {
        // let patch send all the events together later
        /* istanbul ignore else */
        if (Array.isArray(debuggerEvents)) {
          debuggerEvents.push(event);
        } else {
          console.error(
            "🍍 debuggerEvents should be an array. This is most likely an internal Pinia bug."
          );
        }
      }
    };
  }
  // internal state
  let isListening: boolean; // set to true at the end 监听函数执行时机标识
  let isSyncListening: boolean; // set to true at the end 监听函数执行时机标识
  let subscriptions: SubscriptionCallback<S>[] = markRaw([]); // state 更新响应队列，缓存$subscribe挂载的任务
  let actionSubscriptions: StoreOnActionListener<Id, S, G, A>[] = markRaw([]); // actions 响应事件队列, 缓存$onAction挂载的任务
  let debuggerEvents: DebuggerEvent[] | DebuggerEvent;
  const initialState = pinia.state.value[$id] as UnwrapRef<S> | undefined; // 获取当前pinia的state
  console.log("pinia.state.value[$id] ", pinia.state.value[$id]);

  // avoid setting the state for option stores if it is set
  // by the setup
  // 如果已设置，则避免设置选项存储的状态，通过对象方式声明的state这段逻辑将不会走
  // 如果option的声明方式，则设置state默认值
  if (!isOptionsStore && !initialState && (!__DEV__ || !hot)) {
    /* istanbul ignore if */
    if (isVue2) {
      set(pinia.state.value, $id, {});
    } else {
      pinia.state.value[$id] = {};
    }
  }

  const hotState = ref({} as S);

  // $patch 改变状态
  // 避免触发过多监听
  // https://github.com/vuejs/pinia/issues/1129
  let activeListener: Symbol | undefined;
  function $patch(stateMutation: (state: UnwrapRef<S>) => void): void;
  function $patch(partialState: _DeepPartial<UnwrapRef<S>>): void;
  function $patch(
    partialStateOrMutator:
      | _DeepPartial<UnwrapRef<S>>
      | ((state: UnwrapRef<S>) => void)
  ): void {
    let subscriptionMutation: SubscriptionCallbackMutation<S>;
    isListening = isSyncListening = false;
    // reset the debugger events since patches are sync
    /* istanbul ignore else */
    if (__DEV__) {
      debuggerEvents = [];
    }
    if (typeof partialStateOrMutator === "function") {
      partialStateOrMutator(pinia.state.value[$id] as UnwrapRef<S>);
      subscriptionMutation = {
        type: MutationType.patchFunction,
        storeId: $id,
        events: debuggerEvents as DebuggerEvent[],
      };
    } else {
      mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator);
      subscriptionMutation = {
        type: MutationType.patchObject,
        payload: partialStateOrMutator,
        storeId: $id,
        events: debuggerEvents as DebuggerEvent[],
      };
    }
    const myListenerId = (activeListener = Symbol());
    nextTick().then(() => {
      if (activeListener === myListenerId) {
        isListening = true;
      }
    });
    isSyncListening = true;
    // because we paused the watcher, we need to manually call the subscriptions
    triggerSubscriptions(
      subscriptions,
      subscriptionMutation,
      pinia.state.value[$id] as UnwrapRef<S>
    );
  }

  /* istanbul ignore next */
  // 重置状态 如果是通过function进行创建，则无法使用$reset，而通过Object进行创建，则会在createOptionsStore被重写。
  const $reset = __DEV__
    ? () => {
        throw new Error(
          `🍍: Store "${$id}" is built using the setup syntax and does not implement $reset().`
        );
      }
    : noop;

  // 注销该store
  function $dispose() {
    scope.stop(); // effect作用于停止
    subscriptions = [];
    actionSubscriptions = [];
    pinia._s.delete($id); // 删除effectMap结构
  }

  /**
   * 包装一个action来处理订阅。
   *
   * @param name - name of the action
   * @param action - action to wrap
   * @returns a wrapped action to handle subscriptions
   */
  function wrapAction(name: string, action: _Method) {
    return function (this: any) {
      setActivePinia(pinia);
      const args = Array.from(arguments);

      const afterCallbackList: Array<(resolvedReturn: any) => any> = [];
      const onErrorCallbackList: Array<(error: unknown) => unknown> = [];
      function after(callback: _ArrayType<typeof afterCallbackList>) {
        afterCallbackList.push(callback);
      }
      function onError(callback: _ArrayType<typeof onErrorCallbackList>) {
        onErrorCallbackList.push(callback);
      }

      // @ts-expect-error
      triggerSubscriptions(actionSubscriptions, {
        args,
        name,
        store,
        after,
        onError,
      });

      let ret: any;
      try {
        ret = action.apply(this && this.$id === $id ? this : store, args);
        // handle sync errors
      } catch (error) {
        triggerSubscriptions(onErrorCallbackList, error);
        throw error;
      }

      if (ret instanceof Promise) {
        return ret
          .then((value) => {
            triggerSubscriptions(afterCallbackList, value);
            return value;
          })
          .catch((error) => {
            triggerSubscriptions(onErrorCallbackList, error);
            return Promise.reject(error);
          });
      }

      // allow the afterCallback to override the return value
      triggerSubscriptions(afterCallbackList, ret);
      return ret;
    };
  }
  // _hmrPayload
  const _hmrPayload = /*#__PURE__*/ markRaw({
    actions: {} as Record<string, any>,
    getters: {} as Record<string, Ref>,
    state: [] as string[],
    hotState,
  });

  const partialStore = {
    _p: pinia,
    // _s: scope,
    $id,
    $onAction: addSubscription.bind(null, actionSubscriptions), // action事件注册函数
    $patch, // store更新函数
    $reset, // 充值reset
    $subscribe(callback, options = {}) {
      // 注册修改响应监听
      const removeSubscription = addSubscription(
        subscriptions,
        callback,
        options.detached,
        () => stopWatcher()
      );
      const stopWatcher = scope.run(() =>
        watch(
          () => pinia.state.value[$id] as UnwrapRef<S>,
          (state) => {
            if (options.flush === "sync" ? isSyncListening : isListening) {
              callback(
                {
                  storeId: $id,
                  type: MutationType.direct,
                  events: debuggerEvents as DebuggerEvent,
                },
                state
              );
            }
          },
          assign({}, $subscribeOptions, options)
        )
      )!;

      return removeSubscription;
    },
    $dispose, // 注销store
  } as _StoreWithState<Id, S, G, A>;

  /* istanbul ignore if */
  if (isVue2) {
    // start as non ready
    partialStore._r = false;
  }
  // 将以上构建的兑换转行为响应式数据
  const store: Store<Id, S, G, A> = reactive(
    assign(
      __DEV__ && IS_CLIENT
        ? // devtools custom properties
          {
            _customProperties: markRaw(new Set<string>()),
            _hmrPayload,
          }
        : {},
      partialStore
      // must be added later
      // setupStore
    )
  ) as unknown as Store<Id, S, G, A>;

  // 缓存当前store，
  pinia._s.set($id, store);

  // TODO：想法创建skipSerialize，将属性标记为不可序列化并被跳过
  // setup执行结果返回所有变量 计算属性 以及方法，统一将他放入一个effect域中
  const setupStore = pinia._e.run(() => {
    scope = effectScope();
    return scope.run(() => setup());
  })!;

  console.log("setupStore", setupStore.counter.value);
  //  setupStore中包含state,getters（被计算属性处理了），还有actions
  // overwrite existing actions to support $onAction
  //  如果prop是ref（但不是computed）或reactive
  for (const key in setupStore) {
    const prop = setupStore[key];
    console.log(prop, "prop");

    // 如果当前props是ref并且不是计算属性与reative
    if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
      // mark it as a piece of state to be serialized
      if (__DEV__ && hot) {
        set(hotState.value, key, toRef(setupStore as any, key));
        // createOptionStore directly sets the state in pinia.state.value so we
        // can just skip that
      } else if (!isOptionsStore) {
        // 不是options声明的才会进入此判断
        // in setup stores we must hydrate the state and sync pinia state tree with the refs the user just created
        // 在 setuo store中，我们必须将state和pinia state树与用户刚刚创建的refs同步
        if (initialState && shouldHydrate(prop)) {
          if (isRef(prop)) {
            prop.value = initialState[key];
          } else {
            // probably a reactive object, lets recursively assign
            mergeReactiveObjects(prop, initialState[key]);
          }
        }
        // transfer the ref to the pinia state to keep everything in sync
        /* istanbul ignore if */
        // 将属性同步至pinia.state
        // 如果是options创建的则不需要在这里进行同步，因为在setup函数已经完成了同步
        if (isVue2) {
          set(pinia.state.value[$id], key, prop);
        } else {
          pinia.state.value[$id][key] = prop;
        }
      }

      /* istanbul ignore else */
      if (__DEV__) {
        _hmrPayload.state.push(key);
      }
      // action
    } else if (typeof prop === "function") {
      // @ts-expect-error: we are overriding the function we avoid wrapping if
      const actionValue = __DEV__ && hot ? prop : wrapAction(key, prop);
      // this a hot module replacement store because the hotUpdate method needs
      // to do it with the right context
      /* istanbul ignore if */
      if (isVue2) {
        set(setupStore, key, actionValue);
      } else {
        // @ts-expect-error
        setupStore[key] = actionValue;
      }

      /* istanbul ignore else */
      if (__DEV__) {
        _hmrPayload.actions[key] = prop;
      }

      // list actions so they can be used in plugins
      // @ts-expect-error
      optionsForPlugin.actions[key] = prop;
    } else if (__DEV__) {
      // add getters for devtools
      if (isComputed(prop)) {
        _hmrPayload.getters[key] = isOptionsStore
          ? // @ts-expect-error
            options.getters[key]
          : prop;
        if (IS_CLIENT) {
          const getters: string[] =
            // @ts-expect-error: it should be on the store
            setupStore._getters || (setupStore._getters = markRaw([]));
          getters.push(key);
        }
      }
    }
  }

  // add the state, getters, and action properties
  /* istanbul ignore if */
  if (isVue2) {
    Object.keys(setupStore).forEach((key) => {
      set(
        store,
        key,
        // @ts-expect-error: valid key indexing
        setupStore[key]
      );
    });
  } else {
    // 将若干方法方法与store中的变量与函数进行合并
    assign(store, setupStore);
    // allows retrieving reactive objects with `storeToRefs()`. Must be called after assigning to the reactive object.
    // Make `storeToRefs()` work with `reactive()` #799

    //允许使用“storeToRefs()”检索reactive objects。必须在分配给reactive object后调用。
    //使'storeToRefs()`与'reactive()`一起工作 #799

    assign(toRaw(store), setupStore);
    console.log(toRaw(store));
  }

  // 绑定$store属性
  Object.defineProperty(store, "$state", {
    get: () => (__DEV__ && hot ? hotState.value : pinia.state.value[$id]),
    set: (state) => {
      /* istanbul ignore if */
      if (__DEV__ && hot) {
        throw new Error("cannot set hotState");
      }
      $patch(($state) => {
        assign($state, state);
      });
    },
  });

  // add the hotUpdate before plugins to allow them to override it
  /* istanbul ignore else */
  if (__DEV__) {
    store._hotUpdate = markRaw((newStore) => {
      store._hotUpdating = true;
      newStore._hmrPayload.state.forEach((stateKey) => {
        if (stateKey in store.$state) {
          const newStateTarget = newStore.$state[stateKey];
          const oldStateSource = store.$state[stateKey];
          if (
            typeof newStateTarget === "object" &&
            isPlainObject(newStateTarget) &&
            isPlainObject(oldStateSource)
          ) {
            patchObject(newStateTarget, oldStateSource);
          } else {
            // transfer the ref
            newStore.$state[stateKey] = oldStateSource;
          }
        }
        // patch direct access properties to allow store.stateProperty to work as
        // store.$state.stateProperty
        set(store, stateKey, toRef(newStore.$state, stateKey));
      });

      // remove deleted state properties
      Object.keys(store.$state).forEach((stateKey) => {
        if (!(stateKey in newStore.$state)) {
          del(store, stateKey);
        }
      });

      // avoid devtools logging this as a mutation
      isListening = false;
      isSyncListening = false;
      pinia.state.value[$id] = toRef(newStore._hmrPayload, "hotState");
      isSyncListening = true;
      nextTick().then(() => {
        isListening = true;
      });

      for (const actionName in newStore._hmrPayload.actions) {
        const action: _Method = newStore[actionName];

        set(store, actionName, wrapAction(actionName, action));
      }

      // TODO: does this work in both setup and option store?
      for (const getterName in newStore._hmrPayload.getters) {
        const getter: _Method = newStore._hmrPayload.getters[getterName];
        const getterValue = isOptionsStore
          ? // special handling of options api
            computed(() => {
              setActivePinia(pinia);
              return getter.call(store, store);
            })
          : getter;

        set(store, getterName, getterValue);
      }

      // remove deleted getters
      Object.keys(store._hmrPayload.getters).forEach((key) => {
        if (!(key in newStore._hmrPayload.getters)) {
          del(store, key);
        }
      });

      // remove old actions
      Object.keys(store._hmrPayload.actions).forEach((key) => {
        if (!(key in newStore._hmrPayload.actions)) {
          del(store, key);
        }
      });

      // update the values used in devtools and to allow deleting new properties later on
      store._hmrPayload = newStore._hmrPayload;
      store._getters = newStore._getters;
      store._hotUpdating = false;
    });

    const nonEnumerable = {
      writable: true,
      configurable: true,
      // avoid warning on devtools trying to display this property
      enumerable: false,
    };

    if (IS_CLIENT) {
      // avoid listing internal properties in devtools
      (["_p", "_hmrPayload", "_getters", "_customProperties"] as const).forEach(
        (p) => {
          Object.defineProperty(store, p, {
            value: store[p],
            ...nonEnumerable,
          });
        }
      );
    }
  }

  /* istanbul ignore if */
  if (isVue2) {
    // mark the store as ready before plugins
    store._r = true;
  }

  // apply all plugins
  pinia._p.forEach((extender) => {
    /* istanbul ignore else */
    if (__DEV__ && IS_CLIENT) {
      const extensions = scope.run(() =>
        extender({
          store,
          app: pinia._a,
          pinia,
          options: optionsForPlugin,
        })
      )!;
      Object.keys(extensions || {}).forEach((key) =>
        store._customProperties.add(key)
      );
      assign(store, extensions);
    } else {
      assign(
        store,
        scope.run(() =>
          extender({
            store,
            app: pinia._a,
            pinia,
            options: optionsForPlugin,
          })
        )!
      );
    }
  });

  if (
    __DEV__ &&
    store.$state &&
    typeof store.$state === "object" &&
    typeof store.$state.constructor === "function" &&
    !store.$state.constructor.toString().includes("[native code]")
  ) {
    console.warn(
      `[🍍]: The "state" must be a plain object. It cannot be\n` +
        `\tstate: () => new MyClass()\n` +
        `Found in store "${store.$id}".`
    );
  }

  // only apply hydrate to option stores with an initial state in pinia
  if (
    initialState &&
    isOptionsStore &&
    (options as DefineStoreOptions<Id, S, G, A>).hydrate
  ) {
    (options as DefineStoreOptions<Id, S, G, A>).hydrate!(
      store.$state,
      initialState
    );
  }

  isListening = true;
  isSyncListening = true;
  return store;
}

/**
 * Extract the actions of a store type. Works with both a Setup Store or an
 * Options Store.
 */
export type StoreActions<SS> = SS extends Store<
  string,
  StateTree,
  _GettersTree<StateTree>,
  infer A
>
  ? A
  : _ExtractActionsFromSetupStore<SS>;

/**
 * Extract the getters of a store type. Works with both a Setup Store or an
 * Options Store.
 */
export type StoreGetters<SS> = SS extends Store<
  string,
  StateTree,
  infer G,
  _ActionsTree
>
  ? _StoreWithGetters<G>
  : _ExtractGettersFromSetupStore<SS>;

/**
 * Extract the state of a store type. Works with both a Setup Store or an
 * Options Store. Note this unwraps refs.
 */
export type StoreState<SS> = SS extends Store<
  string,
  infer S,
  _GettersTree<StateTree>,
  _ActionsTree
>
  ? UnwrapRef<S>
  : _ExtractStateFromSetupStore<SS>;

// type a1 = _ExtractStateFromSetupStore<{ a: Ref<number>; action: () => void }>
// type a2 = _ExtractActionsFromSetupStore<{ a: Ref<number>; action: () => void }>
// type a3 = _ExtractGettersFromSetupStore<{
//   a: Ref<number>
//   b: ComputedRef<string>
//   action: () => void
// }>

/**
 * Creates a `useStore` function that retrieves the store instance
 * 创建一个检索store实例的`useStore`函数
 *
 * @param id - id of the store (must be unique)
 * @param options - options to define the store
 */
export function defineStore<
  Id extends string,
  S extends StateTree = {},
  G extends _GettersTree<S> = {},
  // cannot extends ActionsTree because we loose the typings
  A /* extends ActionsTree */ = {}
>(
  id: Id,
  options: Omit<DefineStoreOptions<Id, S, G, A>, "id">
): StoreDefinition<Id, S, G, A>;

/**
 * Creates a `useStore` function that retrieves the store instance
 * 创建一个检索store实例的`useStore`函数
 *
 * @param options - options to define the store
 */
export function defineStore<
  Id extends string,
  S extends StateTree = {},
  G extends _GettersTree<S> = {},
  // cannot extends ActionsTree because we loose the typings
  A /* extends ActionsTree */ = {}
>(options: DefineStoreOptions<Id, S, G, A>): StoreDefinition<Id, S, G, A>;

/**
 * Creates a `useStore` function that retrieves the store instance
 * 创建一个检索store实例的`useStore`函数
 *
 * @param id - id of the store (must be unique)
 * @param storeSetup - function that defines the store
 * @param options - extra options
 */
export function defineStore<Id extends string, SS>(
  id: Id,
  storeSetup: () => SS,
  options?: DefineSetupStoreOptions<
    Id,
    _ExtractStateFromSetupStore<SS>,
    _ExtractGettersFromSetupStore<SS>,
    _ExtractActionsFromSetupStore<SS>
  >
): StoreDefinition<
  Id,
  _ExtractStateFromSetupStore<SS>,
  _ExtractGettersFromSetupStore<SS>,
  _ExtractActionsFromSetupStore<SS>
>;
export function defineStore(
  // TODO: add proper types from above
  idOrOptions: any,
  setup?: any,
  setupOptions?: any
): StoreDefinition {
  let id: string;
  let options:
    | DefineStoreOptions<
        string,
        StateTree,
        _GettersTree<StateTree>,
        _ActionsTree
      >
    | DefineSetupStoreOptions<
        string,
        StateTree,
        _GettersTree<StateTree>,
        _ActionsTree
      >;

  const isSetupStore = typeof setup === "function";
  if (typeof idOrOptions === "string") {
    id = idOrOptions;
    // the option store setup will contain the actual options in this case
    options = isSetupStore ? setupOptions : setup;
  } else {
    options = idOrOptions;
    id = idOrOptions.id;
  }
  console.log("开始执行defineStore", id, options.state());

  function useStore(pinia?: Pinia | null, hot?: StoreGeneric): StoreGeneric {
    console.log("开始执行useStore");

    // 获取组件示例
    const currentInstance = getCurrentInstance();
    // 在测试模式下，忽略提供的参数
    // 真实环境下，如果未传入pinia，则通过inject(piniaSymbol)获取pinia（我们再install阶段存储的piniaSymbol）
    console.log("inject(piniaSymbol)", inject(piniaSymbol));

    pinia =
      (__TEST__ && activePinia && activePinia._testing ? null : pinia) ||
      (currentInstance && inject(piniaSymbol));
    // 设置激活的pinia
    if (pinia) setActivePinia(pinia);
    // 如果再dev环境并且当前pinia获取不到，说明未全局注册，抛出错误
    if (__DEV__ && !activePinia) {
      throw new Error(
        `[🍍]: getActivePinia was called with no active Pinia. Did you forget to install pinia?\n` +
          `\tconst pinia = createPinia()\n` +
          `\tapp.use(pinia)\n` +
          `This will fail in production.`
      );
    }
    // 获取最新pinia，并断言pinia一定存在
    pinia = activePinia!;
    // _s中存储变量与其响应式函数的effects
    // 再_s中寻找store是否已经被注册
    if (!pinia._s.has(id)) {
      console.log("isSetupStore", isSetupStore);

      // creating the store registers it in `pinia._s`
      // 不同store的创建形式会走不同的store初始化流程
      if (isSetupStore) {
        createSetupStore(id, setup, options, pinia);
      } else {
        createOptionsStore(id, options as any, pinia);
      }

      /* istanbul ignore else */
      if (__DEV__) {
        // @ts-expect-error: not the right inferred type
        useStore._pinia = pinia;
      }
    }
    // 从_s中获取当前store的effect数据
    const store: StoreGeneric = pinia._s.get(id)!;

    if (__DEV__ && hot) {
      const hotId = "__hot:" + id;
      const newStore = isSetupStore
        ? createSetupStore(hotId, setup, options, pinia, true)
        : createOptionsStore(hotId, assign({}, options) as any, pinia, true);

      hot._hotUpdate(newStore);

      // cleanup the state properties and the store from the cache
      delete pinia.state.value[hotId];
      pinia._s.delete(hotId);
    }

    // save stores in instances to access them devtools
    if (
      __DEV__ &&
      IS_CLIENT &&
      currentInstance &&
      currentInstance.proxy &&
      // avoid adding stores that are just built for hot module replacement
      !hot
    ) {
      const vm = currentInstance.proxy;
      const cache = "_pStores" in vm ? vm._pStores! : (vm._pStores = {});
      cache[id] = store;
    }

    // StoreGeneric cannot be casted towards Store
    return store as any;
  }

  useStore.$id = id;

  return useStore;
}
