/**
 * AndroidWheelTimePicker
 *
 * A modal overlay time picker styled to match the in-app aesthetic of the
 * counselor `SendSessionInviteModal` wheel picker. Used on Android in place of
 * the system `DateTimePickerAndroid` clock dialog so reminders, meal, wake,
 * and bath schedule pickers all share a consistent in-app look.
 *
 * iOS continues to use `@react-native-community/datetimepicker` spinner.
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  StyleSheet,
} from "react-native";
import { BlurView } from "expo-blur";
import { AppText as Text } from "./AppText";
import { AURORA } from "../../constants/aurora-colors";

const WHEEL_ITEM_HEIGHT = 40;
const WHEEL_VISIBLE_ROWS = 3;

interface WheelOption {
  label: string;
  value: number | string;
}

function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

function WheelColumn({
  options,
  selectedValue,
  onValueChange,
}: {
  options: WheelOption[];
  selectedValue: number | string;
  onValueChange: (next: number | string) => void;
}) {
  const listRef = useRef<FlatList<WheelOption>>(null);
  const selectedIndex = Math.max(
    0,
    options.findIndex((o) => o.value === selectedValue),
  );
  const containerHeight = WHEEL_ITEM_HEIGHT * WHEEL_VISIBLE_ROWS;

  useEffect(() => {
    listRef.current?.scrollToOffset({
      offset: selectedIndex * WHEEL_ITEM_HEIGHT,
      animated: false,
    });
  }, [selectedIndex]);

  const handleEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    const idx = clamp(
      Math.round(offsetY / WHEEL_ITEM_HEIGHT),
      0,
      options.length - 1,
    );
    const next = options[idx];
    if (next && next.value !== selectedValue) onValueChange(next.value);
    listRef.current?.scrollToOffset({
      offset: idx * WHEEL_ITEM_HEIGHT,
      animated: true,
    });
  };

  return (
    <View style={[styles.wheelColumn, { height: containerHeight }]}>
      <FlatList
        ref={listRef}
        data={options}
        keyExtractor={(item) => `${item.value}`}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_HEIGHT}
        decelerationRate="fast"
        bounces={false}
        getItemLayout={(_data, index) => ({
          length: WHEEL_ITEM_HEIGHT,
          offset: WHEEL_ITEM_HEIGHT * index,
          index,
        })}
        contentContainerStyle={{ paddingVertical: WHEEL_ITEM_HEIGHT }}
        onMomentumScrollEnd={handleEnd}
        onScrollEndDrag={handleEnd}
        renderItem={({ item }) => {
          const selected = item.value === selectedValue;
          return (
            <View style={styles.wheelItem}>
              <Text
                style={[
                  styles.wheelItemText,
                  selected
                    ? styles.wheelItemTextSelected
                    : styles.wheelItemTextUnselected,
                ]}
              >
                {item.label}
              </Text>
            </View>
          );
        }}
      />
      <View pointerEvents="none" style={styles.wheelFadeTop} />
      <View pointerEvents="none" style={styles.wheelFadeBottom} />
    </View>
  );
}

export interface AndroidWheelTimePickerProps {
  visible: boolean;
  /** Initial time to seed the wheels with. Re-seeded each time `visible` flips to true. */
  value: Date;
  /** Small caption above the preview text (e.g. "Reminder time"). */
  title?: string;
  /** Optional helper text under the preview. */
  subtitle?: string;
  /** Label for the confirm button. Defaults to "Confirm". */
  confirmLabel?: string;
  onConfirm: (date: Date) => void;
  onClose: () => void;
}

function formatPreview(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function AndroidWheelTimePicker({
  visible,
  value,
  title,
  subtitle,
  confirmLabel = "Confirm",
  onConfirm,
  onClose,
}: AndroidWheelTimePickerProps) {
  const [hour12, setHour12] = useState<number>(12);
  const [minute, setMinute] = useState<number>(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");

  useEffect(() => {
    if (!visible) return;
    let h = value.getHours();
    const p: "AM" | "PM" = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    setHour12(h);
    setMinute(value.getMinutes());
    setPeriod(p);
  }, [visible, value]);

  const hours = useMemo<WheelOption[]>(
    () =>
      Array.from({ length: 12 }, (_, i) => ({
        label: String(i + 1),
        value: i + 1,
      })),
    [],
  );
  const minutes = useMemo<WheelOption[]>(
    () =>
      Array.from({ length: 60 }, (_, i) => ({
        label: String(i).padStart(2, "0"),
        value: i,
      })),
    [],
  );
  const periods = useMemo<WheelOption[]>(
    () => [
      { label: "AM", value: "AM" },
      { label: "PM", value: "PM" },
    ],
    [],
  );

  const previewDate = useMemo(() => {
    const d = new Date();
    let h24 = hour12 % 12;
    if (period === "PM") h24 += 12;
    d.setHours(h24, minute, 0, 0);
    return d;
  }, [hour12, minute, period]);

  const handleConfirm = () => {
    let h24 = hour12 % 12;
    if (period === "PM") h24 += 12;
    const base = value ? new Date(value) : new Date();
    base.setHours(h24, minute, 0, 0);
    onConfirm(base);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <BlurView intensity={55} tint="dark" style={styles.blur}>
            {title ? <Text style={styles.hint}>{title}</Text> : null}
            <Text style={styles.preview}>{formatPreview(previewDate)}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View style={styles.wheelRow}>
              <WheelColumn
                options={hours}
                selectedValue={hour12}
                onValueChange={(v) => setHour12(v as number)}
              />
              <WheelColumn
                options={minutes}
                selectedValue={minute}
                onValueChange={(v) => setMinute(v as number)}
              />
              <WheelColumn
                options={periods}
                selectedValue={period}
                onValueChange={(v) => setPeriod(v as "AM" | "PM")}
              />
            </View>
          </BlurView>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.btn}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={[styles.btn, styles.btnPrimary]}
            >
              <Text style={styles.btnTextPrimary}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: AURORA.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: AURORA.border,
    padding: 14,
  },
  blur: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(15,20,42,0.45)",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
  },
  hint: {
    color: AURORA.textMuted,
    fontSize: 12,
    marginBottom: 2,
    paddingHorizontal: 8,
  },
  preview: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  subtitle: {
    color: AURORA.textMuted,
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  wheelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  wheelColumn: {
    flex: 1,
    position: "relative",
    marginHorizontal: 2,
    overflow: "hidden",
    borderRadius: 10,
  },
  wheelItem: {
    height: WHEEL_ITEM_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  wheelItemText: {
    textAlign: "center",
  },
  wheelItemTextSelected: {
    color: "#FFFFFF",
    fontSize: 26,
    fontWeight: "700",
  },
  wheelItemTextUnselected: {
    color: "rgba(255,255,255,0.42)",
    fontSize: 19,
    fontWeight: "500",
  },
  wheelFadeTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: WHEEL_ITEM_HEIGHT,
    backgroundColor: "rgba(15,20,42,0.45)",
    zIndex: 3,
  },
  wheelFadeBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: WHEEL_ITEM_HEIGHT,
    backgroundColor: "rgba(15,20,42,0.45)",
    zIndex: 3,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 12,
  },
  btn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  btnPrimary: {
    backgroundColor: AURORA.blue,
    borderRadius: 8,
  },
  btnText: {
    color: AURORA.textSec,
    fontSize: 15,
  },
  btnTextPrimary: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
