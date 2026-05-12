// Phase 3 Wave 2 — types for the Driver File bulk endpoint.
// Mirrors GET /api/drivers/:id/file response shape.

export interface DriverFileProfile {
  id: string;
  name: string;
  civilIdMasked: string | null;
  civilIdStatus: string | null;
  photoUrl: string | null;
  status: string;
  platform: string;
  platformDriverId: string | null;
  phone: string;
  vehicleType: string;
}

export interface DriverFileLiveStatus {
  onlineNow: boolean;
  lastSeenAt: string | null;
  activeShift: { id: string; startsAt: string; area: string | null } | null;
}

export interface DriverFileScore {
  compositeScore: number;
  attendanceScore: number;
  deliveryScore: number;
  financialScore: number;
  equipmentScore: number;
  platformScore: number;
  trend: "UP" | "DOWN" | "STABLE";
  date: string;
}

export interface DriverFileScoreExplanation {
  text: string;
  cached: boolean;
}

export interface DriverFileSnapshot {
  snapshotDate: string;
  compositeScore: number;
  attendanceScore?: number;
  deliveryScore?: number;
  financialScore?: number;
  equipmentScore?: number;
  platformScore?: number;
}

export interface DriverFileAttendance {
  last14Days: Array<{ id: string; date: string; status: string; lateMinutes: number | null }>;
  lateCount: number;
  absentCount: number;
}

export interface DriverFileCash {
  outstanding: number;
  records: Array<{
    id: string;
    date: string;
    salesAmount: number;
    collectionAmount: number;
    pendingDues: number;
    status: string;
  }>;
}

export interface DriverFileViolations {
  items: Array<{
    id: string;
    violationType: string;
    violationStatus: string;
    appealStatus: string | null;
    violationTime: string;
    details: string | null;
  }>;
}

export interface DriverFileAgentNotes {
  proposals: Array<{ id: string; toolName: string; reasoning: string; createdAt: string }>;
  observations: Array<{ id: string; key: string; value: unknown; createdAt: string }>;
  audit: Array<{ id: string; toolName: string; reasoning: string; createdAt: string }>;
}

export interface DriverFileAuditEntry {
  id: string;
  toolName: string;
  proposer: string;
  outcome?: string;
  reasoning: string;
  createdAt: string;
}

export interface DriverFileData {
  profile: DriverFileProfile;
  liveStatus: DriverFileLiveStatus;
  score: DriverFileScore | null;
  scoreExplanation: DriverFileScoreExplanation;
  snapshots90d: DriverFileSnapshot[];
  attendance: DriverFileAttendance;
  cash: DriverFileCash;
  violations: DriverFileViolations;
  agentNotes: DriverFileAgentNotes;
  decisionAuditLog: {
    approved: DriverFileAuditEntry[];
    pending: DriverFileAuditEntry[];
  };
}
