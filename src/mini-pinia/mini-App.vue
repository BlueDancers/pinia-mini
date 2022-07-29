<template>
  <div>
    <div>state.num:{{ useStore.num }}</div>
    <div>getters.dnum:{{ useStore.dnum }}</div>
    <button @click="addNum">增加</button>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watchEffect } from "vue";
import { useCounterStore } from "./store/counter";

const useStore = useCounterStore();

onMounted(() => {
  setInterval(() => {
    useStore.$reset();
  }, 3000);

  // setTimeout(() => {
  //   useStore.$dispose();
  // }, 9000);
});

watchEffect(() => {
  console.log("watchEffect触发", useStore.num);
});

function addNum() {
  useStore.addNum();
  // useStore.$patch((state: any) => {
  //   state.num++;
  // });
}
</script>
