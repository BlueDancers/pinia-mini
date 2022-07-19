import { defineStore } from "../super-mini-pinia/index";

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
    dnum: (state: any) => state.num * 2,
  },
});
