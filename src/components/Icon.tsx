import React from 'react';
import { Path, Svg } from 'react-native-svg';

export type IconName =
  | 'home'
  | 'chart'
  | 'plus'
  | 'camera'
  | 'pencil'
  | 'chevron-right'
  | 'food'
  | 'transport'
  | 'shopping'
  | 'bills'
  | 'entertainment'
  | 'health'
  | 'transfer'
  | 'arrow-up'
  | 'arrow-down'
  | 'other'
  | 'warning';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// A small hand-drawn line-icon set (2px stroke, rounded caps/joins) so the app doesn't
// rely on emoji for its core chrome — matches the "ICONOGRAPHY STYLE" from the design
// guideline. Built on react-native-svg, which was already a dependency (used by the pie
// chart), so this adds no new native linking.
const PATHS: Record<IconName, string> = {
  home: 'M4 11.5 12 4l8 7.5 M6 10v9h5v-6h2v6h5v-9',
  chart: 'M5 20V13 M11 20V9 M17 20v-6',
  plus: 'M12 5v14 M5 12h14',
  camera:
    'M4 8.5A1.5 1.5 0 0 1 5.5 7h2l1-2h7l1 2h2A1.5 1.5 0 0 1 20 8.5v9A1.5 1.5 0 0 1 18.5 19h-13A1.5 1.5 0 0 1 4 17.5v-9Z M12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z',
  pencil:
    'M15.5 4.5 19.5 8.5 8 20H4v-4L15.5 4.5Z',
  'chevron-right': 'M9 5l7 7-7 7',
  food: 'M6 3v7a2 2 0 0 0 4 0V3 M8 10v11 M17 3c-1.5 0-3 1.5-3 4s1.5 4 3 4v10',
  transport:
    'M4 16V11a1 1 0 0 1 .5-.87l2.6-1.5A2 2 0 0 1 8.1 8.4h7.8a2 2 0 0 1 1 .23l2.6 1.5A1 1 0 0 1 20 11v5H4Z M7 16v3 M17 16v3 M4 13h16',
  shopping: 'M6 8h12l-1 12H7L6 8Z M9 8V6a3 3 0 0 1 6 0v2',
  bills:
    'M6 3h12v18l-2-1.3L14 21l-2-1.3L10 21l-2-1.3L6 21V3Z M9 8h6 M9 12h6',
  entertainment: 'M9 8l7 4-7 4V8Z M4 4h16v16H4Z',
  health:
    'M12 20.5 4.5 13a4.5 4.5 0 0 1 6.4-6.3l1.1 1 1.1-1a4.5 4.5 0 0 1 6.4 6.3L12 20.5Z',
  transfer: 'M4 8h13l-3-3 M20 16H7l3 3',
  'arrow-up': 'M12 19V5 M6 11l6-6 6 6',
  'arrow-down': 'M12 5v14 M6 13l6 6 6-6',
  other: 'M6 12h.01 M12 12h.01 M18 12h.01',
  warning: 'M12 4 21 20 3 20 12 4Z M12 10v4 M12 16.7v.01',
};

export function Icon({ name, size = 24, color = '#000000', strokeWidth = 2 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d={PATHS[name]}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
