import { ReactNode } from 'react';
import { Modal as RNModal, View } from 'react-native';

interface ModalProps {
    visible: boolean;
    children: ReactNode;
}

export function Modal({ visible, children }: ModalProps) {
    return (
        <RNModal transparent visible={visible} animationType="fade">
            <View className="flex-1 items-center justify-center bg-black/30 p-6">
                <View className="w-full rounded-2xl bg-white p-4">{children}</View>
            </View>
        </RNModal>
    );
}
