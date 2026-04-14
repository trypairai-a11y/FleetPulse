import { useEffect } from "react";
import { View, ActivityIndicator } from "react-native";
import { useRouter } from "expo-router";
import * as SecureStore from "expo-secure-store";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const token = await SecureStore.getItemAsync("agent_token");
      if (token) {
        router.replace("/(tabs)/dashboard");
      } else {
        router.replace("/enrollment");
      }
    })();
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#1A1A2E" }}>
      <ActivityIndicator size="large" color="#F97316" />
    </View>
  );
}
