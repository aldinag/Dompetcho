import { Platform } from 'react-native';

// Card shadow per the design guideline: "0 1px 2px rgba(16,24,40,0.04)" (light mode).
// Dark mode shadows read poorly against a dark background, so Android falls back to a
// slightly stronger elevation and iOS keeps the same soft shadow — both are subtle either way.
export const cardShadow = Platform.select({
  ios: {
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  android: {
    elevation: 2,
  },
  default: {},
});

// Soft, color-tinted shadow for a colored hero card: a pure black shadow under a blue card
// reads as a dirty smudge, so the shadow takes the card's own hue and spreads wide and faint.
export function tintedShadow(color: string) {
  return Platform.select({
    ios: {
      shadowColor: color,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.3,
      shadowRadius: 16,
    },
    android: {
      elevation: 6,
      shadowColor: color,
    },
    default: {},
  });
}
