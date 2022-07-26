import { createApp } from "vue";
// import { createPinia } from "./pinia/src";
import { myCreatePinia } from "./super-mini-pinia/index";
// import App from "./App.vue";
import App from "./App-super-mini.vue";

const app = createApp(App);

// app.use(createPinia());
app.use(myCreatePinia());

app.mount("#app");
