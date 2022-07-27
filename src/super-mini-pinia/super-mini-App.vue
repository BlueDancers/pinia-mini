<template>
  <div>
    <div>state.num:{{ useStore.num }}</div>
    <div>getters.dnum:{{ useStore.dnum }}</div>
    <button @click="addNum">增加</button>
  </div>
</template>

<script setup lang="ts">
import { watchEffect } from "vue";
import { useCounterStore } from "./store/counter";

const useStore = useCounterStore();

watchEffect(() => {
  console.log("watchEffect触发", useStore.num);
});

function addNum() {
  useStore.addNum();
}
</script>
