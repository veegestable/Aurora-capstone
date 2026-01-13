import React, { useRef } from 'react';
import { View, PanResponder } from 'react-native';

interface SimpleSliderProps {
    value: number;
    onValueChange: (value: number) => void;
    minimumTrackTintColor?: string;
    thumbTintColor?: string;
    onSlidingStart?: () => void;
    onSlidingComplete?: () => void;
}

export const SimpleSlider = ({
    value,
    onValueChange,
    minimumTrackTintColor = '#2563EB',
    thumbTintColor = '#2563EB',
    onSlidingStart,
    onSlidingComplete
}: SimpleSliderProps) => {
    const widthRef = useRef(0);
    const startValue = useRef(0);

    // Refs for callbacks to ensure PanResponder always uses the latest functions
    const onValueChangeRef = useRef(onValueChange);
    const onSlidingStartRef = useRef(onSlidingStart);
    const onSlidingCompleteRef = useRef(onSlidingComplete);

    // Keep refs updated
    onValueChangeRef.current = onValueChange;
    onSlidingStartRef.current = onSlidingStart;
    onSlidingCompleteRef.current = onSlidingComplete;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponderCapture: () => true,
            onMoveShouldSetPanResponderCapture: () => true,
            onPanResponderTerminationRequest: () => false,
            onPanResponderGrant: (evt) => {
                if (onSlidingStartRef.current) onSlidingStartRef.current();
                const tapX = evt.nativeEvent.locationX;
                const width = widthRef.current;
                if (width > 0) {
                    const val = Math.max(0, Math.min(1, tapX / width));
                    startValue.current = val;
                    if (onValueChangeRef.current) onValueChangeRef.current(val);
                }
            },
            onPanResponderMove: (evt, gestureState) => {
                const { dx } = gestureState;
                const width = widthRef.current;
                if (width > 0) {
                    const newVal = Math.max(0, Math.min(1, startValue.current + (dx / width)));
                    if (onValueChangeRef.current) onValueChangeRef.current(newVal);
                }
            },
            onPanResponderRelease: () => {
                if (onSlidingCompleteRef.current) onSlidingCompleteRef.current();
            },
            onPanResponderTerminate: () => {
                if (onSlidingCompleteRef.current) onSlidingCompleteRef.current();
            },
        })
    ).current;

    return (
        <View
            style={{ height: 40, width: '100%', justifyContent: 'center' }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            onLayout={(e) => {
                widthRef.current = e.nativeEvent.layout.width;
            }}
            {...panResponder.panHandlers}
        >
            <View pointerEvents="none" style={{ height: 4, backgroundColor: '#E5E7EB', borderRadius: 2 }}>
                <View style={{
                    width: `${value * 100}%`,
                    height: '100%',
                    backgroundColor: minimumTrackTintColor,
                    borderRadius: 2
                }} />
            </View>
            <View pointerEvents="none" style={{
                position: 'absolute',
                left: `${value * 100}%`,
                marginLeft: -10,
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: thumbTintColor,
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
                elevation: 5,
                borderWidth: 2,
                borderColor: 'white'
            }} />
        </View>
    );
};
