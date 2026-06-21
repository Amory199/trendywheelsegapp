import auth, { type FirebaseAuthTypes } from "@react-native-firebase/auth";

/**
 * Single-flight confirmation object passed between the phone and otp screens.
 * Lives in module scope because router params can only carry strings — the
 * confirmation has a closed-over Firebase native handle that we can't
 * serialize and rehydrate cheaply.
 */
let pendingConfirmation: FirebaseAuthTypes.ConfirmationResult | null = null;

/**
 * Phones that take the legacy server OTP path (fixed-code bypass) instead of a
 * real Firebase SMS. In PRODUCTION this is ONLY the Apple App Review demo
 * account — every real number goes through Firebase. The dev test numbers stay
 * available in development builds so testers can sign in without burning SMS.
 *
 * Why prod is locked down: the API only honours the Apple-review bypass in prod
 * anyway, so listing the dev numbers here just routed them to a path that minted
 * a real-but-undeliverable OTP (looked like "a bypass phone is getting an OTP").
 * And a fixed code must NEVER point at a privileged account — +201111139358 was
 * removed because the owner promoted it to an admin.
 */
const DEV_TRIAL_PHONES = [
  "+201000000001", // Admin — Mostafa
  "+201000000010", // Sales — Amira
  "+201000000011", // Sales — Youssef
  "+201000000020", // Support — Layla
  "+201112223344", // Customer — Mohamed
  "+201234567000", // Apple App Review demo account
];
const TRIAL_PHONES = new Set(__DEV__ ? DEV_TRIAL_PHONES : ["+201234567000"]);

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
