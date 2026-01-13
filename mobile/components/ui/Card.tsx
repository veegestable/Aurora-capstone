import React from 'react';
import { View, ViewProps } from 'react-native';
import { twMerge } from 'tailwind-merge';

interface CardProps extends ViewProps {
    variant?: 'default' | 'flat' | 'bordered';
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
    const variants = {
        default: "bg-white shadow-sm border border-gray-100",
        flat: "bg-gray-50",
        bordered: "bg-white border-2 border-gray-200"
    };

    return (
        <View
            className={twMerge(
                "rounded-2xl p-4",
                variants[variant],
                className
            )}
            {...props}
        >
            {children}
        </View>
    );
}
