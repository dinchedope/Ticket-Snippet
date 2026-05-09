import { createApp } from "vue";
import App from "./App.vue";
import "./style.css";

const app = createApp(App);

app.config.errorHandler = (err, info) => {
  if (import.meta.env.PROD) {
    console.error("[app error]", err, info);
    // тут можно отправить в Sentry/телеметрию
  } else {
    console.error(err, info);
  }
};

app.mount("#app");
