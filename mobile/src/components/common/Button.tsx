import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, TouchableOpacityProps, View } from 'react-native';

// Fix for React 19 type mismatch
const CompatibleTouchableOpacity = TouchableOpacity as React.ComponentType<TouchableOpacityProps & React.RefAttributes<View>>;
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface ButtonProps extends TouchableOpacityProps {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    children: React.ReactNode;
    loading?: boolean;
}

export function Button({
    className,
    variant = 'primary',
    size = 'md',
    children,
    loading,
    disabled,
    ...props
}: ButtonProps) {

    const baseStyles = "flex-row items-center justify-center rounded-xl";

    const variants = {
        primary: "bg-blue-600",
        secondary: "bg-purple-100",
        outline: "border-2 border-blue-600 bg-transparent",
        ghost: "bg-transparent",
        danger: "bg-red-500"
    };

    const textVariants = {
        primary: "text-white font-semibold",
        secondary: "text-purple-700 font-semibold",
        outline: "text-blue-600 font-semibold",
        ghost: "text-gray-600 font-medium",
        danger: "text-white font-semibold"
    };

    const sizes = {
        sm: "px-3 py-2",
        md: "px-4 py-3",
        lg: "px-6 py-4"
    };

    const textSizes = {
        sm: "text-sm",
        md: "text-base",
        lg: "text-lg"
    };

    return (
        <CompatibleTouchableOpacity
            className={twMerge(
                baseStyles,
                variants[variant],
                sizes[size],
                disabled || loading ? "opacity-50" : "opacity-100",
                className
            )}
            disabled={disabled || loading}
            activeOpacity={0.7}
            {...props}
        >
            {loading ? (
                <ActivityIndicator color={variant === 'outline' || variant === 'ghost' ? '#2563EB' : 'white'} />
            ) : (
                <Text className={twMerge(textVariants[variant], textSizes[size])}>
                    {children}
                </Text>
            )}
        </CompatibleTouchableOpacity>
    );
}
