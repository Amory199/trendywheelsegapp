# Mobile App – Agent Guide

## Stack

Expo SDK 51 + React Native + Expo Router v3 + Reanimated 2 + TanStack Query + Zustand

## Structure

```
app/                  # Expo Router file-based routing
├── (auth)/           # auth stack (phone, otp, onboarding)
├── (tabs)/           # bottom tab navigator
│   ├── rent/         # vehicle rental screens
│   ├── sell/         # vehicle sales screens
│   ├── repair/       # repair request screens
│   └── profile/      # CRM / profile screens
├── _layout.tsx       # root layout
└── +not-found.tsx
src/
├── components/       # shared components
├── hooks/            # custom hooks
├── stores/           # Zustand stores
├── services/         # API calls via @trendywheels/api-client
├── utils/            # helpers
└── constants/        # app constants
```

## Commands

```bash
pnpm dev           # expo start
pnpm build:ios     # eas build --platform ios
pnpm build:android # eas build --platform android
pnpm lint          # ESLint
pnpm typecheck     # tsc --noEmit
pnpm test          # Jest + RNTL
```

## Rules

- Use Expo Router for all navigation. No manual stack navigators.
- Use `@trendywheels/ui-mobile` components – do not create duplicate components.
- Animations: Reanimated 2 worklets only. No JS-thread animations on scroll/gesture paths.
- Lists: FlashList, never FlatList.
- Images: expo-image with caching. Compress before upload (max 2MB).
- State: TanStack Query for server state, Zustand for local UI state.
- Auth tokens: expo-secure-store. Never AsyncStorage for secrets.
- Touch targets: minimum 44px height.
- All strings through @trendywheels/i18n.
- Test with Jest + React Native Testing Library.
