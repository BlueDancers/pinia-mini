import { createApp } from "vue";
import { createPinia } from "../pinia/src";
import App from "./App.vue";
console.log("mian");
const app = createApp(App);

const pinia = createPinia();

app.use(pinia);

app.mount("#app");
