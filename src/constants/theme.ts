type StatusBarVariant = 'light-content' | 'dark-content';

export interface Theme {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  textDisabled: string;
  primary: string;
  primaryText: string;
  accent: string;
  // Color-blocked "hero" surfaces (Home's balance card, Profile's header, Onboarding). A
  // deep blue in BOTH modes with white text on top (≈9:1 contrast) — unlike `primary`, which is
  // a light tint in dark mode (right for buttons/chips, wrong as a surface behind white text).
  hero: string;
  heroText: string;
  heroTextMuted: string;
  heroOverlay: string; // soft translucent fill for chips/pills sitting on the hero surface
  danger: string;
  success: string;
  warning: string;
  info: string;
  // For screens whose top section is the dark `hero` blue (Profile) rather than the plain
  // `background` — the correct StatusBar style is the opposite of the app default.
  statusBarDefault: StatusBarVariant;
  statusBarOnPrimary: StatusBarVariant;
}

// Design tokens per Dompetcho_Icon_Exact_Match design guideline.
export const lightTheme: Theme = {
  background: '#F7F8FA',
  surface: '#FFFFFF',
  border: '#E5E7EB',
  text: '#111827',
  textMuted: '#6B7280',
  textDisabled: '#9CA3AF',
  primary: '#1E3A8A',
  primaryText: '#FFFFFF',
  accent: '#16A34A', // bold brand green — center "Add" tab button only
  hero: '#1E3A8A',
  heroText: '#FFFFFF',
  heroTextMuted: 'rgba(255,255,255,0.72)',
  heroOverlay: 'rgba(255,255,255,0.12)',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#3B82F6',
  statusBarDefault: 'dark-content',
  statusBarOnPrimary: 'light-content',
};

export const darkTheme: Theme = {
  background: '#0B1220',
  surface: '#111827',
  border: '#1F2937',
  text: '#F9FAFB',
  textMuted: '#9CA3AF',
  textDisabled: '#6B7280',
  primary: '#60A5FA',
  primaryText: '#0B1220', // dark text — primary is a light tint in dark mode, needs a dark foreground for contrast
  accent: '#22C55E',
  hero: '#1E40AF',
  heroText: '#FFFFFF',
  heroTextMuted: 'rgba(255,255,255,0.72)',
  heroOverlay: 'rgba(255,255,255,0.12)',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#3B82F6',
  statusBarDefault: 'light-content',
  statusBarOnPrimary: 'light-content', // hero is dark blue in dark mode too
};
