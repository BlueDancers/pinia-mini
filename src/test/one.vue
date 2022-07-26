<template>
  <div>
    <div>{{ react.num }}</div>
    <button @click="addNummm">增加</button>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, toRefs } from "vue";

const store: any = ref({});
const state = () => {
  return { num: 0 };
};
store.value.state = state();
const localState = toRefs(store.value.state);
const react = reactive(Object.assign(localState));

function addNummm() {
  react.num++;
}
</script>

<style scoped></style>
