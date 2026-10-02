import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Circle, G, Svg } from 'react-native-svg';
import { categoryColor } from '../constants/categoryColors';
import { tabularNums, typography } from '../constants/typography';
import { formatRupiah } from '../utils/format';

interface CategorySlice {
  categoryName?: string;
  amount: number;
}

interface CategoryDonutChartProps {
  data: CategorySlice[];
  total: number;
  size?: number;
  strokeWidth?: number;
  trackColor: string;
  centerLabelColor: string;
  centerValueColor: string;
}

/**
 * A ring built from stacked `Circle` strokes (one per category, `strokeDasharray`/
 * `strokeDashoffset` carving out each slice's share of the circumference) rather than
 * `<Path>` arcs — simpler and less error-prone than computing arc path geometry by hand,
 * and it's the standard technique for a segmented ring in SVG.
 */
export function CategoryDonutChart({
  data,
  total,
  size = 160,
  strokeWidth = 20,
  trackColor,
  centerLabelColor,
  centerValueColor,
}: CategoryDonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let cumulative = 0;
  const slices = data
    .filter(slice => slice.amount > 0)
    .map(slice => {
      const fraction = total > 0 ? slice.amount / total : 0;
      const length = fraction * circumference;
      const offset = cumulative;
      cumulative += length;
      return { ...slice, length, offset };
    });

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size}>
        <Circle cx={center} cy={center} r={radius} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        {/* Rotated -90deg so the first slice starts at 12 o'clock instead of 3 o'clock. */}
        <G rotation={-90} origin={`${center}, ${center}`}>
          {slices.map((slice, index) => (
            <Circle
              key={`${slice.categoryName ?? 'other'}-${index}`}
              cx={center}
              cy={center}
              r={radius}
              stroke={categoryColor(slice.categoryName)}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={`${slice.length} ${circumference - slice.length}`}
              strokeDashoffset={-slice.offset}
              strokeLinecap="butt"
            />
          ))}
        </G>
      </Svg>
      <View style={styles.centerLabel} pointerEvents="none">
        <Text style={[typography.caption, { color: centerLabelColor }]}>Total</Text>
        <Text
          style={[typography.h2, tabularNums, styles.centerValue, { color: centerValueColor }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatRupiah(total)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerLabel: {
    position: 'absolute',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  centerValue: {
    fontSize: 15,
    maxWidth: 110,
  },
});
