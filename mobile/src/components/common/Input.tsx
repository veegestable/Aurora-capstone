import React, { forwardRef } from 'react';
import { View, TextInputProps, type TextInput as RNTextInput } from 'react-native';
import { AppText as Text } from './AppText';
import { AppTextInput as TextInput } from './AppTextInput';
import { twMerge } from 'tailwind-merge';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerClassName?: string;
    variant?: 'default' | 'glass';
    /** Tighter padding for compact layouts (e.g. login). */
    dense?: boolean;
    /** Glass labels only; use with centered form layouts. */
    labelAlign?: 'left' | 'center';
}

export const Input = forwardRef<RNTextInput, InputProps>(({
    label,
    error,
    className,
    containerClassName,
    variant = 'default',
    placeholderTextColor,
    dense = false,
    labelAlign = 'left',
    ...props
}, ref) => {
    const isGlass = variant === 'glass';
    const labelCentered = isGlass && labelAlign === 'center';
    return (
        <View className={twMerge("space-y-1.5", containerClassName)}>
            {label && (
                <Text
                    className={twMerge(
                        "text-sm",
                        !labelCentered && "ml-1",
                        !isGlass && "text-gray-700",
                    )}
                    style={[
                        isGlass ? { color: '#FFFFFF', fontWeight: '600', marginBottom: dense ? 5 : 6 } : { fontWeight: '500' },
                        labelCentered && { textAlign: 'center', width: '100%' },
                    ]}
                >
                    {label}
                </Text>
            )}
            <TextInput
                ref={ref}
                style={isGlass ? {
                    color: '#FFFFFF',
                    backgroundColor: 'rgba(166, 166, 166, 0.22)',
                    borderWidth: 0.5,
                    // borderColor: 'rgba(255, 255, 255, 0.4)',
                    borderRadius: dense ? 14 : 16,
                    paddingHorizontal: dense ? 12 : 16,
                    paddingVertical: 0,
                    height: dense ? 44 : 48,
                    fontSize: dense ? 15 : 16,
                    lineHeight: dense ? 20 : 20,
                    textAlignVertical: 'center',
                    includeFontPadding: false,
                } : undefined}
                className={twMerge(
                    isGlass ? "text-base" : "text-base rounded-xl px-4 py-3 border",
                    !isGlass && "bg-white border-gray-200 text-gray-900",
                    error ? "border-red-500" : !isGlass && "focus:border-blue-500",
                    className
                )}
                placeholderTextColor={placeholderTextColor ?? (isGlass ? "#F8FAFC" : "#9CA3AF")}
                {...props}
            />
            {error && (
                <Text className="text-red-500 text-xs ml-1">{error}</Text>
            )}
        </View>
    );
});

Input.displayName = 'Input';
