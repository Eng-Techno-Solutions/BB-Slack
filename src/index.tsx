import App from "./App";
import { AppRegistry } from "react-native";

AppRegistry.registerComponent("BBSlack", () => App);
AppRegistry.runApplication("BBSlack", {
	rootTag: document.getElementById("root")
});
