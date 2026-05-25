/**
 * LetterAvatar - Shows profile image when avatar_url provided, otherwise first letter of name
 */

import React, { memo } from 'react';
import { View, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { AppText as Text } from './AppText';
import { AURORA } from '../../constants/aurora-colors';

interface LetterAvatarProps {
    name: string;
    size?: number;
    backgroundColor?: string;
    textColor?: string;
    /** When provided, shows the image instead of the letter */
    avatarUrl?: string | null;
}

export const LetterAvatar = memo(function LetterAvatar({
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
                    { width: size, height: size, borderRadius: size / 2},
                ]}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={avatarUrl}
                transition={200}
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
});

export const LetterAvatarWithBorder = memo(function LetterAvatarWithBorder({
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
                    { width: size, height: size, borderRadius: size / 2, borderWidth: 2, borderColor: AURORA.blue },
                ]}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={avatarUrl}
                transition={200}
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
});

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
