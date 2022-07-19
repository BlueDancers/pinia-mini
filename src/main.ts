import { createApp } from "vue";
// import { createPinia } from "../pinia/src";
import { myCreatePinia } from "./my-pinia/index";
import App from "./App.vue";
console.log("mian");

const app = createApp(App);

// app.use(createPinia());
app.use(myCreatePinia());

app.mount("#app");
