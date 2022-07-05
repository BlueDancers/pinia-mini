import { createApp } from "vue";
import { createPinia } from "../pinia/src";
import App from "./App.vue";

const app = createApp(App);

const pinia = createPinia();
console.log(pinia);

app.use(pinia);

app.mount("#app");
