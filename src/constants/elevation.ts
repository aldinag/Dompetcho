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

// A stronger, visible shadow for a card that floats over a hard color transition (e.g. the
// Home balance card straddling the navy header and the plain background) — cardShadow's
// 0.08 opacity is tuned for card-on-white contexts and reads as basically invisible here.
export const floatingCardShadow = Platform.select({
  ios: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 12,
  },
  android: {
    elevation: 10,
  },
  default: {},
});
