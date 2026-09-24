type StatusBarVariant = 'light-content' | 'dark-content';

export interface Theme {
  background: string;
  surface: string;
  border: string;
  text: string;
  textMuted: string;
  textDisabled: string;
  primary: string;
  primaryDark: string;
  primaryText: string;
  accent: string;
  danger: string;
  success: string;
  warning: string;
  info: string;
  // For screens whose top section is colored with `primary` (Home, Profile) rather than
  // the plain `background` — the correct StatusBar style is the opposite of the app default.
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
  primaryDark: '#1A3175', // primary − ~15% (toward black) — solid "card on primary" tone, darker than the header
  primaryText: '#FFFFFF',
  accent: '#16A34A', // bold brand green — center "Add" tab button only
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
  primaryDark: '#528CD5', // primary − ~15% (toward black) — solid "card on primary" tone, darker than the header
  primaryText: '#0B1220', // dark text — primary is a light tint in dark mode, needs a dark foreground for contrast
  accent: '#22C55E',
  danger: '#EF4444',
  success: '#22C55E',
  warning: '#F59E0B',
  info: '#3B82F6',
  statusBarDefault: 'light-content',
  statusBarOnPrimary: 'dark-content',
};
