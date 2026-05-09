/**
 * AndroidWheelDateTimePicker
 *
 * Full date + time wheel picker for Android (glass blur, Date/Time tabs),
 * matching counselor SendSessionInviteModal behavior. Centered modal shell
 * matches AndroidWheelTimePicker used on Profile reminders.
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

function getDaysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function formatPickerPreview(date: Date): string {
  return `${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })} at ${date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })}`;
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

export interface AndroidWheelDateTimePickerProps {
  visible: boolean;
  /** Seeds wheels whenever `visible` becomes true. */
  value: Date;
  title?: string;
  onConfirm: (date: Date) => void;
  onClose: () => void;
}

export function AndroidWheelDateTimePicker({
  visible,
  value,
  title = "Preferred time",
  onConfirm,
  onClose,
}: AndroidWheelDateTimePickerProps) {
  const currentYear = new Date().getFullYear();
  const [step, setStep] = useState<"date" | "time">("date");
  const [wheelMonth, setWheelMonth] = useState(0);
  const [wheelDay, setWheelDay] = useState(1);
  const [wheelYear, setWheelYear] = useState(currentYear);
  const [wheelHour, setWheelHour] = useState(12);
  const [wheelMinute, setWheelMinute] = useState(0);
  const [wheelPeriod, setWheelPeriod] = useState<"AM" | "PM">("AM");

  const seedFromDate = (d: Date) => {
    let hour = d.getHours();
    const period: "AM" | "PM" = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    setWheelMonth(d.getMonth());
    setWheelDay(d.getDate());
    setWheelYear(d.getFullYear());
    setWheelHour(hour);
    setWheelMinute(d.getMinutes());
    setWheelPeriod(period);
    setStep("date");
  };

  useEffect(() => {
    if (!visible) return;
    seedFromDate(value);
  }, [visible, value]);

  const months = useMemo<WheelOption[]>(
    () => [
      { label: "Jan", value: 0 },
      { label: "Feb", value: 1 },
      { label: "Mar", value: 2 },
      { label: "Apr", value: 3 },
      { label: "May", value: 4 },
      { label: "Jun", value: 5 },
      { label: "Jul", value: 6 },
      { label: "Aug", value: 7 },
      { label: "Sep", value: 8 },
      { label: "Oct", value: 9 },
      { label: "Nov", value: 10 },
      { label: "Dec", value: 11 },
    ],
    [],
  );
  const years = useMemo<WheelOption[]>(
    () =>
      Array.from({ length: 6 }, (_, i) => ({
        label: String(currentYear + i),
        value: currentYear + i,
      })),
    [currentYear],
  );
  const daysInActiveMonth = getDaysInMonth(wheelYear, wheelMonth);
  const days = useMemo<WheelOption[]>(
    () =>
      Array.from({ length: daysInActiveMonth }, (_, i) => ({
        label: String(i + 1).padStart(2, "0"),
        value: i + 1,
      })),
    [daysInActiveMonth],
  );
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

  useEffect(() => {
    const maxDay = getDaysInMonth(wheelYear, wheelMonth);
    if (wheelDay > maxDay) setWheelDay(maxDay);
  }, [wheelMonth, wheelYear, wheelDay]);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const selectedDateStart = new Date(wheelYear, wheelMonth, wheelDay);
  const builtPreview = new Date(
    wheelYear,
    wheelMonth,
    wheelDay,
    (wheelHour % 12) + (wheelPeriod === "PM" ? 12 : 0),
    wheelMinute,
    0,
    0,
  );
  const dateInPast = step === "date" && selectedDateStart < todayStart;
  const selectionInPast = step === "time" && builtPreview < now;

  const handlePrimary = () => {
    if (step === "date") {
      if (selectedDateStart < todayStart) return;
      setStep("time");
      return;
    }
    const atConfirm = new Date();
    let hour24 = wheelHour % 12;
    if (wheelPeriod === "PM") hour24 += 12;
    const built = new Date(
      wheelYear,
      wheelMonth,
      wheelDay,
      hour24,
      wheelMinute,
      0,
      0,
    );
    if (built < atConfirm) return;
    onConfirm(built);
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
            <Text style={styles.hint}>{title}</Text>
            <Text style={styles.preview}>{formatPickerPreview(builtPreview)}</Text>
            {dateInPast ? (
              <Text style={styles.validation}>
                Pick today or a future date to continue.
              </Text>
            ) : null}
            {selectionInPast ? (
              <Text style={styles.validation}>
                Pick a future time to continue.
              </Text>
            ) : null}
            <View style={styles.stepTabs}>
              <TouchableOpacity
                onPress={() => setStep("date")}
                style={[styles.stepTab, step === "date" && styles.stepTabActive]}
              >
                <Text
                  style={[
                    styles.stepTabText,
                    step === "date" && styles.stepTabTextActive,
                  ]}
                >
                  Date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setStep("time")}
                style={[styles.stepTab, step === "time" && styles.stepTabActive]}
              >
                <Text
                  style={[
                    styles.stepTabText,
                    step === "time" && styles.stepTabTextActive,
                  ]}
                >
                  Time
                </Text>
              </TouchableOpacity>
            </View>
            {step === "date" ? (
              <View style={styles.wheelRow}>
                <WheelColumn
                  options={months}
                  selectedValue={wheelMonth}
                  onValueChange={(v) => setWheelMonth(v as number)}
                />
                <WheelColumn
                  options={days}
                  selectedValue={wheelDay}
                  onValueChange={(v) => setWheelDay(v as number)}
                />
                <WheelColumn
                  options={years}
                  selectedValue={wheelYear}
                  onValueChange={(v) => setWheelYear(v as number)}
                />
              </View>
            ) : (
              <View style={styles.wheelRow}>
                <WheelColumn
                  options={hours}
                  selectedValue={wheelHour}
                  onValueChange={(v) => setWheelHour(v as number)}
                />
                <WheelColumn
                  options={minutes}
                  selectedValue={wheelMinute}
                  onValueChange={(v) => setWheelMinute(v as number)}
                />
                <WheelColumn
                  options={periods}
                  selectedValue={wheelPeriod}
                  onValueChange={(v) => setWheelPeriod(v as "AM" | "PM")}
                />
              </View>
            )}
          </BlurView>
          <View style={styles.actions}>
            <TouchableOpacity onPress={onClose} style={styles.btn}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handlePrimary}
              disabled={dateInPast || selectionInPast}
              style={[
                styles.btn,
                styles.btnPrimary,
                (dateInPast || selectionInPast) && styles.btnDisabled,
              ]}
            >
              <Text style={styles.btnTextPrimary}>
                {step === "date" ? "Next" : "Confirm"}
              </Text>
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
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  validation: {
    color: "#FFB4B4",
    fontSize: 12,
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  stepTabs: {
    flexDirection: "row",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: 10,
    padding: 3,
    marginHorizontal: 4,
    marginBottom: 8,
  },
  stepTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    borderRadius: 8,
  },
  stepTabActive: {
    backgroundColor: "rgba(45,107,255,0.3)",
  },
  stepTabText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 13,
    fontWeight: "600",
  },
  stepTabTextActive: {
    color: "#FFFFFF",
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
  btnDisabled: {
    opacity: 0.45,
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
