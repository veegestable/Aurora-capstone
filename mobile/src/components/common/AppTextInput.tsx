import React, { forwardRef } from "react";
import * as ReactNative from "react-native";
import {
  APP_FONT_FAMILY,
  getAppFontFamilyByWeight,
} from "../../constants/typography";

export const AppTextInput = forwardRef<ReactNative.TextInput, ReactNative.TextInputProps>(
  function AppTextInput({ style, ...rest }, ref) {
    const flattenedStyle = ReactNative.StyleSheet.flatten(style) as ReactNative.TextStyle | undefined;
    const resolvedFontFamily =
      getAppFontFamilyByWeight(flattenedStyle?.fontWeight) || APP_FONT_FAMILY;

    return (
      <ReactNative.TextInput
        ref={ref}
        {...rest}
        style={[{ fontFamily: resolvedFontFamily }, style]}
      />
    );
  },
);
