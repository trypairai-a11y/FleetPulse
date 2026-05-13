// Phase 4 Wave 4 — confirm modal before unpinning a saved view.
// Thin wrapper around the shared ConfirmModal; phrased per UI-SPEC §3.3.6.
"use client";

import ConfirmModal from "@/components/shared/ConfirmModal";

interface UnpinConfirmProps {
  open: boolean;
  pinTitle: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function UnpinConfirm({
  open,
  pinTitle,
  onConfirm,
  onCancel,
}: UnpinConfirmProps) {
  return (
    <ConfirmModal
      open={open}
      title="Unpin this view?"
      message={`"${pinTitle}" will be removed from your decisions rail. You can pin it again any time from chat.`}
      confirmLabel="Unpin"
      cancelLabel="Cancel"
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
