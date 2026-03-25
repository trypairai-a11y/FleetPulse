"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import { cn } from "@/lib/cn";
import { Plus, X, GripVertical } from "lucide-react";
import api from "@/lib/api";

const STAGES = [
  "AGENCY_REFERRAL", "CV_DOCS", "INTERVIEW", "VISA_PROCESSING",
  "FLIGHT_ARRANGEMENT", "ARRIVAL", "MEDICAL_EXAM", "BANK_CARD",
  "CIVIL_ID", "RESIDENCY", "LICENSE_TEST", "PLATFORM_TRAINING",
  "ROAD_SAFETY_TRAINING", "FOOD_HANDLING_TRAINING", "COMPANY_SOP_TRAINING", "COMPLETED",
];

const STAGE_LABELS: Record<string, string> = {
  AGENCY_REFERRAL: "Agency Referral",
  CV_DOCS: "CV / Docs",
  INTERVIEW: "Interview",
  VISA_PROCESSING: "Visa Processing",
  FLIGHT_ARRANGEMENT: "Flight",
  ARRIVAL: "Arrival",
  MEDICAL_EXAM: "Medical Exam",
  BANK_CARD: "Bank Card",
  CIVIL_ID: "Civil ID",
  RESIDENCY: "Residency",
  LICENSE_TEST: "License Test",
  PLATFORM_TRAINING: "Platform Training",
  ROAD_SAFETY_TRAINING: "Road Safety",
  FOOD_HANDLING_TRAINING: "Food Handling",
  COMPANY_SOP_TRAINING: "Company SOPs",
  COMPLETED: "Completed",
};

interface Candidate {
  id: string;
  candidateName: string;
  phone: string;
  stage: string;
  agency?: string;
  expectedDate?: string;
  assignedCompany?: { name: string };
}

export default function RecruitmentPage() {
  const { data, refetch } = useApiGet<any>("/api/recruitment?limit=200");
  const [showAdd, setShowAdd] = useState(false);
  const [newCandidate, setNewCandidate] = useState({ candidateName: "", phone: "", stage: "AGENCY_REFERRAL" });
  const [dragItem, setDragItem] = useState<string | null>(null);

  const candidates: Candidate[] = data?.data || [];

  const getByStage = (stage: string) => candidates.filter((c) => c.stage === stage);

  const handleDrop = async (stage: string) => {
    if (!dragItem) return;
    try {
      await api.put(`/api/recruitment/${dragItem}`, { stage });
      refetch();
    } catch (err) {
      console.error(err);
    }
    setDragItem(null);
  };

  const handleAdd = async () => {
    try {
      await api.post("/api/recruitment", newCandidate);
      setShowAdd(false);
      setNewCandidate({ candidateName: "", phone: "", stage: "AGENCY_REFERRAL" });
      refetch();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Recruitment Pipeline</h1>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors"
        >
          <Plus size={16} /> Add Candidate
        </button>
      </div>

      {/* Kanban Board */}
      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3" style={{ minWidth: `${STAGES.length * 220}px` }}>
          {STAGES.map((stage) => {
            const stageCards = getByStage(stage);
            return (
              <div
                key={stage}
                className="w-52 flex-shrink-0"
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(stage)}
              >
                <div className="bg-gray-50 rounded-2xl p-3 min-h-[200px]">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <span className="text-xs font-medium text-foreground">{STAGE_LABELS[stage]}</span>
                    <span className="text-[11px] text-secondary bg-white px-1.5 py-0.5 rounded-md">
                      {stageCards.length}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {stageCards.map((candidate) => (
                      <div
                        key={candidate.id}
                        draggable
                        onDragStart={() => setDragItem(candidate.id)}
                        className={cn(
                          "bg-white rounded-xl p-3 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-200",
                          dragItem === candidate.id && "opacity-50"
                        )}
                      >
                        <div className="flex items-start gap-2">
                          <GripVertical size={14} className="text-gray-300 mt-0.5 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{candidate.candidateName}</p>
                            {candidate.expectedDate && (
                              <p className="text-[11px] text-secondary mt-1">
                                {new Date(candidate.expectedDate).toLocaleDateString()}
                              </p>
                            )}
                            {candidate.assignedCompany && (
                              <p className="text-[11px] text-primary mt-0.5">{candidate.assignedCompany.name}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Add Candidate</h2>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-gray-50 rounded-lg">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Name</label>
                <input value={newCandidate.candidateName}
                  onChange={(e) => setNewCandidate({ ...newCandidate, candidateName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="Candidate name" />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary mb-1.5">Phone</label>
                <input value={newCandidate.phone}
                  onChange={(e) => setNewCandidate({ ...newCandidate, phone: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="+965 XXXX XXXX" />
              </div>
              <button onClick={handleAdd}
                className="w-full py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors">
                Add Candidate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
