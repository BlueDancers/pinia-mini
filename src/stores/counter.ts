import { computed } from "@vue/reactivity";
import { ref } from "vue";
import { defineStore } from "../../pinia/src";

// 为什么defineStore第一次执行，因为defineStore是一个函数，在当前场景下进行传参使用，
export const useCounterStore1 = defineStore("counter1", {
  state() {
    return {
      counter: 0,
    };
  },
  getters: {
    doubleCount: (state) => state.counter * 2,
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

export const useCounterStore3 = defineStore("counter3", () => {
  const counter = ref(0);
  const doubleCount = computed(() => {
    return counter.value * 2;
  });
  function increment() {
    counter.value++;
  }
  return { counter, doubleCount, increment };
});

console.log(123);

function abcd(aaa) {
  console.log("abcd", aaa);
}

let aa = abcd("aaa");

const abc = test(() => {
  console.log(111);
});

function test(aaa: any) {
  aaa();
}
