import React, { useEffect, useState } from 'react';
import { View, Text, Dimensions, StyleSheet, Image, TouchableOpacity } from 'react-native';
import Carousel, { Pagination } from 'react-native-reanimated-carousel';
import { useSharedValue } from 'react-native-reanimated';
import type { Announcement } from '../../services/announcements.service';
import { announcementsService } from '../../services/announcements.service';
import { AURORA } from '../../constants/aurora-colors';
import { Megaphone } from 'lucide-react-native';
import { triggerHaptic } from '../../utils/haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 48;
const CARD_HEIGHT = 140;

interface AnnouncementCarouselProps {
  role: 'counselor' | 'student';
  onAnnouncementPress?: (item: Announcement) => void;
}

function AnnouncementCard({ item, onPress }: { item: Announcement; onPress: () => void }) {
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={() => { triggerHaptic('light'); onPress(); }}
      style={styles.card}
    >
      {item.imageUrl ? (
        <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
      ) : (
        <View style={styles.imagePlaceholder}>
          <Megaphone size={24} color={AURORA.blue} />
        </View>
      )}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {item.content}
        </Text>
        <Text style={styles.meta}>
          {item.createdByName} · {formatDate(item.createdAt)}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function formatDate(date: Date): string {
  const d = new Date(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function AnnouncementCarousel({ role, onAnnouncementPress }: AnnouncementCarouselProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const progress = useSharedValue(0);

  useEffect(() => {
    let cancelled = false;
    announcementsService.listForRole(role).then((list) => {
      if (!cancelled) setAnnouncements(list);
    });
    return () => { cancelled = true; };
  }, [role]);

  if (announcements.length === 0) return null;

  return (
    <View style={styles.wrapper}>
      <Carousel
        loop={announcements.length > 1}
        width={CARD_WIDTH}
        height={CARD_HEIGHT}
        data={announcements}
        autoPlay={announcements.length > 1}
        autoPlayInterval={4000}
        scrollAnimationDuration={400}
        renderItem={({ item }) => (
          <AnnouncementCard
            item={item}
            onPress={() => onAnnouncementPress?.(item)}
          />
        )}
        onProgressChange={progress}
      />
      {announcements.length > 1 && (
        <View style={styles.pagination}>
          <Pagination.Custom
            progress={progress}
            data={announcements}
            horizontal
            dotStyle={styles.dot}
            activeDotStyle={styles.activeDot}
            containerStyle={styles.paginationContainer}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 16,
    marginBottom: 8,
    alignItems: 'center',
  },
  pagination: {
    marginTop: 12,
  },
  paginationContainer: {
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AURORA.textMuted,
  },
  activeDot: {
    width: 24,
    height: 6,
    borderRadius: 3,
    backgroundColor: AURORA.blue,
  },
  card: {
    width: CARD_WIDTH - 16,
    height: CARD_HEIGHT - 8,
    backgroundColor: AURORA.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: AURORA.border,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  image: {
    width: 100,
    height: '100%',
    backgroundColor: AURORA.border,
  },
  imagePlaceholder: {
    width: 100,
    height: '100%',
    backgroundColor: 'rgba(45,107,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    padding: 14,
    justifyContent: 'center',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 4,
  },
  body: {
    color: AURORA.textSec,
    fontSize: 12,
    lineHeight: 17,
    marginBottom: 6,
  },
  meta: {
    color: AURORA.textMuted,
    fontSize: 10,
  },
});
