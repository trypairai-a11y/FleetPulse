import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import * as Device from "expo-device";
import { register } from "../src/api/client";

export default function EnrollmentScreen() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEnroll() {
    if (!code.trim()) return;
    setLoading(true);
    try {
      await register(code.trim(), {
        model: Device.modelName || "unknown",
        osVersion: `${Platform.OS} ${Platform.Version}`,
        appVersion: "1.0.0",
      });
      router.replace("/(tabs)/dashboard");
    } catch (err: any) {
      Alert.alert("Enrollment Failed", err.message || "Check your code and try again");
    }
    setLoading(false);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Darb Agent</Text>
      <Text style={styles.subtitle}>Enter your enrollment code to get started</Text>

      <TextInput
        style={styles.input}
        placeholder="Enrollment Code"
        placeholderTextColor="#86868b"
        value={code}
        onChangeText={setCode}
        autoCapitalize="characters"
        autoCorrect={false}
      />

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleEnroll}
        disabled={loading}
      >
        <Text style={styles.buttonText}>{loading ? "Enrolling..." : "Enroll Device"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 32, backgroundColor: "#f5f5f7" },
  title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#86868b", textAlign: "center", marginBottom: 32 },
  input: {
    backgroundColor: "#fff", borderRadius: 12, padding: 16, fontSize: 18,
    textAlign: "center", letterSpacing: 4, borderWidth: 1, borderColor: "#e5e7eb",
  },
  button: {
    backgroundColor: "#007AFF", borderRadius: 12, padding: 16,
    marginTop: 24, alignItems: "center",
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontWeight: "600", fontSize: 16 },
});
