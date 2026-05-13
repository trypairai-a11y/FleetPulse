/**
 * expo-application mock. Used by heartbeatService for version-string reporting.
 * Real surface is much larger; Phase 5 only consumes nativeApplicationVersion.
 */

export const nativeApplicationVersion = "1.0.0-test";
export const nativeBuildVersion = "1";
export const applicationId = "com.ktech.darb.agent";
export const applicationName = "Darb Agent (test)";

export default {
  nativeApplicationVersion,
  nativeBuildVersion,
  applicationId,
  applicationName,
};
