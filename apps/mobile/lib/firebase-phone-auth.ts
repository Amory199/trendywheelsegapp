import auth, { type FirebaseAuthTypes } from "@react-native-firebase/auth";

/**
 * Single-flight confirmation object passed between the phone and otp screens.
 * Lives in module scope because router params can only carry strings — the
 * confirmation has a closed-over Firebase native handle that we can't
 * serialize and rehydrate cheaply.
 */
let pendingConfirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

/**
 * Phones that should keep using the legacy server OTP path (and trial bypass).
 * Lets staff/admin testers sign in without burning SMS, and keeps the bypass
 * codes working through the same UI.
 */
const TRIAL_PHONES = new Set([
  "+201000000001", // Admin — Mostafa
  "+201000000010", // Sales — Amira
  "+201000000011", // Sales — Youssef
  "+201000000020", // Support — Layla
  "+201112223344", // Customer — Mohamed
]);

export function isTrialPhone(phone: string): boolean {
  return TRIAL_PHONES.has(phone);
}

export async function sendFirebaseOtp(phone: string): Promise<void> {
  pendingConfirmation = await auth().signInWithPhoneNumber(phone);
}

export async function confirmFirebaseOtp(code: string): Promise<string> {
  if (!pendingConfirmation) {
    throw new Error("No pending verification. Restart sign-in.");
  }
  const userCredential = await pendingConfirmation.confirm(code);
  if (!userCredential || !userCredential.user) {
    throw new Error("Verification failed");
  }
  const idToken = await userCredential.user.getIdToken(true);
  pendingConfirmation = null;
  return idToken;
}

export function resetFirebaseConfirmation(): void {
  pendingConfirmation = null;
}
