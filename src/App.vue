<template>
  <div>
    <div>num:{{ useStore.num }}</div>
    <div>num*2:{{ useStore.dnum }}</div>
    <button @click="addNum">增加</button>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import { useCounterStore } from "./myStore/counter";

const useStore = useCounterStore();

onMounted(() => {
  console.log(useStore.num);
});

function addNum() {
  useStore.addNum();
}
</script>

<style scoped></style>
