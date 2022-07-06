import { StoreGeneric, defineStore, expectType } from './'
import { watch } from 'vue'

const useStore = defineStore({
  id: 'name',
  state: () => ({ a: 'on' as 'on' | 'off', nested: { counter: 0 } }),
  getters: {
    upper: (state) => {
      expectType<'on' | 'off'>(state.a)
      return state.a.toUpperCase() as 'ON' | 'OFF'
    },
    upperThis(): 'ON' | 'OFF' {
      expectType<'on' | 'off'>(this.a)
      return this.a.toUpperCase() as 'ON' | 'OFF'
    },
    other(): false {
      expectType<string>(this.upper)
      return false
    },

    doubleCounter: (state) => {
      expectType<number>(state.nested.counter)
      return state.nested.counter * 2
    },
  },
  actions: {
    doStuff() {
      // @ts-expect-error
      this.notExisting
      expectType<string>(this.upper)
      expectType<false>(this.other)
    },
    otherOne() {
      expectType<() => void>(this.doStuff)
    },
  },
})

defineStore('name', {
  // @ts-expect-error: id is passed as the first argument
  id: 'name',
})
defineStore('name', {})
// @ts-expect-error
defineStore('name')
defineStore('name', {
  state: () => ({}),
})

// actions on not existing properties
defineStore({
  id: '',
  actions: {
    a() {
      // @ts-expect-error
      this.notExisting
    },
  },
})

defineStore({
  id: '',
  state: () => ({}),
  actions: {
    a() {
      // @ts-expect-error
      this.notExisting
    },
  },
})

defineStore({
  id: '',
  getters: {},
  actions: {
    a() {
      // @ts-expect-error
      this.notExisting
    },
  },
})

// getters on not existing properties
defineStore({
  id: '',
  getters: {
    a(): number {
      // @ts-expect-error
      this.notExisting
      return 2
    },
    b: (state) => {
      // @ts-expect-error
      state.notExisting
      return
    },
  },
})

defineStore({
  id: '',
  state: () => ({}),
  getters: {
    a(): number {
      // @ts-expect-error
      this.notExisting
      return 2
    },
    b: (state) => {
      // @ts-expect-error
      state.notExisting
      return
    },
  },
})

const store = useStore()

expectType<{ a: 'on' | 'off' }>(store.$state)
expectType<number>(store.nested.counter)
expectType<'on' | 'off'>(store.a)
expectType<'ON' | 'OFF'>(store.upper)

// @ts-expect-error
store.nonExistant

// @ts-expect-error
store.upper = 'thing'

// @ts-expect-error
store.nonExistant.stuff

// @ts-expect-error cannot return a value
store.$patch(async () => {})
store.$patch(() => {})
store.$patch(() => {
  // return earlier
  return
})

const useNoSAG = defineStore({
  id: 'noSAG',
})
const useNoAG = defineStore({
  id: 'noAG',
  state: () => ({}),
})
const useNoSG = defineStore({
  id: 'noAG',
  actions: {},
})
const useNoSA = defineStore({
  id: 'noAG',
  getters: {},
})
const useNoS = defineStore({
  id: 'noAG',
  actions: {},
  getters: {},
})
const useNoA = defineStore({
  id: 'noAG',
  state: () => ({}),
  getters: {},
})
const useNoG = defineStore({
  id: 'noAG',
  state: () => ({}),
  actions: {},
})

const noSAG = useNoSAG()
const noSA = useNoSA()
const noAG = useNoAG()
const noSG = useNoSG()
const noS = useNoS()
const noA = useNoA()
const noG = useNoG()

// @ts-expect-error
store.notExisting

// @ts-expect-error
noSAG.notExisting
// @ts-expect-error
noSAG.$state.hey

// @ts-expect-error
noSA.notExisting
// @ts-expect-error
noSA.notExisting
// @ts-expect-error
noAG.notExisting
// @ts-expect-error
noSG.notExisting
// @ts-expect-error
noS.notExisting
// @ts-expect-error
noA.notExisting
// @ts-expect-error
noG.notExisting

function takeStore<TStore extends StoreGeneric>(store: TStore): TStore['$id'] {
  return store.$id
}

export const useSyncValueToStore = <
  TStore extends StoreGeneric,
  TKey extends keyof TStore['$state']
>(
  propGetter: () => TStore[TKey],
  store: TStore,
  key: TKey
): void => {
  watch(
    propGetter,
    (propValue) => {
      store[key] = propValue
    },
    {
      immediate: true,
    }
  )
}

useSyncValueToStore(() => 'on' as const, store, 'a')
// @ts-expect-error
useSyncValueToStore(() => true, store, 'a')
takeStore(store)
takeStore(noSAG)
// @ts-expect-error
useSyncValueToStore(() => 2, noSAG, 'nope')
// @ts-expect-error
useSyncValueToStore(() => null, noSAG, 'myState')
takeStore(noSA)
takeStore(noAG)
useSyncValueToStore(() => 2, noAG, 'myState')
takeStore(noSG)
takeStore(noS)
takeStore(noA)
useSyncValueToStore(() => 2, noA, 'myState')
takeStore(noG)
useSyncValueToStore(() => 2, noG, 'myState')

declare var genericStore: StoreGeneric

// should not fail like it does with Store
expectType<any>(genericStore.thing)
expectType<any>(genericStore.$state.thing)
takeStore(genericStore)
useSyncValueToStore(() => 2, genericStore, 'myState')
// @ts-expect-error: this type is known so it should yield an error
useSyncValueToStore(() => false, genericStore, 'myState')
useSyncValueToStore(() => 2, genericStore, 'random')
