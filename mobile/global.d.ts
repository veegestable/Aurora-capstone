declare module "react-native-global-props" {
  import type { TextStyle } from "react-native";

  export function setCustomText(props: { style?: TextStyle }): void;
  export function setCustomTextInput(props: { style?: TextStyle }): void;
}
