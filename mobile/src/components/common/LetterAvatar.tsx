/**
 * LetterAvatar - Shows profile image when avatar_url provided, otherwise first letter of name
 */

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { AURORA } from '../../constants/aurora-colors';

interface LetterAvatarProps {
    name: string;
    size?: number;
    backgroundColor?: string;
    textColor?: string;
    /** When provided, shows the image instead of the letter */
    avatarUrl?: string | null;
}

export function LetterAvatar({
    name,
    size = 44,
    backgroundColor = AURORA.card,
    textColor = AURORA.blue,
    avatarUrl,
}: LetterAvatarProps) {
    const letter = name?.trim().charAt(0).toUpperCase() || '?';

    if (avatarUrl) {
        return (
            <Image
                source={{ uri: avatarUrl }}
                style={[
                    styles.avatar,
                    styles.image,
                    { width: size, height: size, borderRadius: size / 2 },
                ]}
                resizeMode="cover"
            />
        );
    }

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
    image: {
        borderWidth: 1,
        borderColor: AURORA.border,
    },
    letter: {
        fontWeight: '700',
    },
});
