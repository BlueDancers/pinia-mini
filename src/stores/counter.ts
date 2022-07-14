import { ref } from "vue";
import { defineStore } from "../../pinia/src";

export const useCounterStore1 = defineStore("counter1", {
  state() {
    return {
      counter: 0,
    };
  },
  actions: {
    increment() {
      this.counter++;
    },
  },
});

export const useCounterStore2 = defineStore({
  id: "counter2",
  state: () => ({
    counter: 0,
  }),
  getters: {
    doubleCount: (state) => state.counter * 2,
  },
  actions: {
    increment() {
      this.counter++;
    },
  },
});

// export const useCounterStore3 = defineStore(
//   "counter3",
//   () => {
//     const counter = ref(0);
//     function increment() {
//       counter.value++;
//     }
//     return { counter, increment };
//   },
//   {
//     // actions: {
//     //   increment() {
//     //     this.increment();
//     //   },
//     // },
//   }
// );
