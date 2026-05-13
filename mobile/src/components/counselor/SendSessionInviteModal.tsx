import { AppText as Text } from "../common/AppText";
import { AppTextInput as TextInput } from "../common/AppTextInput";
/**
 * SendSessionInviteModal - Bottom sheet for counselor to invite student to a session
 * Matches Aurora design: student profile, proposed time slots, supportive note
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Platform,
  KeyboardAvoidingView,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { X, Send, Calendar, Pencil, Info } from "lucide-react-native";
import { BlurView } from "expo-blur";
import { AURORA } from "../../constants/aurora-colors";
import { LetterAvatar } from "../common/LetterAvatar";

export type TimeSlotLabel =
  | "Primary Option"
  | "Alternative Option"
  | "Final Option";

export interface TimeSlot {
  label: TimeSlotLabel;
  date: Date | null;
}

export interface SessionInviteData {
  primaryDate: Date | null;
  alternativeDate: Date | null;
  finalDate: Date | null;
  note: string;
}

interface StudentInfo {
  id: string;
  name: string;
  student_number?: string;
  avatar?: string;
  program?: string;
}

interface SendSessionInviteModalProps {
  visible: boolean;
  /** `reschedule` = counselor-led new times (no generic “check in” intro). */
  mode?: "invite" | "reschedule";
  student: StudentInfo;
  counselorName?: string;
  initialData?: Partial<SessionInviteData>;
  onClose: () => void;
  onSend: (data: SessionInviteData) => void;
}

const SLOT_LABELS: TimeSlotLabel[] = [
  "Primary Option",
  "Alternative Option",
  "Final Option",
];
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

function formatDateTime(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}, ${date.toLocaleTimeString(
    "en-US",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    },
  )}`;
}

function formatPickerDateTime(date: Date): string {
  return `${date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} at ${date.toLocaleTimeString(
    "en-US",
    {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    },
  )}`;
}

const DEFAULT_INVITE_NOTE = (firstName: string) =>
  `Hi ${firstName}, I'd like to check in with you regarding your recent academic progress and see how you're settling into the new semester.`;

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

  const handleMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
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
        contentContainerStyle={{
          paddingVertical: WHEEL_ITEM_HEIGHT,
        }}
        onMomentumScrollEnd={handleMomentumEnd}
        onScrollEndDrag={handleMomentumEnd}
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

export default function SendSessionInviteModal({
  visible,
  mode = "invite",
  student,
  counselorName = "Counselor",
  initialData,
  onClose,
  onSend,
}: SendSessionInviteModalProps) {
  const [primaryDate, setPrimaryDate] = useState<Date | null>(null);
  const [alternativeDate, setAlternativeDate] = useState<Date | null>(null);
  const [finalDate, setFinalDate] = useState<Date | null>(null);
  const firstName = student.name.split(" ")[0] || "there";
  const [note, setNote] = useState(() => DEFAULT_INVITE_NOTE(firstName));
  const [pickingSlot, setPickingSlot] = useState<
    "primary" | "alternative" | "final" | null
  >(null);
  const [tempDate, setTempDate] = useState(new Date());
  const currentYear = new Date().getFullYear();
  const [wheelMonth, setWheelMonth] = useState<number>(new Date().getMonth());
  const [wheelDay, setWheelDay] = useState<number>(new Date().getDate());
  const [wheelYear, setWheelYear] = useState<number>(new Date().getFullYear());
  const [wheelHour, setWheelHour] = useState<number>(12);
  const [wheelMinute, setWheelMinute] = useState<number>(0);
  const [wheelPeriod, setWheelPeriod] = useState<"AM" | "PM">("AM");
  const [androidPickerStep, setAndroidPickerStep] = useState<"date" | "time">(
    "date",
  );
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const getSlotDate = (
    slot: "primary" | "alternative" | "final",
  ): Date | null => {
    if (slot === "primary") return primaryDate;
    if (slot === "alternative") return alternativeDate;
    return finalDate;
  };

  const seedWheelFromDate = (date: Date) => {
    let hour = date.getHours();
    const period: "AM" | "PM" = hour >= 12 ? "PM" : "AM";
    hour = hour % 12;
    if (hour === 0) hour = 12;
    setTempDate(date);
    setWheelMonth(date.getMonth());
    setWheelDay(date.getDate());
    setWheelYear(date.getFullYear());
    setWheelHour(hour);
    setWheelMinute(date.getMinutes());
    setWheelPeriod(period);
    setAndroidPickerStep("date");
  };

  useEffect(() => {
    if (!visible) return;
    const fn = student.name.split(" ")[0] || "there";
    const nowSeed = new Date();
    setPrimaryDate(initialData?.primaryDate ?? null);
    setAlternativeDate(initialData?.alternativeDate ?? null);
    setFinalDate(initialData?.finalDate ?? null);
    setNote(mode === "reschedule" ? "" : DEFAULT_INVITE_NOTE(fn));
    setTempDate(initialData?.primaryDate ?? nowSeed);
    setWheelMonth((initialData?.primaryDate ?? nowSeed).getMonth());
    setWheelDay((initialData?.primaryDate ?? nowSeed).getDate());
    setWheelYear((initialData?.primaryDate ?? nowSeed).getFullYear());
    let seededHour = (initialData?.primaryDate ?? nowSeed).getHours();
    const seededPeriod: "AM" | "PM" = seededHour >= 12 ? "PM" : "AM";
    seededHour = seededHour % 12;
    if (seededHour === 0) seededHour = 12;
    setWheelHour(seededHour);
    setWheelMinute((initialData?.primaryDate ?? nowSeed).getMinutes());
    setWheelPeriod(seededPeriod);
    setAndroidPickerStep("date");
  }, [
    visible,
    mode,
    student.id,
    student.name,
    student.student_number,
    initialData?.primaryDate,
    initialData?.alternativeDate,
    initialData?.finalDate,
  ]);

  const handleDateChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (selectedDate) {
      setTempDate(selectedDate);
    }
  };

  const applySlotDate = (
    slot: "primary" | "alternative" | "final",
    date: Date,
  ) => {
    if (slot === "primary") setPrimaryDate(date);
    if (slot === "alternative") setAlternativeDate(date);
    if (slot === "final") setFinalDate(date);
  };

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

  useEffect(() => {
    if (Platform.OS !== "android" || !pickingSlot) return;
    const activeSlotDate = getSlotDate(pickingSlot);
    seedWheelFromDate(activeSlotDate || new Date());
  }, [pickingSlot]);

  const handleConfirmDate = () => {
    if (Platform.OS === "android") {
      if (androidPickerStep === "date") {
        const selectedDateStart = new Date(wheelYear, wheelMonth, wheelDay);
        if (selectedDateStart < todayStart) return;
        setAndroidPickerStep("time");
        return;
      }
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
      if (built < now) return;
      setTempDate(built);
      if (pickingSlot) applySlotDate(pickingSlot, built);
      setPickingSlot(null);
      return;
    }
    if (pickingSlot === "primary") setPrimaryDate(tempDate);
    if (pickingSlot === "alternative") setAlternativeDate(tempDate);
    if (pickingSlot === "final") setFinalDate(tempDate);
    setPickingSlot(null);
  };

  const openPicker = (slot: "primary" | "alternative" | "final") => {
    const existing = getSlotDate(slot);
    const pickerValue = existing || new Date();
    seedWheelFromDate(pickerValue);
    setPickingSlot(slot);
  };

  const handleSend = () => {
    onSend({
      primaryDate,
      alternativeDate,
      finalDate,
      note: note.trim(),
    });
    setPrimaryDate(null);
    setAlternativeDate(null);
    setFinalDate(null);
    setNote(mode === "reschedule" ? "" : DEFAULT_INVITE_NOTE(firstName));
    onClose();
  };

  const purposeText =
    mode === "reschedule"
      ? "Pick new times for the student to confirm in chat."
      : "Invite to a supportive counseling session";
  const noteSectionTitle =
    mode === "reschedule"
      ? "OPTIONAL NOTE (ON SESSION CARD)"
      : "INCLUDE A SUPPORTIVE NOTE";
  const notePlaceholder =
    mode === "reschedule"
      ? "Add context for the reschedule (optional)..."
      : "Type your message...";
  const noteInfoText =
    mode === "reschedule"
      ? "Shown on the session card the student sees under your new time options."
      : "This message will be sent along with your invitation.";
  const sendBtnText =
    mode === "reschedule" ? "Send new times" : "Send Session Invite";

  const canSend = primaryDate !== null;
  const androidBuiltDateTime = new Date(
    wheelYear,
    wheelMonth,
    wheelDay,
    (wheelHour % 12) + (wheelPeriod === "PM" ? 12 : 0),
    wheelMinute,
    0,
    0,
  );
  const androidSelectedDateStart = new Date(wheelYear, wheelMonth, wheelDay);
  const androidDateInPast =
    Platform.OS === "android" &&
    pickingSlot !== null &&
    androidPickerStep === "date" &&
    androidSelectedDateStart < todayStart;
  const androidSelectionInPast =
    Platform.OS === "android" &&
    pickingSlot !== null &&
    androidPickerStep === "time" &&
    androidBuiltDateTime < now;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          <View style={styles.handleBar} />

          {/* Student Profile */}
          <View style={styles.profileSection}>
            <View style={styles.avatarWrap}>
              <LetterAvatar
                name={student.name}
                size={80}
                avatarUrl={
                  student.avatar?.trim() ? student.avatar.trim() : undefined
                }
              />
            </View>
            <Text style={styles.studentName}>{student.name}</Text>
            <Text style={styles.program}>
              {student.program || "BSCS 3rd Year"}
            </Text>
            <Text style={styles.purpose}>{purposeText}</Text>
          </View>

          <ScrollView
            style={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Proposed Time Slots */}
            <Text style={styles.sectionTitle}>PROPOSED TIME SLOTS</Text>
            {(["primary", "alternative", "final"] as const).map((slot, i) => {
              const value =
                slot === "primary"
                  ? primaryDate
                  : slot === "alternative"
                    ? alternativeDate
                    : finalDate;
              return (
                <TouchableOpacity
                  key={slot}
                  style={styles.slotCard}
                  onPress={() => openPicker(slot)}
                  activeOpacity={0.8}
                >
                  <View style={styles.slotIcon}>
                    <Calendar size={18} color={AURORA.blue} />
                  </View>
                  <View style={styles.slotContent}>
                    <Text style={styles.slotLabel}>{SLOT_LABELS[i]}</Text>
                    <Text
                      style={[styles.slotValue, !value && styles.placeholder]}
                    >
                      {value ? formatDateTime(value) : "mm/dd/yyyy, --:---"}
                    </Text>
                  </View>
                  <Pencil size={16} color={AURORA.blue} />
                </TouchableOpacity>
              );
            })}

            {/* Supportive Note */}
            <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
              {noteSectionTitle}
            </Text>
            <TextInput
              style={styles.noteInput}
              placeholder={notePlaceholder}
              placeholderTextColor={AURORA.textMuted}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={styles.infoRow}>
              <Info size={14} color={AURORA.textMuted} />
              <Text style={styles.infoText}>{noteInfoText}</Text>
            </View>
          </ScrollView>

          {/* Send Button */}
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.85}
          >
            <Send size={18} color="#FFFFFF" />
            <Text style={styles.sendBtnText}>{sendBtnText}</Text>
          </TouchableOpacity>

          {pickingSlot && (
            <View style={styles.pickerOverlay}>
              {Platform.OS === "android" ? (
                <BlurView
                  intensity={55}
                  tint="dark"
                  style={styles.androidPickerBlur}
                >
                  <Text style={styles.pickerHintText}>Preferred time</Text>
                  <Text style={styles.pickerPreviewText}>
                    {formatPickerDateTime(
                      new Date(
                        wheelYear,
                        wheelMonth,
                        wheelDay,
                        (wheelHour % 12) + (wheelPeriod === "PM" ? 12 : 0),
                        wheelMinute,
                      ),
                    )}
                  </Text>
                  {androidDateInPast && (
                    <Text style={styles.pickerValidationText}>
                      Pick today or a future date to continue.
                    </Text>
                  )}
                  {androidSelectionInPast && (
                    <Text style={styles.pickerValidationText}>
                      Pick a future time to continue.
                    </Text>
                  )}
                  <View style={styles.stepTabs}>
                    <TouchableOpacity
                      onPress={() => setAndroidPickerStep("date")}
                      style={[
                        styles.stepTab,
                        androidPickerStep === "date" && styles.stepTabActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepTabText,
                          androidPickerStep === "date" &&
                            styles.stepTabTextActive,
                        ]}
                      >
                        Date
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setAndroidPickerStep("time")}
                      style={[
                        styles.stepTab,
                        androidPickerStep === "time" && styles.stepTabActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepTabText,
                          androidPickerStep === "time" &&
                            styles.stepTabTextActive,
                        ]}
                      >
                        Time
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {androidPickerStep === "date" ? (
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
              ) : (
                <DateTimePicker
                  value={tempDate}
                  mode="datetime"
                  display="spinner"
                  onChange={handleDateChange}
                  minimumDate={new Date()}
                />
              )}
              <View style={styles.pickerActions}>
                <TouchableOpacity
                  onPress={() => setPickingSlot(null)}
                  style={styles.pickerBtn}
                >
                  <Text style={styles.pickerBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleConfirmDate}
                  disabled={androidDateInPast || androidSelectionInPast}
                  style={[
                    styles.pickerBtn,
                    styles.pickerBtnPrimary,
                    (androidDateInPast || androidSelectionInPast) &&
                      styles.pickerBtnDisabled,
                  ]}
                >
                  <Text style={styles.pickerBtnTextPrimary}>
                    {Platform.OS === "android" && androidPickerStep === "date"
                      ? "Next"
                      : "Confirm"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    backgroundColor: AURORA.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: AURORA.border,
    paddingHorizontal: 20,
    paddingBottom: 34,
    maxHeight: "90%",
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: AURORA.border,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 8,
  },
  profileSection: {
    alignItems: "center",
    marginBottom: 20,
  },
  avatarWrap: {
    position: "relative",
    marginBottom: 10,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: AURORA.cardAlt,
    borderWidth: 3,
    borderColor: AURORA.card,
  },
  onlineDot: {
    position: "absolute",
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: AURORA.green,
    borderWidth: 2,
    borderColor: AURORA.card,
  },
  studentName: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "700",
    marginBottom: 4,
  },
  program: {
    color: AURORA.blue,
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
  },
  purpose: {
    color: AURORA.textSec,
    fontSize: 14,
  },
  scroll: {
    maxHeight: 320,
  },
  sectionTitle: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 12,
  },
  slotCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: AURORA.cardDark,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: AURORA.border,
  },
  slotIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(45,107,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  slotContent: {
    flex: 1,
  },
  slotLabel: {
    color: AURORA.textSec,
    fontSize: 12,
    marginBottom: 2,
  },
  slotValue: {
    color: AURORA.blue,
    fontSize: 15,
    fontWeight: "700",
  },
  placeholder: {
    color: AURORA.textMuted,
    fontWeight: "400",
  },
  noteInput: {
    backgroundColor: AURORA.cardDark,
    borderRadius: 12,
    padding: 14,
    color: "#FFFFFF",
    fontSize: 14,
    minHeight: 100,
    borderWidth: 1,
    borderColor: AURORA.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  infoText: {
    color: AURORA.textMuted,
    fontSize: 12,
  },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: AURORA.blue,
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 16,
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  sendBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  pickerOverlay: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: AURORA.border,
  },
  androidPickerBlur: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
    backgroundColor: "rgba(15,20,42,0.45)",
    overflow: "hidden",
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 8,
  },
  pickerHintText: {
    color: AURORA.textMuted,
    fontSize: 12,
    marginBottom: 2,
    paddingHorizontal: 8,
  },
  pickerPreviewText: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    paddingHorizontal: 8,
  },
  pickerValidationText: {
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
  pickerActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 16,
    marginTop: 12,
  },
  pickerBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  pickerBtnPrimary: {
    backgroundColor: AURORA.blue,
    borderRadius: 8,
  },
  pickerBtnDisabled: {
    opacity: 0.45,
  },
  pickerBtnText: {
    color: AURORA.textSec,
    fontSize: 15,
  },
  pickerBtnTextPrimary: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
});
