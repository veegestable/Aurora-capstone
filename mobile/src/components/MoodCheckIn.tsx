import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  Modal,
  PanResponder,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { Asset } from "expo-asset";
import * as Animatable from "react-native-animatable";
import Animated, {
  Easing,
  ReduceMotion,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  GraduationCap,
  Heart,
  MoonStar,
  PartyPopper,
  ShieldPlus,
  Sparkles,
  Users,
  Zap,
  MessageSquare,
  CircleHelp,
} from "lucide-react-native";
import { moodService } from "../services/mood.service";
import { AURORA } from "../constants/aurora-colors";
import { useAuth } from "../stores/AuthContext";
import { triggerHaptic } from "../utils/haptics";
import { EmotionDetection } from "./EmotionDetection";
import { BreathingContainer } from "./breathing/BreathingContainer";
import { useUserDaySettings } from "../stores/UserDaySettingsContext";
import { uploadImage } from "../services/firebase-storage.service";
import {
  calculateStressLevel,
  classifyStress,
  getDailyFeedback,
} from "../utils/analytics/ethicsDailyAnalytics";
import { logSuddenMoodDropIfNeeded } from "../utils/analytics/suddenMoodChange";
import { getMostRecentLogNotOnSameCalendarDay } from "../utils/analytics/dateKeys";
import { calendarDayKeyLocal } from "../utils/dayKey";
import {
  cycleDayKeyForUsualTime,
  isBeforeUsualHHmmToday,
} from "../utils/wellnessDayKey";
import {
  getDailyContext,
  setDailyContext,
  type ContextCategoryKey,
  type DailyContextDoc,
  type SleepQuality,
} from "../services/mood-firestore-v2.service";
import { getBreathingExerciseForMood } from "../features/breathing/breathing-data";
import {
  InfoGuideModal,
  type InfoGuideContent,
} from "./common/InfoGuideModal";

interface MoodCheckInProps {
  onComplete?: () => void;
  initialMood?: string | null;
}

interface DetectedEmotion {
  emotion: string;
  confidence: number;
  color: string;
}

type CategoryConfig = {
  key: ContextCategoryKey;
  title: string;
  helper: string;
  icon: React.ReactNode;
  tags: string[];
};

const SCHOOL_TAGS = [
  "classes",
  "study",
  "quiz",
  "exam",
  "homework",
  "deadline",
  "group-project",
  "presentation",
];

const MANUAL_EMOTIONS = [
  {
    name: "joy",
    color: AURORA.moodHappy,
    label: "Happy",
    image: require("../assets/moods3d/happy-3d.png"),
    icon: require("../assets/moodIcon/happy.png"),
  },
  {
    name: "sadness",
    color: AURORA.moodSad,
    label: "Sad",
    image: require("../assets/moods3d/sad-3d.png"),
    icon: require("../assets/moodIcon/sad.png"),
  },
  {
    name: "anger",
    color: AURORA.moodAngry,
    label: "Angry",
    image: require("../assets/moods3d/angry-3d.png"),
    icon: require("../assets/moodIcon/angry.png"),
  },
  {
    name: "surprise",
    color: AURORA.moodSurprise,
    label: "Surprise",
    image: require("../assets/moods3d/surprise-3d.png"),
    icon: require("../assets/moodIcon/surprise.png"),
  },
  {
    name: "neutral",
    color: AURORA.moodNeutral,
    label: "Neutral",
    image: require("../assets/moods3d/neutral-3d.png"),
    icon: require("../assets/moodIcon/neutral.png"),
  },
];

const SimpleSlider = ({
  value,
  onValueChange,
  minimumTrackTintColor,
  thumbTintColor,
  onSlidingStart,
  onSlidingComplete,
}: any) => {
  const widthRef = useRef(0);
  const startValue = useRef(0);
  const onValueChangeRef = useRef(onValueChange);
  const onSlidingStartRef = useRef(onSlidingStart);
  const onSlidingCompleteRef = useRef(onSlidingComplete);
  onValueChangeRef.current = onValueChange;
  onSlidingStartRef.current = onSlidingStart;
  onSlidingCompleteRef.current = onSlidingComplete;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (evt) => {
        onSlidingStartRef.current?.();
        const width = widthRef.current;
        if (width <= 0) return;
        const val = Math.max(0, Math.min(1, evt.nativeEvent.locationX / width));
        startValue.current = val;
        onValueChangeRef.current?.(val);
      },
      onPanResponderMove: (_evt, gestureState) => {
        const width = widthRef.current;
        if (width <= 0) return;
        const newVal = Math.max(
          0,
          Math.min(1, startValue.current + gestureState.dx / width),
        );
        onValueChangeRef.current?.(newVal);
      },
      onPanResponderRelease: () => onSlidingCompleteRef.current?.(),
      onPanResponderTerminate: () => onSlidingCompleteRef.current?.(),
    }),
  ).current;

  return (
    <View
      style={{ height: 40, width: "100%", justifyContent: "center" }}
      onLayout={(e) => {
        widthRef.current = e.nativeEvent.layout.width;
      }}
      {...panResponder.panHandlers}
    >
      <View
        pointerEvents="none"
        style={{ height: 4, backgroundColor: AURORA.cardAlt, borderRadius: 2 }}
      >
        <View
          style={{
            width: `${value * 100}%`,
            height: "100%",
            backgroundColor: minimumTrackTintColor,
            borderRadius: 2,
          }}
        />
      </View>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          left: `${value * 100}%`,
          marginLeft: -10,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: thumbTintColor,
          borderWidth: 2,
          borderColor: AURORA.bg,
        }}
      />
    </View>
  );
};

export function MoodCheckIn({
  onComplete,
  initialMood = null,
}: MoodCheckInProps) {
  const { user } = useAuth();
  const {
    timezone,
    academicContextEnabled,
    enabledContextCategories,
    mealSchedule,
    usualWakeTime,
    usualBathTime,
  } = useUserDaySettings();

  const [selectedEmotions, setSelectedEmotions] = useState<DetectedEmotion[]>(
    [],
  );
  const [moodInputMode, setMoodInputMode] = useState<"manual" | "selfie">(
    "manual",
  );
  const [detectionMethod, setDetectionMethod] = useState<
    "manual" | "selfie_ai"
  >("manual");
  const [intensityTen, setIntensityTen] = useState(6);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [durationInput, setDurationInput] = useState("60");
  const [energyLevel, setEnergyLevel] = useState(3);
  const [stressLevel, setStressLevel] = useState(3);
  const [sleepQuality, setSleepQuality] = useState<SleepQuality | null>(null);
  const [dailyContext, setDailyContextState] = useState<DailyContextDoc | null>(
    null,
  );
  const [sleepCapturedToday, setSleepCapturedToday] = useState(false);
  const [bathTakenToday, setBathTakenToday] = useState(false);
  const [bathTakenNow, setBathTakenNow] = useState(false);
  const [mealStatusById, setMealStatusById] = useState<Record<string, boolean>>(
    {},
  );
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [journalText, setJournalText] = useState("");
  const [journalEdited, setJournalEdited] = useState(false);
  const [showJournalEditor, setShowJournalEditor] = useState(false);
  const [journalImageUri, setJournalImageUri] = useState<string | null>(null);
  const [uploadingJournalImage, setUploadingJournalImage] = useState(false);

  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeGuide, setActiveGuide] = useState<InfoGuideContent | null>(null);
  const [submittedTodayCheckIns, setSubmittedTodayCheckIns] = useState(1);
  const [showQuickResetPrompt, setShowQuickResetPrompt] = useState(false);
  const [showQuickResetSession, setShowQuickResetSession] = useState(false);
  const [isScrollEnabled, setIsScrollEnabled] = useState(true);
  const scrollRef = useRef<ScrollView | null>(null);
  const durationInputYRef = useRef(0);
  const [expandedTagGroups, setExpandedTagGroups] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    // Warm local mood assets so first render does not wait on decode/download.
    void Promise.allSettled(
      MANUAL_EMOTIONS.flatMap((emotion) => [emotion.icon, emotion.image]).map(
        (assetModule) => Asset.fromModule(assetModule).downloadAsync(),
      ),
    );
  }, []);

  const selectedEmotion = selectedEmotions[0];
  const selectedManualEmotion =
    MANUAL_EMOTIONS.find(
      (emotion) => emotion.name === selectedEmotion?.emotion,
    ) ?? MANUAL_EMOTIONS[4];
  const firstName = user?.full_name ? user.full_name.split(" ")[0] : "there";
  const totalSteps = 3;

  const floatingProgress = useSharedValue(0);
  useEffect(() => {
    floatingProgress.value = withRepeat(
      withTiming(1, {
        duration: 1400,
        easing: Easing.inOut(Easing.sin),
        reduceMotion: ReduceMotion.Never,
      }),
      -1,
      true,
    );
    return () => cancelAnimation(floatingProgress);
  }, [floatingProgress]);

  const floatingMoodStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(floatingProgress.value, [0, 1], [0, -10]) },
      { scale: interpolate(floatingProgress.value, [0, 1], [1, 1.02]) },
    ],
  }));
  const floatingShadowStyle = useAnimatedStyle(() => ({
    opacity: interpolate(floatingProgress.value, [0, 1], [0.24, 0.12]),
    transform: [
      { scaleX: interpolate(floatingProgress.value, [0, 1], [1, 0.86]) },
      { scaleY: interpolate(floatingProgress.value, [0, 1], [1, 0.86]) },
    ],
  }));

  const renderMoodVisual = (
    emotion: (typeof MANUAL_EMOTIONS)[0],
    size: number,
  ) => {
    return (
      <Image
        source={emotion.icon}
        style={{ width: size, height: size }}
        resizeMode="contain"
        fadeDuration={0}
      />
    );
  };

  const parseMealMinutes = (time: string): number | null => {
    const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    if (!match) return null;
    const hour = Number(match[1]);
    const minute = Number(match[2]);
    if (
      Number.isNaN(hour) ||
      Number.isNaN(minute) ||
      hour < 0 ||
      hour > 23 ||
      minute < 0 ||
      minute > 59
    ) {
      return null;
    }
    return hour * 60 + minute;
  };

  const getCurrentMinutesInTimezone = (): number | null => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: timezone,
      }).formatToParts(new Date());
      const hour = Number(
        parts.find((part) => part.type === "hour")?.value ?? "0",
      );
      const minute = Number(
        parts.find((part) => part.type === "minute")?.value ?? "0",
      );
      if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
      return hour * 60 + minute;
    } catch {
      return null;
    }
  };

  const formatMealTime = (time: string): string => {
    const totalMinutes = parseMealMinutes(time);
    if (totalMinutes === null) return time;
    const hour24 = Math.floor(totalMinutes / 60);
    const minute = totalMinutes % 60;
    const suffix = hour24 >= 12 ? "PM" : "AM";
    const hour12 = hour24 % 12 || 12;
    return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
  };

  const isMealAvailableNow = (time: string): boolean => {
    const mealMinutes = parseMealMinutes(time);
    const nowMinutes = getCurrentMinutesInTimezone();
    if (mealMinutes === null || nowMinutes === null) return true;
    return nowMinutes >= mealMinutes;
  };

  const enabledCategorySet = new Set<ContextCategoryKey>(
    enabledContextCategories,
  );
  const isCategoryEnabled = (k: ContextCategoryKey) =>
    k === "school"
      ? academicContextEnabled && enabledCategorySet.has("school")
      : enabledCategorySet.has(k);

  const categoryConfigs: CategoryConfig[] = [
    {
      key: "school" as const,
      title: "School",
      helper: "Academic activities and pressure.",
      icon: <GraduationCap size={16} color={AURORA.blue} />,
      tags: SCHOOL_TAGS,
    },
    {
      key: "health" as const,
      title: "Health",
      helper: "Physical condition and body signals.",
      icon: <ShieldPlus size={16} color={AURORA.green} />,
      tags: [
        "headache",
        "pain",
        "sick",
        "medication",
        "exercise",
        "nap",
        "period",
        "low-appetite",
        "binge-eating",
      ],
    },
    {
      key: "social" as const,
      title: "Social",
      helper: "Relationships and interactions.",
      icon: <Users size={16} color={AURORA.purple} />,
      tags: [
        "friends",
        "family",
        "partner",
        "conflict",
        "alone",
        "social-media",
      ],
    },
    {
      key: "fun" as const,
      title: "Fun / Leisure",
      helper: "Recreation and enjoyment.",
      icon: <PartyPopper size={16} color={AURORA.amber} />,
      tags: [
        "gaming",
        "movie-series",
        "music",
        "travel",
        "shopping",
        "restaurant",
        "hobby",
        "outdoor",
      ],
    },
    {
      key: "productivity" as const,
      title: "Productivity",
      helper: "Workload and life tasks.",
      icon: <Briefcase size={16} color={AURORA.red} />,
      tags: ["work", "chores", "finance", "commute", "screen-overload"],
    },
  ].filter((x) => isCategoryEnabled(x.key));

  useEffect(() => {
    const loadDaily = async () => {
      if (!user?.id) return;
      const now = new Date();
      const calKey = calendarDayKeyLocal(now);
      const wakeTrim = (usualWakeTime || "").trim();
      const bathTrim = (usualBathTime || "").trim();
      const sleepKey = wakeTrim
        ? cycleDayKeyForUsualTime(now, usualWakeTime)
        : calKey;
      const bathKey = bathTrim
        ? cycleDayKeyForUsualTime(now, usualBathTime)
        : calKey;
      try {
        const calCtx = await getDailyContext(user.id, calKey);
        const sleepCtx =
          sleepKey !== calKey
            ? await getDailyContext(user.id, sleepKey)
            : calCtx;
        const bathCtx =
          bathKey === calKey
            ? calCtx
            : bathKey === sleepKey
              ? sleepCtx
              : await getDailyContext(user.id, bathKey);
        setDailyContextState(calCtx);
        setMealStatusById(calCtx?.mealStatusById ?? {});
        if (sleepCtx?.sleepQuality) {
          setSleepQuality(sleepCtx.sleepQuality);
          setSleepCapturedToday(true);
        } else {
          setSleepQuality(null);
          setSleepCapturedToday(false);
        }
        setBathTakenToday(!!bathCtx?.bathTaken);
        setBathTakenNow(!!bathCtx?.bathTaken);
      } catch {
        setDailyContextState(null);
        setSleepCapturedToday(false);
        setSleepQuality(null);
        setBathTakenToday(false);
        setBathTakenNow(false);
        setMealStatusById({});
      }
    };
    loadDaily();
  }, [user?.id, usualWakeTime, usualBathTime]);

  useEffect(() => {
    if (!initialMood) return;
    const emotion = MANUAL_EMOTIONS.find((item) => item.name === initialMood);
    if (!emotion) return;
    setMoodInputMode("manual");
    setDetectionMethod("manual");
    setSelectedEmotions([
      { emotion: emotion.name, confidence: 0.6, color: emotion.color },
    ]);
  }, [initialMood]);

  const closeModalThenRoute = (
    path: "/(student)/messages" | "/(student)/resources",
  ) => {
    onComplete?.();
    setTimeout(() => router.push(path), 0);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((x) => x !== tag) : [...prev, tag],
    );
  };

  const describeEnergy = (value: number) => {
    if (value <= 1) return "very low";
    if (value === 2) return "low";
    if (value === 3) return "moderate";
    if (value === 4) return "high";
    return "very high";
  };

  /** Intensity words placed before “stress” in summaries (avoids “high stress” / “… stressed stress”). */
  const describeStress = (value: number) => {
    if (value <= 1) return "very low";
    if (value === 2) return "low";
    if (value === 3) return "moderate";
    if (value === 4) return "elevated";
    return "overwhelming";
  };

  const tagPhrase = (tags: string[], maxVisible = 5) => {
    const clean = tags.filter(Boolean);
    if (clean.length === 0) return "";
    if (clean.length === 1) return clean[0];
    if (clean.length === 2) return `${clean[0]} and ${clean[1]}`;

    const visible = clean.slice(0, maxVisible);
    const extraCount = clean.length - visible.length;
    const base =
      visible.length === 3
        ? `${visible[0]}, ${visible[1]}, and ${visible[2]}`
        : `${visible.slice(0, -1).join(", ")}, and ${visible[visible.length - 1]}`;

    return extraCount > 0 ? `${base} (+${extraCount} more)` : base;
  };

  const buildJournalDraft = () => {
    const selectedLabel =
      MANUAL_EMOTIONS.find(
        (emotion) => emotion.name === selectedEmotion?.emotion,
      )?.label?.toLowerCase() ?? "neutral";
    const stressTone =
      stressLevel >= 4
        ? "I felt emotionally heavy because of it."
        : stressLevel <= 2
          ? "It felt manageable overall."
          : "It sat in the middle of my day.";
    const selectedCategoryKeys = categoryConfigs
      .filter((category) =>
        category.tags.some((tag) => selectedTags.includes(tag)),
      )
      .map((category) => category.key);
    const categoryLines: string[] = [];

    if (selectedCategoryKeys.includes("school")) {
      const schoolTags = selectedTags.filter((tag) =>
        SCHOOL_TAGS.includes(tag),
      );
      categoryLines.push(
        schoolTags.length > 0
          ? `In school, I dealt with ${tagPhrase(schoolTags)}, and it affected my focus.`
          : "School tasks affected my mood today.",
      );
    }

    if (selectedCategoryKeys.includes("fun")) {
      const funTags = (
        categoryConfigs.find((category) => category.key === "fun")?.tags ?? []
      ).filter((tag) => selectedTags.includes(tag));
      categoryLines.push(
        funTags.length > 0
          ? `For fun, I spent time on ${tagPhrase(funTags)}, and it changed how my day felt.`
          : "Leisure time played a part in my mood today.",
      );
    }

    if (selectedCategoryKeys.includes("social")) {
      const socialTags = (
        categoryConfigs.find((category) => category.key === "social")?.tags ??
        []
      ).filter((tag) => selectedTags.includes(tag));
      categoryLines.push(
        socialTags.length > 0
          ? `Socially, ${tagPhrase(socialTags)} stood out and shaped my emotions.`
          : "Social interactions influenced how I felt.",
      );
    }

    if (selectedCategoryKeys.includes("health")) {
      const healthTags = (
        categoryConfigs.find((category) => category.key === "health")?.tags ??
        []
      ).filter((tag) => selectedTags.includes(tag));
      categoryLines.push(
        healthTags.length > 0
          ? `Health-wise, I noticed ${tagPhrase(healthTags)}, and it really shaped how I felt inside. ${stressTone}`
          : `My physical condition influenced my emotions today. ${stressTone}`,
      );
    }

    if (selectedCategoryKeys.includes("productivity")) {
      const productivityTags = (
        categoryConfigs.find((category) => category.key === "productivity")
          ?.tags ?? []
      ).filter((tag) => selectedTags.includes(tag));
      categoryLines.push(
        productivityTags.length > 0
          ? `For productivity, juggling ${tagPhrase(productivityTags)} made me feel ${stressLevel >= 4 ? "pressured and stretched" : "busy but trying to stay steady"}.`
          : `My tasks and responsibilities affected my mood, and I could feel that pressure build at times.`,
      );
    }

    const summaryLine = `Today I felt ${selectedLabel}, with ${describeEnergy(energyLevel)} energy and ${describeStress(stressLevel)} stress.`;
    const body = categoryLines.join(" ");
    return body ? `${summaryLine} ${body}` : summaryLine;
  };

  useEffect(() => {
    if (selectedTags.length === 0) {
      if (!journalEdited) {
        setJournalText("");
        setShowJournalEditor(false);
      }
      return;
    }
    if (!journalEdited) {
      setJournalText(buildJournalDraft());
    }
  }, [
    selectedTags,
    energyLevel,
    stressLevel,
    selectedEmotion?.emotion,
    journalEdited,
  ]);

  const handleNext = () => {
    if (currentStep === 1 && selectedEmotions.length === 0) {
      Alert.alert(
        "Please select a mood",
        "Pick your current emotion before continuing.",
      );
      return;
    }
    if (
      currentStep === 2 &&
      !sleepLockedBeforeWake &&
      !sleepCapturedToday &&
      !sleepQuality
    ) {
      Alert.alert(
        "Sleep quality is required",
        "Please set sleep quality once for today.",
      );
      return;
    }
    if (currentStep === 2 && mealSchedule.length > 0) {
      const missingMealAnswers = mealSchedule.some(
        (meal) =>
          isMealAvailableNow(meal.time) &&
          typeof mealStatusById[meal.id] !== "boolean",
      );
      if (missingMealAnswers) {
        Alert.alert(
          "Meal check-in needed",
          "Please answer each available meal item (Taken or Not yet).",
        );
        return;
      }
    }
    if (currentStep < totalSteps) setCurrentStep((c) => c + 1);
  };

  const pickJournalImageFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow photo library access to attach a journal selfie.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.75,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setJournalImageUri(result.assets[0].uri);
    }
  };

  const captureJournalImage = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Please allow camera access to take a journal selfie.",
      );
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      quality: 0.75,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!result.canceled && result.assets[0]?.uri) {
      setJournalImageUri(result.assets[0].uri);
    }
  };

  const pickJournalImage = () => {
    Alert.alert("Journal selfie", "Add your photo using camera or gallery.", [
      { text: "Take photo", onPress: () => void captureJournalImage() },
      {
        text: "Choose from library",
        onPress: () => void pickJournalImageFromLibrary(),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const applyAnalyzedMood = (emotion: DetectedEmotion) => {
    setSelectedEmotions([emotion]);
    setDetectionMethod("selfie_ai");
    if (currentStep < totalSteps) {
      setCurrentStep((c) => c + 1);
    }
  };

  const handleSubmit = async () => {
    if (!user) {
      Alert.alert("Error", "Please log in to save mood");
      return;
    }
    const now = new Date();
    const dk = calendarDayKeyLocal(now);
    const wakeTrim = (usualWakeTime || "").trim();
    const bathTrim = (usualBathTime || "").trim();
    const sleepKey = wakeTrim
      ? cycleDayKeyForUsualTime(now, usualWakeTime)
      : dk;
    const bathKey = bathTrim ? cycleDayKeyForUsualTime(now, usualBathTime) : dk;
    const sleepLocked =
      wakeTrim.length > 0 && isBeforeUsualHHmmToday(now, usualWakeTime);
    const bathLocked =
      bathTrim.length > 0 && isBeforeUsualHHmmToday(now, usualBathTime);
    if (
      selectedEmotions.length === 0 ||
      (!sleepCapturedToday && !sleepQuality && !sleepLocked)
    ) {
      Alert.alert(
        "Missing data",
        "Mood is required. Sleep quality is needed only once per day.",
      );
      return;
    }
    try {
      setIsSubmitting(true);
      let uploadedJournalImageUrl = "";
      if (journalImageUri && user?.id) {
        setUploadingJournalImage(true);
        const storagePath = `journal_selfies/${user.id}/${Date.now()}.jpg`;
        uploadedJournalImageUrl = await uploadImage(
          storagePath,
          journalImageUri,
          "image/jpeg",
        );
        setUploadingJournalImage(false);
      }
      const normalizedMealResponses = mealSchedule.map((meal) => ({
        meal_id: meal.id,
        meal_label: meal.label,
        meal_time: meal.time,
        taken: !!mealStatusById[meal.id],
      }));
      const calCtx = await getDailyContext(user.id, dk);
      const sleepDoc =
        sleepKey === dk ? calCtx : await getDailyContext(user.id, sleepKey);
      const bathDoc =
        bathKey === dk
          ? calCtx
          : bathKey === sleepKey
            ? sleepDoc
            : await getDailyContext(user.id, bathKey);
      const sleepForMoodLog = sleepLocked
        ? (sleepDoc?.sleepQuality ?? sleepQuality ?? "fair")
        : sleepQuality || "fair";
      const bathForMoodLog = bathLocked
        ? (bathDoc?.bathTaken ?? false)
        : bathTakenToday || bathTakenNow;

      await moodService.createMoodLog({
        emotions: selectedEmotions.map((e) => ({
          ...e,
          confidence: intensityTen / 10,
        })),
        log_date: new Date(),
        energy_level: energyLevel * 2,
        stress_level: stressLevel * 2,
        duration_in_minutes: durationMinutes,
        sleep_quality: sleepForMoodLog,
        dayKey: dk,
        event_categories: categoryConfigs
          .filter((c) => c.tags.some((t) => selectedTags.includes(t)))
          .map((c) => c.key),
        event_tags: selectedTags,
        notes: journalText.trim(),
        journal_source: journalEdited ? "manual" : "auto",
        detection_method: detectionMethod,
        bath_taken: bathForMoodLog,
        meal_responses: normalizedMealResponses,
        journal_image_url: uploadedJournalImageUrl,
      });

      const mealMergedCal = {
        ...(calCtx?.mealStatusById || {}),
        ...mealStatusById,
      };

      const buildDoc = (
        key: string,
        existing: DailyContextDoc | null,
      ): Omit<DailyContextDoc, "createdAt"> => ({
        exams: existing?.exams || 0,
        quizzes: existing?.quizzes || 0,
        deadlines: existing?.deadlines || 0,
        assignments: existing?.assignments || 0,
        notes: existing?.notes || "",
        sleepQuality:
          key === sleepKey
            ? sleepLocked
              ? existing?.sleepQuality
              : existing?.sleepQuality || sleepQuality || undefined
            : existing?.sleepQuality,
        bathTaken:
          key === bathKey
            ? bathLocked
              ? (existing?.bathTaken ?? false)
              : existing?.bathTaken || bathTakenNow
            : (existing?.bathTaken ?? false),
        mealStatusById:
          key === dk ? mealMergedCal : existing?.mealStatusById || {},
        zenSessionsCompleted: existing?.zenSessionsCompleted || 0,
        zenMinutesCompleted: existing?.zenMinutesCompleted || 0,
      });

      const keys = Array.from(new Set([dk, sleepKey, bathKey]));
      for (const key of keys) {
        const existing =
          key === dk ? calCtx : key === sleepKey ? sleepDoc : bathDoc;
        await setDailyContext(user.id, key, buildDoc(key, existing));
      }

      try {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 14);
        const recent = await moodService.getMoodLogs(
          user.id,
          weekAgo.toISOString(),
          new Date().toISOString(),
        );
        const prev = getMostRecentLogNotOnSameCalendarDay(
          recent as { log_date: Date; energy_level?: number }[],
          new Date(),
        );
        logSuddenMoodDropIfNeeded(prev?.energy_level, energyLevel * 2);
      } catch {
        // no-op
      }

      try {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);
        const todayLogs = await moodService.getMoodLogs(
          user.id,
          startOfDay.toISOString(),
          endOfDay.toISOString(),
        );
        setSubmittedTodayCheckIns(
          Math.max(1, Array.isArray(todayLogs) ? todayLogs.length : 1),
        );
      } catch {
        setSubmittedTodayCheckIns(1);
      }

      setIsSubmitting(false);
      setIsSubmitted(true);
      setShowQuickResetPrompt(true);
    } catch (error: any) {
      setIsSubmitting(false);
      setUploadingJournalImage(false);
      Alert.alert("Error", error?.message || "Failed to check in");
    }
  };

  const showSelfiePrivacyGuide = () => {
    setActiveGuide({
      title: "Selfie check-in privacy",
      body: "Aurora analyzes visible facial expression to suggest a mood. You can retake, switch to manual check-in, or choose whether to use the analyzed mood before continuing.",
    });
  };

  const showManualMoodGuide = () => {
    setActiveGuide({
      title: "Manual check-in guide",
      body: "Manual check-in lets you choose your mood directly.\n\n1) Pick the emotion that best matches how you feel now.\n2) Adjust intensity to reflect how strongly you feel it.\n3) Select how long you have been feeling this mood.\n\nUse this mode when you prefer full control over mood selection.",
    });
  };

  const showScaleGuide = (type: "energy" | "stress") => {
    if (type === "energy") {
      setActiveGuide({
        title: "Energy scale (1-5)",
        body: "Rate how energized you feel right now.\n\n1 - Exhausted\n2 - Low energy\n3 - Okay / average\n4 - Active\n5 - Very energized",
      });
      return;
    }
    setActiveGuide({
      title: "Stress scale (1-5)",
      body: "Rate how pressured or tense you feel right now.\n\n1 - Very calm\n2 - A little tense\n3 - Moderately tense\n4 - Very tense\n5 - Overwhelmed",
    });
  };

  const showIntensityGuide = () => {
    setActiveGuide({
      title: "Intensity scale (1-10)",
      body: "This measures how strongly you feel the selected emotion right now.\n\n1 means very mild or barely noticeable.\n10 means extremely strong and hard to ignore.\n\nUse the number that best matches your current emotional intensity, not whether the emotion is good or bad.",
    });
  };

  const getDurationCategoryLabel = (minutes: number) => {
    if (minutes < 15) return "Just a moment";
    if (minutes <= 60) return "About an hour";
    if (minutes <= 180) return "A few hours";
    if (minutes <= 480) return "Most of the day";
    return "All day / Ongoing";
  };

  const updateDurationInput = (raw: string) => {
    const digitsOnly = raw.replace(/[^0-9]/g, "").slice(0, 4);
    setDurationInput(digitsOnly);
    if (!digitsOnly) return;
    const parsed = Number(digitsOnly);
    if (Number.isNaN(parsed)) return;
    setDurationMinutes(Math.min(1440, Math.max(1, parsed)));
  };

  const finalizeDurationInput = () => {
    if (!durationInput) {
      setDurationInput(String(durationMinutes));
      return;
    }
    const parsed = Number(durationInput);
    const normalized = Number.isNaN(parsed)
      ? durationMinutes
      : Math.min(1440, Math.max(1, parsed));
    setDurationMinutes(normalized);
    setDurationInput(String(normalized));
  };

  const showDurationGuide = () => {
    setActiveGuide({
      title: "Duration categories guide",
      body: "These labels help classify your entered minutes:\n\n- Less than 15 mins: Just a moment\n- 15 to 60 mins: About an hour\n- 61 to 180 mins: A few hours\n- 181 to 480 mins: Most of the day\n- 481+ mins: All day / Ongoing",
    });
  };

  const scrollDurationInputIntoView = () => {
    setTimeout(() => {
      const y = Math.max(0, durationInputYRef.current - 36);
      scrollRef.current?.scrollTo({ y, animated: true });
    }, 240);
  };

  const showSleepGuide = () => {
    setActiveGuide({
      title: "Sleep quality (once per day)",
      body: "Log this once per day based on your main/night sleep, not short naps.\n\nUse:\n- Poor: you woke up tired or unrested\n- Fair: okay sleep, but not fully refreshed\n- Good: restful sleep and you feel recovered",
    });
  };

  const showMealGuide = () => {
    setActiveGuide({
      title: "Meal check-in guide",
      body: "Track if each scheduled meal is already taken.\n\nThis schedule comes from your Profile settings.\nTo set or edit meal times, go to:\nProfile -> Meal Schedule\n\n- Taken: you already had this meal.\n- Not yet: you have not taken it yet.\n\nFuture meal slots are locked until their scheduled time.",
    });
  };

  const showBathGuide = () => {
    setActiveGuide({
      title: "Bath check-in guide",
      body: "Mark this once daily to log your hygiene routine for today.\n\n- Yes: you already took a bath today.\n- Not yet: you have not taken a bath yet.",
    });
  };

  const showAcademicSignalGuide = () => {
    setActiveGuide({
      title: "School pressure today",
      body: "This is an estimate based on the school-related tags you selected in this check-in. It helps summarize how much school may have influenced your mood today.",
    });
  };

  const showContextCategoriesGuide = () => {
    setActiveGuide({
      title: "Mood context categories",
      body: "These categories organize what influenced your mood in this check-in.\n\n- School: classes, quizzes, deadlines, study pressure\n- Health: body condition, pain, appetite, exercise\n- Social: friends, family, partner, conflict, feeling alone\n- Fun / Leisure: hobbies, games, media, outdoor activities\n- Productivity: work, chores, commute, responsibilities\n\nThe tags you select are saved for analytics and help identify patterns in your mood trends.",
    });
  };

  const schoolTagCount = selectedTags.filter((tag) =>
    SCHOOL_TAGS.includes(tag),
  ).length;
  const quickResetExercise = getBreathingExerciseForMood({
    mood: selectedEmotion?.emotion,
    stressLevel,
    energyLevel,
  });
  const quickResetPromptLine = `That was a lot. Take 60 seconds to find your center with ${quickResetExercise.name}?`;
  const workloadBand =
    schoolTagCount === 0
      ? "Light day"
      : schoolTagCount <= 2
        ? "Moderate day"
        : "Heavy day";
  const schoolTagCaption = `Based on ${schoolTagCount} school tag${schoolTagCount === 1 ? "" : "s"} selected`;

  if (isSubmitted) {
    const moodScale = Math.min(5, Math.max(1, energyLevel));
    const stressBand = classifyStress(
      calculateStressLevel(moodScale, schoolTagCount),
    );
    const dailyBody = getDailyFeedback(stressBand, moodScale);
    const isPositive = moodScale >= 4 && stressBand !== "High";
    const totalCheckIns = submittedTodayCheckIns;
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: AURORA.bg,
          padding: 16,
          paddingTop: 14,
          paddingBottom: 20,
        }}
      >
        <Modal
          visible={showQuickResetSession}
          animationType="slide"
          presentationStyle="fullScreen"
        >
          <BreathingContainer
            title="Quick Reset"
            subtitle="60-second guided breathing"
            exercise={quickResetExercise}
            durationSeconds={60}
            moodColor={AURORA.blue}
            soundscapeAsset={quickResetExercise.soundscapeAsset}
            soundscapeUrl={quickResetExercise.soundscapeUrl}
            soundscapeName={quickResetExercise.soundscapeName}
            soundscapeVolume={quickResetExercise.soundscapeVolume}
            useZenTheme
            showExitButton
            onClose={() => setShowQuickResetSession(false)}
            onComplete={async () => {
              setShowQuickResetSession(false);
              setShowQuickResetPrompt(false);
              const zenDayKey = calendarDayKeyLocal(new Date());
              if (user?.id) {
                try {
                  const existing = await getDailyContext(user.id, zenDayKey);
                  await setDailyContext(user.id, zenDayKey, {
                    exams: existing?.exams || 0,
                    quizzes: existing?.quizzes || 0,
                    deadlines: existing?.deadlines || 0,
                    assignments: existing?.assignments || 0,
                    notes: existing?.notes || "",
                    sleepQuality: existing?.sleepQuality,
                    bathTaken: existing?.bathTaken || false,
                    mealStatusById: existing?.mealStatusById || {},
                    zenSessionsCompleted:
                      (existing?.zenSessionsCompleted || 0) + 1,
                    zenMinutesCompleted:
                      (existing?.zenMinutesCompleted || 0) + 1,
                  });
                } catch {
                  // no-op
                }
              }
              Alert.alert("Well done", "You completed your quick reset.");
            }}
          />
        </Modal>

        <View
          style={{
            backgroundColor: AURORA.card,
            borderWidth: 1,
            borderColor: AURORA.border,
            borderRadius: 24,
            padding: 14,
          }}
        >
        <Animatable.View
          animation="fadeInUp"
          duration={520}
          useNativeDriver
          style={{
            backgroundColor: "transparent",
            borderWidth: 0,
            borderRadius: 0,
            paddingVertical: 8,
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <Animatable.View
            animation="pulse"
            duration={2200}
            iterationCount="infinite"
            easing="ease-in-out"
            useNativeDriver
            style={{
              padding: 10,
              borderRadius: 999,
              marginBottom: 10,
              backgroundColor: isPositive
                ? "rgba(254, 189, 3, 0.2)"
                : "rgba(120, 74, 255, 0.2)",
            }}
          >
            <Image
              source={require("../assets/logos/logomark light gradient.png")}
              style={{ width: 30, height: 30 }}
              resizeMode="contain"
            />
          </Animatable.View>
          <Text
            style={{
              color: AURORA.textPrimary,
              fontSize: 40,
              fontWeight: "900",
              textAlign: "center",
              marginBottom: 2,
            }}
          >
            Check-in saved
          </Text>
          <Text
            style={{
              color: AURORA.textSec,
              textAlign: "center",
              fontSize: 13,
              lineHeight: 18,
            }}
          >
            Great step toward wellness.
          </Text>
        </Animatable.View>

        <Animatable.View
          animation="fadeInUp"
          delay={90}
          duration={520}
          useNativeDriver
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.14)",
            backgroundColor: "rgba(255,255,255,0.04)",
            padding: 12,
            marginBottom: 10,
          }}
        >
          <TouchableOpacity
            onPress={() => closeModalThenRoute("/(student)/messages")}
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                flex: 1,
                minWidth: 0,
                paddingRight: 8,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "rgba(142,60,247,0.20)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MessageSquare size={14} color={AURORA.textPrimary} />
              </View>
              <View>
                <Text
                  style={{
                    color: AURORA.textPrimary,
                    fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  Talk to a Counselor
                </Text>
                <Text style={{ color: AURORA.textMuted, fontSize: 12 }}>
                  Immediate professional support
                </Text>
              </View>
            </View>
            <ArrowRight size={16} color={AURORA.textMuted} />
          </TouchableOpacity>
        </Animatable.View>

        <Animatable.View
          animation="fadeInUp"
          delay={120}
          duration={520}
          useNativeDriver
          style={{
            borderRadius: 14,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.14)",
            backgroundColor: "rgba(255,255,255,0.04)",
            padding: 12,
            marginBottom: 12,
          }}
        >
          <TouchableOpacity
            onPress={
              showQuickResetPrompt
                ? () => setShowQuickResetSession(true)
                : () => closeModalThenRoute("/(student)/resources")
            }
            activeOpacity={0.85}
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
                flex: 1,
                minWidth: 0,
                paddingRight: 8,
              }}
            >
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 17,
                  backgroundColor: "rgba(45,107,255,0.24)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Sparkles size={14} color={AURORA.textPrimary} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{
                    color: AURORA.textPrimary,
                    fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  {showQuickResetPrompt ? "Quick Reset • 60s" : quickResetExercise.name}
                </Text>
                <Text style={{ color: AURORA.textMuted, fontSize: 12, lineHeight: 16 }}>
                  {showQuickResetPrompt
                    ? `Based on your mood check-in, ${quickResetExercise.name} can help lower stress fast.`
                    : "Peaceful guided session"}
                </Text>
              </View>
            </View>
            <View
              style={{
                width: 20,
                alignItems: "flex-end",
                justifyContent: "center",
              }}
            >
              <ArrowRight size={16} color={AURORA.textMuted} />
            </View>
          </TouchableOpacity>
        </Animatable.View>
        {showQuickResetPrompt ? (
          <>
            <Text
              style={{
                color: AURORA.textSec,
                fontSize: 11,
                lineHeight: 16,
                marginBottom: 6,
              }}
            >
              Taking 60 seconds now can make your next hour feel calmer and more
              focused.
            </Text>
            <TouchableOpacity
              onPress={() => setShowQuickResetPrompt(false)}
              style={{ alignSelf: "flex-end", marginBottom: 12, padding: 4 }}
            >
              <Text
                style={{
                  color: AURORA.textMuted,
                  fontSize: 11,
                  fontWeight: "600",
                }}
              >
                Skip quick reset
              </Text>
            </TouchableOpacity>
          </>
        ) : null}

        <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
          <Animatable.View
            animation="fadeInUp"
            delay={180}
            duration={450}
            useNativeDriver
            style={{ flex: 1 }}
          >
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                borderWidth: 1,
                borderColor: AURORA.border,
                borderRadius: 14,
                padding: 10,
              }}
            >
              <Text
                style={{
                  color: AURORA.textMuted,
                  fontSize: 10,
                  marginBottom: 3,
                }}
              >
                STREAK
              </Text>
              <Text
                style={{
                  color: AURORA.textPrimary,
                  fontWeight: "800",
                  fontSize: 21,
                }}
              >
                {Math.max(1, schoolTagCount + 1)}
              </Text>
              <Text style={{ color: AURORA.textMuted, fontSize: 11 }}>days</Text>
            </View>
          </Animatable.View>
          <Animatable.View
            animation="fadeInUp"
            delay={240}
            duration={450}
            useNativeDriver
            style={{ flex: 1 }}
          >
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.03)",
                borderWidth: 1,
                borderColor: AURORA.border,
                borderRadius: 14,
                padding: 10,
              }}
            >
              <Text
                style={{
                  color: AURORA.textMuted,
                  fontSize: 10,
                  marginBottom: 3,
                }}
              >
                CHECK-INS
              </Text>
              <Text
                style={{
                  color: AURORA.textPrimary,
                  fontWeight: "800",
                  fontSize: 21,
                }}
              >
                {totalCheckIns}
              </Text>
              <Text style={{ color: AURORA.textMuted, fontSize: 11 }}>today</Text>
            </View>
          </Animatable.View>
        </View>

        <Animatable.View
          animation="fadeInUp"
          delay={260}
          duration={500}
          useNativeDriver
          style={{
            borderRadius: 999,
            shadowColor: "#6A35FF",
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.45,
            shadowRadius: 18,
            elevation: 10,
          }}
        >
          <Animatable.View
            animation="pulse"
            duration={2400}
            delay={900}
            iterationCount="infinite"
            easing="ease-in-out"
            useNativeDriver
          >
            <TouchableOpacity
              onPress={() => onComplete?.()}
              activeOpacity={0.9}
              style={{ borderRadius: 999, overflow: "hidden" }}
            >
              <LinearGradient
                colors={["#2D6BFF", "#5A46FF", "#8E3CF7"]}
                start={{ x: 0, y: 0.5 }}
                end={{ x: 1, y: 0.5 }}
                style={{
                  width: "100%",
                  paddingVertical: 13,
                  borderRadius: 999,
                  alignItems: "center",
                  borderWidth: 1,
                  borderColor: "rgba(255,255,255,0.22)",
                }}
              >
                <Text
                  style={{
                    color: AURORA.textPrimary,
                    fontWeight: "700",
                    fontSize: 16,
                  }}
                >
                  Done
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animatable.View>
        </Animatable.View>
      </View>
      </View>
    );
  }

  const isMoodStep = currentStep === 1;
  const isVitalityStep = currentStep === 2;
  const isContextStep = currentStep === 3;
  const scheduleNow = new Date();
  const wakeTrimLive = (usualWakeTime || "").trim();
  const bathTrimLive = (usualBathTime || "").trim();
  const sleepLockedBeforeWake =
    wakeTrimLive.length > 0 &&
    isBeforeUsualHHmmToday(scheduleNow, usualWakeTime);
  const bathLockedBeforeBath =
    bathTrimLive.length > 0 &&
    isBeforeUsualHHmmToday(scheduleNow, usualBathTime);
  const usualWakeTimeLabel = wakeTrimLive ? formatMealTime(usualWakeTime) : "";
  const usualBathTimeLabel = bathTrimLive ? formatMealTime(usualBathTime) : "";
  const canContinueCurrentStep =
    (isMoodStep && selectedEmotions.length > 0) ||
    (isVitalityStep &&
      (sleepCapturedToday || !!sleepQuality || sleepLockedBeforeWake)) ||
    isContextStep;
  const isPrimaryActionDisabled = isSubmitting || !canContinueCurrentStep;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: AURORA.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 92 : 0}
    >
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, backgroundColor: AURORA.bg }}
        contentContainerStyle={{ paddingBottom: 240 }}
        scrollEnabled={isScrollEnabled}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={{ padding: 20, paddingTop: 24 }}>
          <Animatable.View
            animation="fadeInDown"
            duration={400}
            useNativeDriver
            style={{ marginBottom: 22 }}
          >
            <Text
              style={{
                fontSize: 24,
                fontWeight: "800",
                color: AURORA.textPrimary,
                textAlign: "center",
                marginBottom: 8,
              }}
            >
              {isMoodStep && `Hey ${firstName}!`}
              {isVitalityStep && "Energy, stress, sleep, meals, and bath"}
              {isContextStep && "What affected your mood?"}
            </Text>
            <Text
              style={{
                color: AURORA.textSec,
                textAlign: "center",
                fontSize: 15,
              }}
            >
              {isMoodStep &&
                "Choose how you feel right now, then set intensity."}
              {isVitalityStep &&
                "Sleep is once daily. Meals and bath are also tracked."}
              {isContextStep &&
                "Select tags that influenced how you felt today."}
            </Text>
            {isContextStep ? (
              <View
                style={{
                  marginTop: 8,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <Text style={{ color: AURORA.textMuted, fontSize: 12 }}>
                  What are these categories?
                </Text>
                <TouchableOpacity
                  onPress={showContextCategoriesGuide}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <CircleHelp size={14} color={AURORA.textMuted} />
                </TouchableOpacity>
              </View>
            ) : null}
          </Animatable.View>

          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              marginBottom: 20,
            }}
          >
            {["Mood", "Vitals", "Context"].map((label, idx) => {
              const step = idx + 1;
              const isCurrent = currentStep === step;
              const isCompleted = currentStep > step;
              return (
                <View key={label} style={{ alignItems: "center", flex: 1 }}>
                  <View
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: isCurrent
                        ? AURORA.blue
                        : isCompleted
                          ? "rgba(45,107,255,0.2)"
                          : AURORA.cardAlt,
                      borderWidth: isCurrent ? 1.5 : 1,
                      borderColor: isCurrent
                        ? "rgba(140,177,255,0.7)"
                        : "transparent",
                      alignItems: "center",
                      justifyContent: "center",
                      marginBottom: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: isCurrent
                          ? AURORA.textPrimary
                          : isCompleted
                            ? "#BCD0FF"
                            : AURORA.textMuted,
                        fontWeight: "700",
                      }}
                    >
                      {step}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 12,
                      color: isCurrent
                        ? AURORA.blue
                        : isCompleted
                          ? "#AFC4F5"
                          : "#8DA0CC",
                    }}
                  >
                    {`${step} ${label}`}
                  </Text>
                </View>
              );
            })}
          </View>
          <View
            style={{
              height: 4,
              borderRadius: 999,
              backgroundColor: AURORA.cardAlt,
              overflow: "hidden",
              marginBottom: 18,
            }}
          >
            <View
              style={{
                width: `${(currentStep / totalSteps) * 100}%`,
                height: "100%",
                backgroundColor: AURORA.blue,
              }}
            />
          </View>

          {isMoodStep && (
            <View style={{ gap: 16 }}>
              <View
                style={{
                  backgroundColor: AURORA.card,
                  borderWidth: 1,
                  borderColor: AURORA.border,
                  borderRadius: 18,
                  padding: 6,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    backgroundColor: AURORA.cardAlt,
                    borderRadius: 12,
                    padding: 4,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setMoodInputMode("manual")}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        moodInputMode === "manual"
                          ? AURORA.blue
                          : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          moodInputMode === "manual"
                            ? AURORA.textPrimary
                            : AURORA.textSec,
                        fontWeight: "700",
                      }}
                    >
                      Manual check-in
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setMoodInputMode("selfie")}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 10,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        moodInputMode === "selfie"
                          ? AURORA.blue
                          : "transparent",
                    }}
                  >
                    <Text
                      style={{
                        color:
                          moodInputMode === "selfie"
                            ? AURORA.textPrimary
                            : AURORA.textSec,
                        fontWeight: "700",
                      }}
                    >
                      Selfie check-in
                    </Text>
                  </TouchableOpacity>
                </View>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    marginTop: 10,
                    paddingHorizontal: 6,
                    paddingBottom: 6,
                  }}
                >
                  <Sparkles size={14} color={AURORA.amber} />
                  <Text
                    style={{ color: AURORA.textMuted, fontSize: 12, flex: 1 }}
                  >
                    {moodInputMode === "selfie"
                      ? "Selfie check-in suggests mood from facial expression. You can use AI mood or retake before continuing."
                      : "Manual mode gives full control when selecting your mood and intensity."}
                  </Text>
                  {moodInputMode === "selfie" ? (
                    <TouchableOpacity
                      onPress={showSelfiePrivacyGuide}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                      <CircleHelp size={14} color={AURORA.textMuted} />
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={showManualMoodGuide}
                      hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
                    >
                      <CircleHelp size={14} color={AURORA.textMuted} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
              {moodInputMode === "selfie" ? (
                <EmotionDetection
                  title="Selfie check-in (Expression-Based)"
                  helperText="Aurora estimates your mood from visible facial expression only. You can choose the analyzed mood and continue, or retake another selfie."
                  onEmotionDetected={(emotions) => {
                    if (emotions.length > 0) {
                      setSelectedEmotions([emotions[0]]);
                    }
                  }}
                  onUseAnalyzedMood={applyAnalyzedMood}
                  saveActionLabel="Use this mood"
                  showSaveSuccessAlert={false}
                />
              ) : null}
              {moodInputMode === "manual" ? (
                <>
                  <View
                    style={{
                      backgroundColor: AURORA.card,
                      borderWidth: 1,
                      borderColor: AURORA.border,
                      borderRadius: 18,
                      padding: 16,
                    }}
                  >
                    <Text
                      style={{
                        color: AURORA.textPrimary,
                        textAlign: "center",
                        fontWeight: "700",
                        marginBottom: 14,
                      }}
                    >
                      Select emotion
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        gap: 8,
                      }}
                    >
                      {MANUAL_EMOTIONS.map((emotion) => {
                        const selected = selectedEmotions.some(
                          (x) => x.emotion === emotion.name,
                        );
                        return (
                          <TouchableOpacity
                            key={emotion.name}
                            onPress={() => {
                              triggerHaptic("light");
                              setSelectedEmotions([
                                {
                                  emotion: emotion.name,
                                  confidence: intensityTen / 10,
                                  color: emotion.color,
                                },
                              ]);
                              setDetectionMethod("manual");
                            }}
                            activeOpacity={0.85}
                            style={{
                              width: 72,
                              minHeight: 88,
                              borderRadius: 16,
                              borderWidth: selected ? 1.5 : 1,
                              borderColor: selected
                                ? emotion.color
                                : AURORA.border,
                              backgroundColor: selected
                                ? `${emotion.color}24`
                                : AURORA.cardAlt,
                              alignItems: "center",
                              justifyContent: "center",
                              transform: [{ scale: selected ? 1.02 : 1 }],
                            }}
                          >
                            {renderMoodVisual(emotion, 36)}
                            <Text
                              style={{
                                marginTop: 5,
                                fontSize: 12,
                                color: selected
                                  ? emotion.color
                                  : AURORA.textSec,
                                fontWeight: "700",
                              }}
                            >
                              {emotion.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                  {selectedEmotions.length > 0 && (
                    <View
                      style={{
                        backgroundColor: AURORA.card,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                        borderRadius: 18,
                        padding: 16,
                      }}
                    >
                      <View
                        style={{
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 20,
                          paddingVertical: 18,
                          marginBottom: 12,
                          backgroundColor: `${selectedManualEmotion.color}16`,
                          borderWidth: 1.5,
                          borderColor: `${selectedManualEmotion.color}55`,
                        }}
                      >
                        <Animated.View
                          style={[
                            { alignItems: "center", justifyContent: "center" },
                            floatingMoodStyle,
                          ]}
                        >
                          {renderMoodVisual(selectedManualEmotion, 132)}
                        </Animated.View>
                        <Animated.View
                          style={[
                            {
                              width: 84,
                              height: 14,
                              borderRadius: 999,
                              backgroundColor: "#000",
                              marginTop: 4,
                              marginBottom: 6,
                            },
                            floatingShadowStyle,
                          ]}
                        />
                        <Text
                          style={{
                            color: selectedManualEmotion.color,
                            fontWeight: "800",
                            fontSize: 26,
                          }}
                        >
                          {selectedManualEmotion.label}
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 10,
                        }}
                      >
                        <Zap size={16} color={selectedManualEmotion.color} />
                        <Text
                          style={{
                            color: AURORA.textPrimary,
                            fontWeight: "700",
                          }}
                        >
                          Intensity (1-10)
                        </Text>
                        <TouchableOpacity
                          onPress={showIntensityGuide}
                          style={{ padding: 4, marginLeft: "auto" }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <CircleHelp size={16} color={AURORA.textMuted} />
                        </TouchableOpacity>
                      </View>
                      <SimpleSlider
                        value={(intensityTen - 1) / 9}
                        onValueChange={(val: number) =>
                          setIntensityTen(
                            Math.max(1, Math.min(10, Math.round(1 + val * 9))),
                          )
                        }
                        minimumTrackTintColor={selectedManualEmotion.color}
                        thumbTintColor={selectedManualEmotion.color}
                        onSlidingStart={() => setIsScrollEnabled(false)}
                        onSlidingComplete={() => setIsScrollEnabled(true)}
                      />
                      <Text
                        style={{
                          color: selectedManualEmotion.color,
                          marginTop: 8,
                          marginBottom: 14,
                          fontWeight: "700",
                        }}
                      >
                        {intensityTen} / 10
                      </Text>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 8,
                        }}
                      >
                        <Heart size={16} color={selectedManualEmotion.color} />
                        <Text
                          style={{
                            color: AURORA.textPrimary,
                            fontWeight: "700",
                          }}
                        >
                          Duration of feeling
                        </Text>
                        <TouchableOpacity
                          onPress={showDurationGuide}
                          style={{ padding: 4, marginLeft: "auto" }}
                          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        >
                          <CircleHelp size={16} color={AURORA.textMuted} />
                        </TouchableOpacity>
                      </View>
                      <Text
                        style={{
                          color: AURORA.textMuted,
                          fontSize: 12,
                          marginBottom: 10,
                        }}
                      >
                        Enter minutes, then we classify it for analytics.
                      </Text>
                      <View
                        onLayout={(event) => {
                          durationInputYRef.current =
                            event.nativeEvent.layout.y;
                        }}
                        style={{
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: AURORA.border,
                          backgroundColor: AURORA.cardAlt,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 10,
                        }}
                      >
                        <TextInput
                          value={durationInput}
                          onChangeText={updateDurationInput}
                          onBlur={finalizeDurationInput}
                          onFocus={scrollDurationInputIntoView}
                          keyboardType="number-pad"
                          placeholder="Enter minutes"
                          placeholderTextColor={AURORA.textMuted}
                          style={{
                            flex: 1,
                            color: AURORA.textPrimary,
                            fontWeight: "700",
                            fontSize: 14,
                            paddingVertical: 0,
                          }}
                        />
                        <Text
                          style={{ color: AURORA.textMuted, fontWeight: "700" }}
                        >
                          min
                        </Text>
                      </View>
                      <View
                        style={{
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: `${selectedManualEmotion.color}66`,
                          backgroundColor: `${selectedManualEmotion.color}1A`,
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                        }}
                      >
                        <Text
                          style={{
                            color: selectedManualEmotion.color,
                            fontWeight: "700",
                            fontSize: 12,
                          }}
                        >
                          Category: {getDurationCategoryLabel(durationMinutes)}
                        </Text>
                      </View>
                    </View>
                  )}
                </>
              ) : null}
            </View>
          )}

          {isVitalityStep && (
            <View
              style={{
                backgroundColor: AURORA.card,
                borderWidth: 1,
                borderColor: AURORA.border,
                borderRadius: 18,
                padding: 16,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Zap size={16} color={AURORA.amber} />
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Text
                    style={{ color: AURORA.textPrimary, fontWeight: "700" }}
                  >
                    Energy
                  </Text>
                  <Text style={{ color: AURORA.textMuted, fontWeight: "500" }}>
                    (1-5)
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => showScaleGuide("energy")}
                  style={{ padding: 4, marginLeft: "auto" }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <CircleHelp size={16} color={AURORA.textMuted} />
                </TouchableOpacity>
              </View>
              <SimpleSlider
                value={(energyLevel - 1) / 4}
                onValueChange={(val: number) =>
                  setEnergyLevel(
                    Math.max(1, Math.min(5, Math.round(1 + val * 4))),
                  )
                }
                minimumTrackTintColor={AURORA.amber}
                thumbTintColor={AURORA.amber}
                onSlidingStart={() => setIsScrollEnabled(false)}
                onSlidingComplete={() => setIsScrollEnabled(true)}
              />
              <Text
                style={{
                  color: AURORA.amber,
                  marginBottom: 16,
                  fontWeight: "700",
                }}
              >
                {energyLevel}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <Heart size={16} color={AURORA.red} />
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
                >
                  <Text
                    style={{ color: AURORA.textPrimary, fontWeight: "700" }}
                  >
                    Stress
                  </Text>
                  <Text style={{ color: AURORA.textMuted, fontWeight: "500" }}>
                    (1-5)
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => showScaleGuide("stress")}
                  style={{ padding: 4, marginLeft: "auto" }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <CircleHelp size={16} color={AURORA.textMuted} />
                </TouchableOpacity>
              </View>
              <SimpleSlider
                value={(stressLevel - 1) / 4}
                onValueChange={(val: number) =>
                  setStressLevel(
                    Math.max(1, Math.min(5, Math.round(1 + val * 4))),
                  )
                }
                minimumTrackTintColor={AURORA.red}
                thumbTintColor={AURORA.red}
                onSlidingStart={() => setIsScrollEnabled(false)}
                onSlidingComplete={() => setIsScrollEnabled(true)}
              />
              <Text
                style={{
                  color: AURORA.red,
                  marginBottom: 16,
                  fontWeight: "700",
                }}
              >
                {stressLevel}
              </Text>

              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <MoonStar size={16} color={AURORA.blue} />
                <Text style={{ color: AURORA.textPrimary, fontWeight: "700" }}>
                  Sleep quality{" "}
                  {sleepLockedBeforeWake
                    ? "(opens after wake time)"
                    : sleepCapturedToday
                      ? "(already set today)"
                      : "(set once daily)"}
                </Text>
                <TouchableOpacity
                  onPress={showSleepGuide}
                  style={{ padding: 4, marginLeft: "auto" }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <CircleHelp size={16} color={AURORA.textMuted} />
                </TouchableOpacity>
              </View>
              <Text
                style={{
                  color: AURORA.textMuted,
                  fontSize: 12,
                  marginBottom: 10,
                }}
              >
                {sleepLockedBeforeWake
                  ? `Before ${usualWakeTimeLabel}, sleep still counts toward yesterday’s cycle. You can log sleep quality after ${usualWakeTimeLabel}.`
                  : sleepCapturedToday
                    ? "You already logged sleep quality today. You can continue without changing it."
                    : "Set this once daily based on your main/night sleep (not naps)."}
              </Text>
              <View
                style={{
                  position: "relative",
                  borderRadius: 12,
                  overflow: "hidden",
                }}
              >
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["poor", "fair", "good"] as SleepQuality[]).map(
                    (quality) => {
                      const selected = sleepQuality === quality;
                      return (
                        <TouchableOpacity
                          key={quality}
                          onPress={() => setSleepQuality(quality)}
                          style={{
                            flex: 1,
                            borderRadius: 12,
                            paddingVertical: 12,
                            borderWidth: 1,
                            borderColor: selected ? AURORA.blue : AURORA.border,
                            backgroundColor: selected
                              ? "rgba(45, 107, 255, 0.18)"
                              : AURORA.cardAlt,
                            opacity:
                              sleepCapturedToday || sleepLockedBeforeWake
                                ? 0.75
                                : 1,
                            alignItems: "center",
                            flexDirection: "row",
                            justifyContent: "center",
                            gap: 6,
                          }}
                          disabled={sleepCapturedToday || sleepLockedBeforeWake}
                        >
                          <MoonStar
                            size={14}
                            color={selected ? AURORA.blue : AURORA.textSec}
                          />
                          <Text
                            style={{
                              color: selected ? AURORA.blue : AURORA.textSec,
                              fontWeight: "700",
                            }}
                          >
                            {quality.charAt(0).toUpperCase() + quality.slice(1)}
                          </Text>
                        </TouchableOpacity>
                      );
                    },
                  )}
                </View>
                {sleepLockedBeforeWake && (
                  <View
                    pointerEvents="none"
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: 0,
                      bottom: 0,
                      backgroundColor: "rgba(8, 12, 42, 0.84)",
                      borderWidth: 1,
                      borderColor: "rgba(148, 163, 184, 0.35)",
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      paddingHorizontal: 10,
                    }}
                  >
                    <Text
                      style={{
                        color: AURORA.textPrimary,
                        fontSize: 12,
                        fontWeight: "800",
                        textAlign: "center",
                      }}
                    >
                      Locked for now
                    </Text>
                    <Text
                      style={{
                        color: "#B8C5E7",
                        fontSize: 11,
                        marginTop: 3,
                        textAlign: "center",
                      }}
                    >
                      Opens at {usualWakeTimeLabel}
                    </Text>
                  </View>
                )}
              </View>
              <View
                style={{
                  marginTop: 16,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: AURORA.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{ color: AURORA.textPrimary, fontWeight: "700" }}
                  >
                    Meal check-in
                  </Text>
                  <TouchableOpacity
                    onPress={showMealGuide}
                    style={{ padding: 4, marginLeft: "auto" }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <CircleHelp size={16} color={AURORA.textMuted} />
                  </TouchableOpacity>
                </View>
                <Text
                  style={{
                    color: AURORA.textMuted,
                    fontSize: 12,
                    marginBottom: 10,
                  }}
                >
                  Based on your schedule from Profile settings.
                </Text>
                {mealSchedule.length === 0 ? (
                  <Text style={{ color: AURORA.textMuted, fontSize: 12 }}>
                    No meal schedule set yet. Add it in your profile settings.
                  </Text>
                ) : (
                  mealSchedule.map((meal) => {
                    const status = mealStatusById[meal.id];
                    const mealAvailable = isMealAvailableNow(meal.time);
                    const mealTimeLabel = formatMealTime(meal.time);
                    return (
                      <View key={meal.id} style={{ marginBottom: 10 }}>
                        <Text
                          style={{
                            color: AURORA.textPrimary,
                            fontSize: 12,
                            fontWeight: "700",
                            marginBottom: 6,
                          }}
                        >
                          {meal.label} ({mealTimeLabel})
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 8,
                            position: "relative",
                            borderRadius: 10,
                            overflow: "hidden",
                          }}
                        >
                          <TouchableOpacity
                            onPress={() =>
                              setMealStatusById((prev) => ({
                                ...prev,
                                [meal.id]: true,
                              }))
                            }
                            disabled={!mealAvailable}
                            style={{
                              flex: 1,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor:
                                status === true ? AURORA.green : AURORA.border,
                              backgroundColor:
                                status === true
                                  ? "rgba(34,197,94,0.18)"
                                  : AURORA.cardAlt,
                              paddingVertical: 10,
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                color:
                                  status === true
                                    ? AURORA.green
                                    : AURORA.textSec,
                                fontWeight: "700",
                                fontSize: 12,
                              }}
                            >
                              Taken
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              setMealStatusById((prev) => ({
                                ...prev,
                                [meal.id]: false,
                              }))
                            }
                            disabled={!mealAvailable}
                            style={{
                              flex: 1,
                              borderRadius: 10,
                              borderWidth: 1,
                              borderColor:
                                status === false ? AURORA.amber : AURORA.border,
                              backgroundColor:
                                status === false
                                  ? "rgba(245,158,11,0.18)"
                                  : AURORA.cardAlt,
                              paddingVertical: 10,
                              alignItems: "center",
                            }}
                          >
                            <Text
                              style={{
                                color:
                                  status === false
                                    ? AURORA.amber
                                    : AURORA.textSec,
                                fontWeight: "700",
                                fontSize: 12,
                              }}
                            >
                              Not yet
                            </Text>
                          </TouchableOpacity>
                          {!mealAvailable && (
                            <View
                              pointerEvents="none"
                              style={{
                                position: "absolute",
                                left: 0,
                                right: 0,
                                top: 0,
                                bottom: 0,
                                backgroundColor: "rgba(8, 12, 42, 0.84)",
                                borderWidth: 1,
                                borderColor: "rgba(148, 163, 184, 0.35)",
                                borderRadius: 10,
                                alignItems: "center",
                                justifyContent: "center",
                                paddingHorizontal: 10,
                              }}
                            >
                              <Text
                                style={{
                                  color: AURORA.textPrimary,
                                  fontSize: 12,
                                  fontWeight: "800",
                                  textAlign: "center",
                                }}
                              >
                                Locked for now
                              </Text>
                              <Text
                                style={{
                                  color: "#B8C5E7",
                                  fontSize: 11,
                                  marginTop: 3,
                                  textAlign: "center",
                                }}
                              >
                                Opens at {mealTimeLabel}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
              <View
                style={{
                  marginTop: 8,
                  paddingTop: 12,
                  borderTopWidth: 1,
                  borderTopColor: AURORA.border,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <Text
                    style={{ color: AURORA.textPrimary, fontWeight: "700" }}
                  >
                    Bath today{" "}
                    {bathLockedBeforeBath
                      ? "(opens after bath time)"
                      : bathTakenToday
                        ? "(already set today)"
                        : "(once daily)"}
                  </Text>
                  <TouchableOpacity
                    onPress={showBathGuide}
                    style={{ padding: 4, marginLeft: "auto" }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <CircleHelp size={16} color={AURORA.textMuted} />
                  </TouchableOpacity>
                </View>
                {bathTrimLive.length > 0 && (
                  <Text
                    style={{
                      color: AURORA.textMuted,
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    {bathLockedBeforeBath
                      ? `Before ${usualBathTimeLabel}, bath check-in stays on the previous cycle.`
                      : "Log once per cycle based on your usual bath time in Profile."}
                  </Text>
                )}
                <View
                  style={{
                    position: "relative",
                    borderRadius: 10,
                    overflow: "hidden",
                  }}
                >
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      onPress={() => setBathTakenNow(true)}
                      disabled={bathTakenToday || bathLockedBeforeBath}
                      style={{
                        flex: 1,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor:
                          bathTakenToday || bathTakenNow
                            ? AURORA.blue
                            : AURORA.border,
                        backgroundColor:
                          bathTakenToday || bathTakenNow
                            ? "rgba(45,107,255,0.18)"
                            : AURORA.cardAlt,
                        paddingVertical: 10,
                        alignItems: "center",
                        opacity:
                          bathTakenToday || bathLockedBeforeBath ? 0.75 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            bathTakenToday || bathTakenNow
                              ? AURORA.blue
                              : AURORA.textSec,
                          fontWeight: "700",
                          fontSize: 12,
                        }}
                      >
                        Yes
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setBathTakenNow(false)}
                      disabled={bathTakenToday || bathLockedBeforeBath}
                      style={{
                        flex: 1,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor:
                          !bathTakenNow && !bathTakenToday
                            ? AURORA.amber
                            : AURORA.border,
                        backgroundColor:
                          !bathTakenNow && !bathTakenToday
                            ? "rgba(245,158,11,0.18)"
                            : AURORA.cardAlt,
                        paddingVertical: 10,
                        alignItems: "center",
                        opacity:
                          bathTakenToday || bathLockedBeforeBath ? 0.75 : 1,
                      }}
                    >
                      <Text
                        style={{
                          color:
                            !bathTakenNow && !bathTakenToday
                              ? AURORA.amber
                              : AURORA.textSec,
                          fontWeight: "700",
                          fontSize: 12,
                        }}
                      >
                        Not yet
                      </Text>
                    </TouchableOpacity>
                  </View>
                  {bathLockedBeforeBath && (
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 0,
                        bottom: 0,
                        backgroundColor: "rgba(8, 12, 42, 0.84)",
                        borderWidth: 1,
                        borderColor: "rgba(148, 163, 184, 0.35)",
                        borderRadius: 10,
                        alignItems: "center",
                        justifyContent: "center",
                        paddingHorizontal: 10,
                      }}
                    >
                      <Text
                        style={{
                          color: AURORA.textPrimary,
                          fontSize: 12,
                          fontWeight: "800",
                          textAlign: "center",
                        }}
                      >
                        Locked for now
                      </Text>
                      <Text
                        style={{
                          color: "#B8C5E7",
                          fontSize: 11,
                          marginTop: 3,
                          textAlign: "center",
                        }}
                      >
                        Opens at {usualBathTimeLabel}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

          {isContextStep && (
            <View style={{ gap: 12 }}>
              <View
                style={{
                  backgroundColor: AURORA.cardAlt,
                  borderWidth: 1,
                  borderColor: AURORA.border,
                  borderRadius: 12,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        color: "#9CB0DE",
                        fontSize: 12,
                        fontWeight: "600",
                      }}
                    >
                      School pressure today
                    </Text>
                    <TouchableOpacity
                      onPress={showAcademicSignalGuide}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <CircleHelp size={14} color={AURORA.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <Text style={{ color: AURORA.blue, fontWeight: "700" }}>
                    {workloadBand}
                  </Text>
                </View>
                <Text
                  style={{
                    color: AURORA.textMuted,
                    fontSize: 11,
                    marginTop: 5,
                  }}
                >
                  {schoolTagCaption}
                </Text>
              </View>
              {categoryConfigs.length === 0 ? (
                <View
                  style={{
                    backgroundColor: AURORA.card,
                    borderWidth: 1,
                    borderColor: AURORA.border,
                    borderRadius: 14,
                    padding: 14,
                  }}
                >
                  <Text style={{ color: AURORA.textSec }}>
                    No categories enabled. You can turn them on in Settings.
                  </Text>
                </View>
              ) : (
                categoryConfigs.map((category, idx) => (
                  <Animatable.View
                    key={category.key}
                    animation="fadeInUp"
                    duration={320}
                    delay={idx * 80}
                    useNativeDriver
                    style={{
                      backgroundColor: AURORA.card,
                      borderWidth: 1,
                      borderColor: AURORA.border,
                      borderRadius: 14,
                      padding: 12,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        marginBottom: 8,
                      }}
                    >
                      {category.icon}
                      <View>
                        <Text
                          style={{
                            color: AURORA.textPrimary,
                            fontWeight: "700",
                          }}
                        >
                          {category.title}
                        </Text>
                        <Text style={{ color: AURORA.textMuted, fontSize: 12 }}>
                          {category.helper}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}
                    >
                      {(expandedTagGroups[category.key]
                        ? category.tags
                        : category.tags.slice(0, 5)
                      ).map((tag) => {
                        const selected = selectedTags.includes(tag);
                        return (
                          <TouchableOpacity
                            key={tag}
                            onPress={() => toggleTag(tag)}
                            style={{
                              paddingHorizontal: 12,
                              paddingVertical: 7,
                              borderRadius: 999,
                              borderWidth: 1,
                              borderColor: selected
                                ? "rgba(88,138,255,0.6)"
                                : "rgba(120,139,198,0.25)",
                              backgroundColor: selected
                                ? "rgba(45, 107, 255, 0.22)"
                                : "rgba(28,36,86,0.55)",
                            }}
                          >
                            <Text
                              style={{
                                color: selected ? "#C8D8FF" : "#AFC0E8",
                                fontSize: 12,
                                fontWeight: "700",
                              }}
                            >
                              {tag}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                    {category.tags.length > 5 ? (
                      <TouchableOpacity
                        onPress={() =>
                          setExpandedTagGroups((prev) => ({
                            ...prev,
                            [category.key]: !prev[category.key],
                          }))
                        }
                        style={{ alignSelf: "flex-start", marginTop: 10 }}
                      >
                        <Text
                          style={{
                            color: AURORA.blue,
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          {expandedTagGroups[category.key]
                            ? "Show less"
                            : `Show ${category.tags.length - 5} more`}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </Animatable.View>
                ))
              )}
              <View
                style={{
                  backgroundColor: AURORA.card,
                  borderWidth: 1,
                  borderColor: AURORA.border,
                  borderRadius: 14,
                  padding: 12,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: 8,
                  }}
                >
                  <Text
                    style={{ color: AURORA.textPrimary, fontWeight: "700" }}
                  >
                    Journal (optional)
                  </Text>
                  <Text style={{ color: AURORA.textMuted, fontSize: 11 }}>
                    {journalEdited ? "Edited" : "Auto-draft"}
                  </Text>
                </View>
                <Text
                  style={{
                    color: AURORA.textMuted,
                    fontSize: 12,
                    marginBottom: 10,
                  }}
                >
                  {selectedTags.length > 0
                    ? "A short reflection is generated from your selected context tags. You can edit before saving."
                    : "You can write your own reflection even without selecting context tags."}
                </Text>
                {!showJournalEditor ? (
                  <>
                    <View
                      style={{
                        backgroundColor: AURORA.cardAlt,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                        padding: 10,
                        marginBottom: 8,
                      }}
                    >
                      <Text
                        style={{
                          color: AURORA.textSec,
                          fontSize: 13,
                          lineHeight: 18,
                        }}
                      >
                        {journalText ||
                          (selectedTags.length > 0
                            ? buildJournalDraft()
                            : "Add your reflection here. This can help you and your counselor track patterns over time.")}
                      </Text>
                    </View>
                    <TouchableOpacity
                      onPress={() => setShowJournalEditor(true)}
                      style={{
                        alignSelf: "flex-start",
                        paddingHorizontal: 12,
                        paddingVertical: 7,
                        borderRadius: 999,
                        borderWidth: 1,
                        borderColor: AURORA.blue,
                        backgroundColor: "rgba(45, 107, 255, 0.18)",
                      }}
                    >
                      <Text
                        style={{
                          color: AURORA.blue,
                          fontWeight: "700",
                          fontSize: 12,
                        }}
                      >
                        {selectedTags.length > 0 ? "Edit draft" : "Write note"}
                      </Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <TextInput
                      value={journalText}
                      onChangeText={(text) => {
                        setJournalText(text);
                        setJournalEdited(true);
                      }}
                      multiline
                      placeholder="Write your reflection..."
                      placeholderTextColor={AURORA.textMuted}
                      style={{
                        minHeight: 94,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                        backgroundColor: AURORA.cardAlt,
                        color: AURORA.textPrimary,
                        paddingHorizontal: 10,
                        paddingVertical: 10,
                        textAlignVertical: "top",
                        marginBottom: 8,
                      }}
                    />
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        onPress={() => {
                          setJournalEdited(false);
                          if (selectedTags.length > 0) {
                            setJournalText(buildJournalDraft());
                            return;
                          }
                          setJournalText("");
                        }}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: AURORA.border,
                          backgroundColor: AURORA.cardAlt,
                        }}
                      >
                        <Text
                          style={{
                            color: AURORA.textSec,
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          {selectedTags.length > 0
                            ? "Use auto draft"
                            : "Clear note"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setShowJournalEditor(false)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 7,
                          borderRadius: 999,
                          borderWidth: 1,
                          borderColor: AURORA.blue,
                          backgroundColor: "rgba(45, 107, 255, 0.18)",
                        }}
                      >
                        <Text
                          style={{
                            color: AURORA.blue,
                            fontSize: 12,
                            fontWeight: "700",
                          }}
                        >
                          Done editing
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 10,
                    borderTopWidth: 1,
                    borderTopColor: AURORA.border,
                  }}
                >
                  <Text
                    style={{
                      color: AURORA.textPrimary,
                      fontWeight: "700",
                      marginBottom: 8,
                    }}
                  >
                    Journal selfie (optional)
                  </Text>
                  <Text
                    style={{
                      color: AURORA.textMuted,
                      fontSize: 12,
                      marginBottom: 8,
                    }}
                  >
                    This is saved as journal media only, separate from selfie AI
                    mood detection.
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      void pickJournalImage();
                    }}
                    style={{
                      alignSelf: "flex-start",
                      paddingHorizontal: 12,
                      paddingVertical: 7,
                      borderRadius: 999,
                      borderWidth: 1,
                      borderColor: AURORA.blue,
                      backgroundColor: "rgba(45, 107, 255, 0.18)",
                    }}
                  >
                    <Text
                      style={{
                        color: AURORA.blue,
                        fontWeight: "700",
                        fontSize: 12,
                      }}
                    >
                      {journalImageUri ? "Change photo" : "Add photo"}
                    </Text>
                  </TouchableOpacity>
                  {journalImageUri ? (
                    <Image
                      source={{ uri: journalImageUri }}
                      style={{
                        width: "100%",
                        aspectRatio: 3 / 4,
                        marginTop: 10,
                        borderRadius: 10,
                        borderWidth: 1,
                        borderColor: AURORA.border,
                        backgroundColor: AURORA.cardAlt,
                      }}
                      resizeMode="cover"
                    />
                  ) : null}
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={{ paddingHorizontal: 20, paddingBottom: 18 }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            {currentStep > 1 && (
              <TouchableOpacity
                onPress={() => setCurrentStep((c) => c - 1)}
                style={{
                  flex: 1,
                  backgroundColor: AURORA.card,
                  borderWidth: 1,
                  borderColor: AURORA.border,
                  borderRadius: 12,
                  paddingVertical: 14,
                  alignItems: "center",
                  justifyContent: "center",
                  flexDirection: "row",
                  gap: 6,
                }}
              >
                <ArrowLeft size={16} color={AURORA.textSec} />
                <Text style={{ color: AURORA.textSec, fontWeight: "700" }}>
                  Back
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={currentStep === totalSteps ? handleSubmit : handleNext}
              disabled={isPrimaryActionDisabled}
              style={{
                flex: 1,
                backgroundColor: isPrimaryActionDisabled
                  ? AURORA.textMuted
                  : AURORA.blue,
                borderRadius: 12,
                paddingVertical: 14,
                alignItems: "center",
                justifyContent: "center",
                flexDirection: "row",
                gap: 6,
                opacity: isPrimaryActionDisabled ? 0.7 : 1,
              }}
            >
              <Text
                style={{
                  color: AURORA.textPrimary,
                  fontWeight: "700",
                  opacity: isPrimaryActionDisabled ? 0.88 : 1,
                }}
              >
                {isSubmitting || uploadingJournalImage
                  ? "Saving..."
                  : currentStep === totalSteps
                    ? "Save check-in"
                    : "Continue"}
              </Text>
              {!isPrimaryActionDisabled && currentStep < totalSteps && (
                <ArrowRight size={16} color={AURORA.textPrimary} />
              )}
              {!isPrimaryActionDisabled && currentStep === totalSteps && (
                <Check size={16} color={AURORA.textPrimary} />
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
      <InfoGuideModal guide={activeGuide} onClose={() => setActiveGuide(null)} />
    </KeyboardAvoidingView>
  );
}
