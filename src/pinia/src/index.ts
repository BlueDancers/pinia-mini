/**
 * @module pinia
 */
export { setActivePinia, getActivePinia } from './rootStore'
export { createPinia } from './createPinia'
export type {
  Pinia,
  // TODO: remove in next release
  PiniaStorePlugin,
  PiniaPlugin,
  PiniaPluginContext,
} from './rootStore'

export { defineStore, skipHydrate } from './store'
export type { StoreActions, StoreGetters, StoreState } from './store'

export type {
  StateTree,
  Store,
  StoreGeneric,
  StoreDefinition,
  _StoreWithGetters,
  _GettersTree,
  _ActionsTree,
  _Method,
  _StoreWithActions,
  _StoreWithState,
  StoreProperties,
  StoreOnActionListener,
  _StoreOnActionListenerContext,
  StoreOnActionListenerContext,
  SubscriptionCallback,
  SubscriptionCallbackMutation,
  SubscriptionCallbackMutationDirect,
  SubscriptionCallbackMutationPatchFunction,
  SubscriptionCallbackMutationPatchObject,
  _SubscriptionCallbackMutationBase,
  PiniaCustomProperties,
  PiniaCustomStateProperties,
  DefineStoreOptionsBase,
  DefineStoreOptions,
  DefineSetupStoreOptions,
  DefineStoreOptionsInPlugin,
  _ExtractActionsFromSetupStore,
  _ExtractGettersFromSetupStore,
  _ExtractStateFromSetupStore,
  _DeepPartial,
  _ExtractActionsFromSetupStore_Keys,
  _ExtractGettersFromSetupStore_Keys,
  _ExtractStateFromSetupStore_Keys,
  _UnwrapAll,
  _Awaited,
} from './types'
export { MutationType } from './types'

export {
  mapActions,
  mapStores,
  mapState,
  mapWritableState,
  mapGetters,
  setMapStoreSuffix,
} from './mapHelpers'

export { storeToRefs } from './storeToRefs'

export type {
  MapStoresCustomization,
  _MapActionsObjectReturn,
  _MapActionsReturn,
  _MapStateObjectReturn,
  _MapStateReturn,
  _MapWritableStateObjectReturn,
  _MapWritableStateReturn,
  _Spread,
  _StoreObject,
} from './mapHelpers'

export { acceptHMRUpdate } from './hmr'

export { PiniaVuePlugin } from './vue2-plugin'

export * from './globalExtensions'
