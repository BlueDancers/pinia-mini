<template>
  <div>
    {{ useCounter1.counter }}
  </div>
</template>

<script setup lang="ts">
import { onMounted } from "vue";
import {
  useCounterStore1,
  useCounterStore2,
  useCounterStore3,
} from "./stores/counter";

const useCounter1 = useCounterStore1();
const useCounter2 = useCounterStore2();
const useCounter3 = useCounterStore3();
console.log(useCounter1);

onMounted(() => {
  setInterval(() => {
    useCounter1.$patch((state) => {
      state.counter++;
    });
  }, 1000);

  setTimeout(() => {
    console.log('停止所有副作用');
    useCounter1.$dispose()
  }, 5000);

  // useCounter1.$onAction((option) => {
  //   let { after, onError, args, name, store } = option;
  //   console.log(option);
  //   after((res) => {
  //     console.log(res);
  //   });
  //   onError((error) => {
  //     console.log(error);
  //   });
  // });

  // useCounter1.$subscribe(
  //   (option, state) => {
  //     // 通过store.num = xxxx修改，type为direct
  //     // 通过store.$patch({ num: 'xxx' })修改，type为directpatchObject
  //     // 通过store.$patch((state) => num.name='xxx')修改，type为patchFunction

  //     // storeId为当前store的id
  //     // events 当前改动说明
  //     let { events, storeId, type } = option;
  //     console.log(events, storeId, type, state);
  //   },
  //   { detached: false }
  // );
});
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
