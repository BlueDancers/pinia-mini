import { defineStore } from "../my-pinia/index";

export const useCounterStore = defineStore({
  id: "counter",
  state: () => ({
    num: 0,
  }),
  actions: {
    addNum() {
      this.num++;
    },
  },
  getters: {
    dnum: (state) => state.num * 2,
  },
});
