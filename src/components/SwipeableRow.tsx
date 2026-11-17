import React, { ReactNode, useRef } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { Icon } from './Icon';
import { radius } from '../constants/radius';
import { typography } from '../constants/typography';
import { useTheme } from '../hooks/useTheme';

const ACTION_WIDTH = 88;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

interface SwipeableRowProps {
  children: ReactNode;
  onDelete: () => void;
  deleteAccessibilityLabel: string;
}

// A from-scratch swipe-to-reveal-delete row built on `Gesture.Pan`/`GestureDetector` — the
// bundled `Swipeable` was dropped from react-native-gesture-handler v3 in favor of a
// react-native-reanimated-only `ReanimatedSwipeable`, and this app has no Reanimated
// dependency to add just for this. Plain `Animated` (no native driver issues here, since the
// only animated property is `transform`) covers it instead.
export function SwipeableRow({ children, onDelete, deleteAccessibilityLabel }: SwipeableRowProps) {
  const theme = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  // The offset the row was resting at (0 = closed, -ACTION_WIDTH = open) when the current
  // gesture began — `onUpdate`'s `translationX` is always relative to that gesture's start,
  // not to the row's live position, so this is what makes a drag starting from "open" work.
  const baseOffset = useRef(0);
  const trackOpacity = translateX.interpolate({
    inputRange: [-ACTION_WIDTH, -8, 0],
    outputRange: [1, 1, 0],
    extrapolate: 'clamp',
  });

  function animateTo(value: number) {
    baseOffset.current = value;
    Animated.spring(translateX, {
      toValue: value,
      useNativeDriver: true,
      bounciness: 0,
    }).start();
  }

  const pan = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onUpdate(event => {
      translateX.setValue(clamp(baseOffset.current + event.translationX, -ACTION_WIDTH, 0));
    })
    .onEnd(event => {
      const projected = baseOffset.current + event.translationX;
      const shouldOpen = projected < -ACTION_WIDTH / 2 || event.velocityX < -800;
      animateTo(shouldOpen ? -ACTION_WIDTH : 0);
    });

  function handleDelete() {
    animateTo(0);
    onDelete();
  }

  return (
    <View style={styles.container}>
      {/* Hidden until the row is actually dragged open: the row above it is opaque now, but this
          also keeps the track's rounded edge from peeking out at rest and makes sure the delete
          button can't be hit while closed. */}
      <Animated.View
        pointerEvents="box-none"
        style={[styles.actionTrack, { backgroundColor: theme.danger, opacity: trackOpacity }]}
      >
        <TouchableOpacity
          style={styles.action}
          onPress={handleDelete}
          accessibilityRole="button"
          accessibilityLabel={deleteAccessibilityLabel}
        >
          <Icon name="trash" size={20} color="#FFFFFF" />
          <Text style={styles.actionText}>Hapus</Text>
        </TouchableOpacity>
      </Animated.View>
      <GestureDetector gesture={pan}>
        {/* Needs its own opaque background — the list rows are transparent, so without this the
            red action track behind it shows through every row at rest. */}
        <Animated.View style={{ backgroundColor: theme.background, transform: [{ translateX }] }}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  actionTrack: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: ACTION_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
  },
  action: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  actionText: {
    ...typography.caption,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
