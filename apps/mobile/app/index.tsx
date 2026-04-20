import { Redirect } from "expo-router";

export default function Index(): JSX.Element {
  // TODO: Check auth state and redirect accordingly
  return <Redirect href="/(auth)/phone" />;
}
