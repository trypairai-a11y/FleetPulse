import React, { useState, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import EnrollmentScreen from "./src/screens/EnrollmentScreen";
import DashboardScreen from "./src/screens/DashboardScreen";
import SelfieScreen from "./src/screens/SelfieScreen";

type Screen = "loading" | "enrollment" | "dashboard" | "selfie";

export default function App() {
  const [screen, setScreen] = useState<Screen>("loading");
  const [selfieType, setSelfieType] = useState<"clock_in" | "clock_out">("clock_in");

  useEffect(() => {
    SecureStore.getItemAsync("agent_token").then((token) => {
      setScreen(token ? "dashboard" : "enrollment");
    });
  }, []);

  if (screen === "loading") return null;

  if (screen === "enrollment") {
    return <EnrollmentScreen onEnrolled={() => setScreen("dashboard")} />;
  }

  if (screen === "selfie") {
    return (
      <SelfieScreen
        type={selfieType}
        onDone={() => setScreen("dashboard")}
      />
    );
  }

  return (
    <DashboardScreen
      onSelfie={(type) => {
        setSelfieType(type);
        setScreen("selfie");
      }}
    />
  );
}
