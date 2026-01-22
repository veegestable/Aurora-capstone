import React, { forwardRef } from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerClassName?: string;
}

export const Input = forwardRef<TextInput, InputProps>(({
    label,
    error,
    className,
    containerClassName,
    ...props
}, ref) => {
    return (
        <View className={twMerge("space-y-1.5", containerClassName)}>
            {label && (
                <Text className="text-gray-700 font-medium text-sm ml-1">
                    {label}
                </Text>
            )}
            <TextInput
                ref={ref}
                className={twMerge(
                    "bg-white border text-gray-900 text-base rounded-xl px-4 py-3",
                    error ? "border-red-500" : "border-gray-200 focus:border-blue-500",
                    className
                )}
                placeholderTextColor="#9CA3AF"
                {...props}
            />
            {error && (
                <Text className="text-red-500 text-xs ml-1">{error}</Text>
            )}
        </View>
    );
});

Input.displayName = 'Input';
