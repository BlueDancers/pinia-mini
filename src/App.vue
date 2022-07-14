<template>
  <div>
    {{ user }}
  </div>
</template>

<script setup lang="ts">
import {
  effectScope,
  onMounted,
  ref,
  reactive,
  watch,
  watchEffect,
  toRaw,
  markRaw,
} from "vue";
import { useCounterStore1, useCounterStore2 } from "./stores/counter";

const useCounter1 = useCounterStore1();
const useCounter2 = useCounterStore2();
console.log(useCounter1);

onMounted(() => {
  setInterval(() => {
    useCounter1.increment();
  }, 1000);
});
watchEffect(() => {
  console.log(useCounter1.counter);
});

// const foo = {};
// const reactiveFoo = reactive(foo);
// console.log("toRaw", toRaw(reactiveFoo) === foo); // true 可以得知toRaw可以获取一个响应式对象的原始属性

// const foo1 = {};
// const refFoo1 = ref(foo1);
// console.log("toRaw", toRaw(refFoo1.value) === foo1); // true

const obj = { name: "alice", age: 18 };
markRaw(obj); // 经过markRaw包装后，obj将不在允许被观察

const user = reactive(obj);
console.log(user, "markRaw");
setInterval(() => {
  user.age = 20;
}, 1000);
</script>

<style>
@import "./assets/base.css";

#app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;

  font-weight: normal;
}

header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

a,
.green {
  text-decoration: none;
  color: hsla(160, 100%, 37%, 1);
  transition: 0.4s;
}

@media (hover: hover) {
  a:hover {
    background-color: hsla(160, 100%, 37%, 0.2);
  }
}

@media (min-width: 1024px) {
  body {
    display: flex;
    place-items: center;
  }

  #app {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 0 2rem;
  }

  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }

  .logo {
    margin: 0 2rem 0 0;
  }
}
</style>
