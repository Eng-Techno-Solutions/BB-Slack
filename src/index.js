import { AppRegistry } from "react-native";
import App from "./App";

AppRegistry.registerComponent("BBSlack", () => App);
AppRegistry.runApplication("BBSlack", {
  rootTag: document.getElementById("root"),
});
