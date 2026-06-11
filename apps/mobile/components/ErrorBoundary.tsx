import { colors } from "@trendywheels/ui-tokens";
import { Component, type ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { reportClientError } from "../lib/error-reporter";
import { reportError } from "../lib/sentry";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

// Last line of defense: an uncaught render error used to mean a silent white
// screen. This catches it, reports it (Sentry + /api/client-errors), and
// gives the user a way back instead of a dead app.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    reportError(error);
    reportClientError({
      level: "fatal",
      message: `render crash: ${error.message}`,
      stack: error.stack,
      metadata: { componentStack: info.componentStack ?? undefined },
    });
  }

  render(): ReactNode {
    if (!this.state.error) return this.props.children;
    return (
      <View style={styles.root}>
        <Text style={styles.emoji}>🛠️</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>
          The app hit an unexpected error. Our team has been notified — tap below to keep going.
        </Text>
        <Pressable style={styles.button} onPress={() => this.setState({ error: null })}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.dark.bg,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emoji: { fontSize: 48 },
  title: { color: "#fff", fontSize: 20, fontWeight: "700" },
  body: { color: "#aaa", fontSize: 14, textAlign: "center", lineHeight: 20 },
  button: {
    marginTop: 12,
    backgroundColor: colors.brand.trendyPink,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 999,
  },
  buttonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
