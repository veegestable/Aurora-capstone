import React, { forwardRef } from "react";
import * as ReactNative from "react-native";
import {
  APP_FONT_FAMILY,
  getAppFontFamilyByWeight,
} from "../../constants/typography";

export const AppText = forwardRef<ReactNative.Text, ReactNative.TextProps>(function AppText(
  { style, ...rest },
  ref,
) {
  const flattenedStyle = ReactNative.StyleSheet.flatten(style) as ReactNative.TextStyle | undefined;
  const resolvedFontFamily =
    getAppFontFamilyByWeight(flattenedStyle?.fontWeight) || APP_FONT_FAMILY;

  return (
    <ReactNative.Text
      ref={ref}
      {...rest}
      style={[{ fontFamily: resolvedFontFamily }, style]}
    />
  );
});
