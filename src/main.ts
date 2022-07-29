import { createApp } from "vue";
import { createPinia } from "./pinia/src";
// import { myCreatePinia } from "./mini-pinia/source/index";
import App from "./App.vue";
// import App from "./mini-pinia/mini-App.vue";

const app = createApp(App);

app.use(createPinia());
// app.use(myCreatePinia());

app.mount("#app");
