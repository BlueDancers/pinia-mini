import { ref } from "vue";
import { defineStore } from "../../pinia/src";

export const useCounterStore1 = defineStore({
  id: "counter1",
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

export const useCounterStore2 = defineStore("counter2", {
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

export const useCounterStore3 = defineStore("counter3", () => {
  const count = ref(0);
  function increment() {
    count.value++;
  }
  return { count, increment };
});

export const aaa = () => {
  console.log("ahahaha");
};
