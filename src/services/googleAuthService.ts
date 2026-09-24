import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { GOOGLE_IOS_CLIENT_ID, GOOGLE_WEB_CLIENT_ID } from '../config/env';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    // Required on iOS only — the native SDK has no other way to know which client to
    // authenticate against without a GoogleService-Info.plist. Ignored on Android.
    iosClientId: GOOGLE_IOS_CLIENT_ID,
  });
  configured = true;
}

/** Returns the Google ID token, or null if the user cancelled the picker. */
export async function signInWithGoogleAndGetIdToken(): Promise<string | null> {
  ensureConfigured();
  await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

  try {
    const response = await GoogleSignin.signIn();
    if (response.type !== 'success') return null;
    return response.data.idToken;
  } catch (error) {
    if (isErrorWithCode(error) && error.code === statusCodes.SIGN_IN_CANCELLED) {
      return null;
    }
    throw error;
  }
}

export async function signOutOfGoogle(): Promise<void> {
  ensureConfigured();
  await GoogleSignin.signOut();
}
