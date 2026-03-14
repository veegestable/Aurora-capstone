import React, { forwardRef } from 'react';
import { TextInput, View, Text, TextInputProps } from 'react-native';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface InputProps extends TextInputProps {
    label?: string;
    error?: string;
    containerClassName?: string;
    variant?: 'default' | 'glass';
}

export const Input = forwardRef<TextInput, InputProps>(({
    label,
    error,
    className,
    containerClassName,
    variant = 'default',
    placeholderTextColor,
    ...props
}, ref) => {
    const isGlass = variant === 'glass';
    return (
        <View className={twMerge("space-y-1.5", containerClassName)}>
            {label && (
                <Text
                    className={twMerge("text-sm ml-1", !isGlass && "text-gray-700")}
                    style={isGlass ? { color: '#FFFFFF', fontWeight: '600', marginBottom: 6 } : { fontWeight: '500' }}
                >
                    {label}
                </Text>
            )}
            <TextInput
                ref={ref}
                style={isGlass ? {
                    color: '#FFFFFF',
                    backgroundColor: 'rgba(255, 255, 255, 0.22)',
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.4)',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 14,
                    fontSize: 16,
                } : undefined}
                className={twMerge(
                    "text-base rounded-xl px-4 py-3 border",
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
