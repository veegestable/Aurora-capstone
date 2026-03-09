/**
 * LetterAvatar - Shows first letter of name, no dummy images
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { AURORA } from '../../constants/aurora-colors';

interface LetterAvatarProps {
    name: string;
    size?: number;
    backgroundColor?: string;
    textColor?: string;
}

export function LetterAvatar({
    name,
    size = 44,
    backgroundColor = AURORA.card,
    textColor = AURORA.blue,
}: LetterAvatarProps) {
    const letter = name?.trim().charAt(0).toUpperCase() || '?';
    return (
        <View
            style={[
                styles.avatar,
                {
                    width: size,
                    height: size,
                    borderRadius: size / 2,
                    backgroundColor,
                },
            ]}
        >
            <Text style={[styles.letter, { fontSize: size * 0.42, color: textColor }]}>{letter}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    avatar: {
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: AURORA.border,
    },
    letter: {
        fontWeight: '700',
    },
});
