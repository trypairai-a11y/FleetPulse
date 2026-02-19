"use client";

import { useState } from "react";
import { useUIStore } from "@/stores/uiStore";
import { useAuthStore } from "@/stores/authStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import api from "@/lib/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Building2,
  Users,
  Bell,
  Plus,
  Pencil,
  UserMinus,
  Loader2,
  Shield,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CompanyProfile {
  name: string;
  name_ar: string | null;
  slug: string;
  country: string | null;
  timezone: string | null;
  currency: string | null;
  settings: Record<string, unknown> | null;
}

interface UserRecord {
  id: string;
  email: string;
  name: string;
  name_ar: string | null;
  role: string;
  phone: string | null;
  is_active: boolean;
}

interface UsersResponse {
  items: UserRecord[];
  total: number;
  page: number;
  pages: number;
}

interface AlertsConfig {
  absence_days_threshold: number;
  score_drop_threshold: number;
  cash_overdue_days: number;
  device_offline_hours: number;
  low_orders_pct: number;
}

const ROLE_LABELS: Record<string, { en: string; ar: string }> = {
  admin: { en: "Admin", ar: "مدير" },
  supervisor: { en: "Supervisor", ar: "مشرف" },
  maintenance: { en: "Maintenance", ar: "صيانة" },
  viewer: { en: "Viewer", ar: "مشاهد" },
};

const ROLE_COLORS: Record<string, string> = {
  admin: "#0F2B46",
  supervisor: "#2563EB",
  maintenance: "#D97706",
  viewer: "#6B7A8D",
};

// ─── Sub-components ────────────────────────────────────────────────────────────

function RoleBadge({ role, isAr }: { role: string; isAr: boolean }) {
  const label = ROLE_LABELS[role] ?? { en: role, ar: role };
  const color = ROLE_COLORS[role] ?? "#6B7A8D";
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold"
      style={{ backgroundColor: `${color}18`, color }}
    >
      {isAr ? label.ar : label.en}
    </span>
  );
}

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-[#F0F2F5] last:border-0">
      <span className="text-[12px] text-[#6B7A8D]">{label}</span>
      <span className="text-[12px] font-medium text-[#0C1825]">{value}</span>
    </div>
  );
}

// ─── Tab 1: Company Profile ────────────────────────────────────────────────────

function CompanyProfileTab({ isAr, isAdmin }: { isAr: boolean; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", name_ar: "" });

  const { data, isLoading } = useQuery<CompanyProfile>({
    queryKey: ["settings"],
    queryFn: async () => {
      const res = await api.get("/api/settings");
      return res.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: { name: string; name_ar: string }) => {
      const res = await api.put("/api/settings", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success(isAr ? "تم حفظ التغييرات" : "Settings saved");
      setEditing(false);
    },
    onError: () => {
      toast.error(isAr ? "فشل الحفظ" : "Failed to save settings");
    },
  });

  const handleEdit = () => {
    setForm({ name: data?.name ?? "", name_ar: data?.name_ar ?? "" });
    setEditing(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast.error(isAr ? "اسم الشركة مطلوب" : "Company name is required");
      return;
    }
    mutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-[#E6E9EE]">
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F2F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md flex items-center justify-center bg-[#0F2B460D]">
              <Building2 className="w-3.5 h-3.5 text-[#0F2B46]" strokeWidth={2} />
            </div>
            <span className="text-[13px] font-semibold text-[#0C1825]">
              {isAr ? "معلومات الشركة" : "Company Profile"}
            </span>
          </div>
          {isAdmin && !editing && (
            <Button
              variant="outline"
              onClick={handleEdit}
              className="h-7 px-2.5 text-[11px] border-[#E6E9EE] text-[#6B7A8D] gap-1"
            >
              <Pencil className="w-3 h-3" />
              {isAr ? "تعديل" : "Edit"}
            </Button>
          )}
        </div>

        {/* Card body */}
        <div className="px-4 pb-1 pt-1">
          {editing ? (
            <div className="space-y-3 py-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#6B7A8D]">
                  {isAr ? "اسم الشركة (إنجليزي)" : "Company Name (English)"}
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-8 text-[13px]"
                  placeholder="Company Name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#6B7A8D]">
                  {isAr ? "اسم الشركة (عربي)" : "Company Name (Arabic)"}
                </Label>
                <Input
                  value={form.name_ar}
                  onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
                  className="h-8 text-[13px]"
                  placeholder="اسم الشركة"
                  dir="rtl"
                />
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button
                  onClick={handleSave}
                  disabled={mutation.isPending}
                  className="h-8 px-4 text-[12px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
                >
                  {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  {isAr ? "حفظ" : "Save"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setEditing(false)}
                  className="h-8 px-3 text-[12px] border-[#E6E9EE] text-[#6B7A8D]"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </Button>
              </div>
            </div>
          ) : (
            <>
              <FieldRow
                label={isAr ? "اسم الشركة" : "Company Name"}
                value={data?.name || "—"}
              />
              <FieldRow
                label={isAr ? "الاسم بالعربي" : "Arabic Name"}
                value={data?.name_ar || "—"}
              />
              <FieldRow
                label={isAr ? "المعرّف" : "Slug"}
                value={
                  <span className="font-mono text-[11px]">{data?.slug || "—"}</span>
                }
              />
              <FieldRow
                label={isAr ? "البلد" : "Country"}
                value={data?.country || "—"}
              />
              <FieldRow
                label={isAr ? "المنطقة الزمنية" : "Timezone"}
                value={data?.timezone || "—"}
              />
              <FieldRow
                label={isAr ? "العملة" : "Currency"}
                value={data?.currency || "—"}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Tab 2: User Management ────────────────────────────────────────────────────

interface UserFormState {
  email: string;
  password: string;
  name: string;
  name_ar: string;
  role: string;
  phone: string;
}

const EMPTY_USER_FORM: UserFormState = {
  email: "",
  password: "",
  name: "",
  name_ar: "",
  role: "viewer",
  phone: "",
};

function UserManagementTab({ isAr, isAdmin }: { isAr: boolean; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [editUser, setEditUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState<UserFormState>(EMPTY_USER_FORM);
  const [editForm, setEditForm] = useState<Partial<UserFormState>>({});

  const { data, isLoading } = useQuery<UsersResponse>({
    queryKey: ["settings-users"],
    queryFn: async () => {
      const res = await api.get("/api/settings/users");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: UserFormState) => {
      const res = await api.post("/api/settings/users", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-users"] });
      toast.success(isAr ? "تم إضافة المستخدم" : "User created successfully");
      setAddOpen(false);
      setForm(EMPTY_USER_FORM);
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { detail?: string } } })?.response?.data
          ?.detail ?? (isAr ? "فشل إنشاء المستخدم" : "Failed to create user");
      toast.error(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Partial<UserFormState> }) => {
      const res = await api.put(`/api/settings/users/${id}`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-users"] });
      toast.success(isAr ? "تم تحديث المستخدم" : "User updated");
      setEditUser(null);
    },
    onError: () => {
      toast.error(isAr ? "فشل التحديث" : "Failed to update user");
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/settings/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings-users"] });
      toast.success(isAr ? "تم إلغاء تفعيل المستخدم" : "User deactivated");
    },
    onError: () => {
      toast.error(isAr ? "فشل إلغاء التفعيل" : "Failed to deactivate user");
    },
  });

  const handleCreate = () => {
    if (!form.email.trim() || !form.password.trim() || !form.name.trim()) {
      toast.error(isAr ? "يرجى ملء الحقول المطلوبة" : "Please fill required fields");
      return;
    }
    createMutation.mutate(form);
  };

  const handleEditOpen = (u: UserRecord) => {
    setEditUser(u);
    setEditForm({ name: u.name, name_ar: u.name_ar ?? "", role: u.role, phone: u.phone ?? "" });
  };

  const handleUpdate = () => {
    if (!editUser) return;
    updateMutation.mutate({ id: editUser.id, payload: editForm });
  };

  const users = data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-[#E6E9EE]">
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F2F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md flex items-center justify-center bg-[#2563EB0D]">
              <Users className="w-3.5 h-3.5 text-[#2563EB]" strokeWidth={2} />
            </div>
            <span className="text-[13px] font-semibold text-[#0C1825]">
              {isAr ? "إدارة المستخدمين" : "User Management"}
            </span>
            {data && (
              <span className="text-[11px] text-[#6B7A8D] bg-[#F7F8FA] px-2 py-0.5 rounded-full">
                {data.total}
              </span>
            )}
          </div>
          {isAdmin && (
            <Button
              onClick={() => { setForm(EMPTY_USER_FORM); setAddOpen(true); }}
              className="h-7 px-2.5 text-[11px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white gap-1"
            >
              <Plus className="w-3 h-3" />
              {isAr ? "إضافة مستخدم" : "Add User"}
            </Button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
          </div>
        ) : users.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Shield className="w-8 h-8 text-[#E6E9EE] mb-2" />
            <p className="text-[13px] text-[#6B7A8D]">
              {isAr ? "لا يوجد مستخدمون" : "No users found"}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#F0F2F5] bg-[#F7F8FA]">
                  {[
                    isAr ? "المستخدم" : "User",
                    isAr ? "البريد الإلكتروني" : "Email",
                    isAr ? "الدور" : "Role",
                    isAr ? "الحالة" : "Status",
                    ...(isAdmin ? [isAr ? "إجراءات" : "Actions"] : []),
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-[11px] font-semibold text-[#6B7A8D] text-start"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0F2F5]">
                {users.map((u) => (
                  <tr key={u.id} className="group hover:bg-[#F7F8FA] transition-colors">
                    <td className="px-4 py-2.5">
                      <div>
                        <p className="text-[13px] font-medium text-[#0C1825]">{u.name}</p>
                        {u.name_ar && (
                          <p className="text-[11px] text-[#9CA3AF]">{u.name_ar}</p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[12px] text-[#6B7A8D]" dir="ltr">
                        {u.email}
                      </span>
                    </td>
                    <td className="px-4 py-2.5">
                      <RoleBadge role={u.role} isAr={isAr} />
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium"
                        style={
                          u.is_active
                            ? { backgroundColor: "#10B98118", color: "#059669" }
                            : { backgroundColor: "#6B7A8D18", color: "#6B7A8D" }
                        }
                      >
                        {u.is_active
                          ? isAr ? "نشط" : "Active"
                          : isAr ? "معطل" : "Inactive"}
                      </span>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleEditOpen(u)}
                            className="p-1.5 rounded hover:bg-[#2563EB10] text-[#6B7A8D] hover:text-[#2563EB] transition-colors"
                            title={isAr ? "تعديل" : "Edit"}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {u.is_active && (
                            <button
                              onClick={() => deactivateMutation.mutate(u.id)}
                              disabled={deactivateMutation.isPending}
                              className="p-1.5 rounded hover:bg-red-50 text-[#6B7A8D] hover:text-red-500 transition-colors"
                              title={isAr ? "إلغاء التفعيل" : "Deactivate"}
                            >
                              <UserMinus className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[15px] text-[#0C1825]">
              {isAr ? "إضافة مستخدم جديد" : "Add New User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#6B7A8D]">
                  {isAr ? "الاسم (إنجليزي)" : "Name (English)"} *
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-8 text-[13px]"
                  placeholder="Full Name"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#6B7A8D]">
                  {isAr ? "الاسم (عربي)" : "Name (Arabic)"}
                </Label>
                <Input
                  value={form.name_ar}
                  onChange={(e) => setForm((f) => ({ ...f, name_ar: e.target.value }))}
                  className="h-8 text-[13px]"
                  placeholder="الاسم الكامل"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] text-[#6B7A8D]">
                {isAr ? "البريد الإلكتروني" : "Email"} *
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="h-8 text-[13px]"
                placeholder="user@example.com"
                dir="ltr"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[12px] text-[#6B7A8D]">
                {isAr ? "كلمة المرور" : "Password"} *
              </Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="h-8 text-[13px]"
                placeholder="••••••••"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#6B7A8D]">
                  {isAr ? "الدور" : "Role"}
                </Label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full h-8 px-2.5 text-[13px] rounded-md border border-input bg-background text-[#0C1825] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  {Object.entries(ROLE_LABELS).map(([val, lbl]) => (
                    <option key={val} value={val}>
                      {isAr ? lbl.ar : lbl.en}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#6B7A8D]">
                  {isAr ? "رقم الهاتف" : "Phone"}
                </Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="h-8 text-[13px]"
                  placeholder="+965 XXXX XXXX"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="h-8 px-4 text-[12px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
              >
                {createMutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                )}
                {isAr ? "إضافة" : "Add User"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setAddOpen(false)}
                className="h-8 px-3 text-[12px] border-[#E6E9EE] text-[#6B7A8D]"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle className="text-[15px] text-[#0C1825]">
              {isAr ? "تعديل المستخدم" : "Edit User"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#6B7A8D]">
                  {isAr ? "الاسم (إنجليزي)" : "Name (English)"}
                </Label>
                <Input
                  value={editForm.name ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  className="h-8 text-[13px]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#6B7A8D]">
                  {isAr ? "الاسم (عربي)" : "Name (Arabic)"}
                </Label>
                <Input
                  value={editForm.name_ar ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, name_ar: e.target.value }))}
                  className="h-8 text-[13px]"
                  dir="rtl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#6B7A8D]">
                  {isAr ? "الدور" : "Role"}
                </Label>
                <select
                  value={editForm.role ?? "viewer"}
                  onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))}
                  className="w-full h-8 px-2.5 text-[13px] rounded-md border border-input bg-background text-[#0C1825] focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                >
                  {Object.entries(ROLE_LABELS).map(([val, lbl]) => (
                    <option key={val} value={val}>
                      {isAr ? lbl.ar : lbl.en}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px] text-[#6B7A8D]">
                  {isAr ? "رقم الهاتف" : "Phone"}
                </Label>
                <Input
                  value={editForm.phone ?? ""}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  className="h-8 text-[13px]"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
                className="h-8 px-4 text-[12px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
              >
                {updateMutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                )}
                {isAr ? "حفظ" : "Save Changes"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setEditUser(null)}
                className="h-8 px-3 text-[12px] border-[#E6E9EE] text-[#6B7A8D]"
              >
                {isAr ? "إلغاء" : "Cancel"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Tab 3: Alert Thresholds ───────────────────────────────────────────────────

interface AlertField {
  key: keyof AlertsConfig;
  labelEn: string;
  labelAr: string;
  descEn: string;
  descAr: string;
  unit: string;
  min: number;
}

const ALERT_FIELDS: AlertField[] = [
  {
    key: "absence_days_threshold",
    labelEn: "Absence Days Threshold",
    labelAr: "حد أيام الغياب",
    descEn: "Alert when driver is absent for this many consecutive days",
    descAr: "تنبيه عند غياب السائق لهذا العدد من الأيام المتتالية",
    unit: "days",
    min: 1,
  },
  {
    key: "score_drop_threshold",
    labelEn: "Score Drop Threshold",
    labelAr: "حد انخفاض الدرجة",
    descEn: "Alert when AI performance score drops by this percentage",
    descAr: "تنبيه عند انخفاض درجة الأداء بهذه النسبة المئوية",
    unit: "%",
    min: 1,
  },
  {
    key: "cash_overdue_days",
    labelEn: "Cash Overdue Days",
    labelAr: "أيام تأخر الكاش",
    descEn: "Alert when cash deposit is overdue by this many days",
    descAr: "تنبيه عند تأخر إيداع الكاش بهذا العدد من الأيام",
    unit: "days",
    min: 1,
  },
  {
    key: "device_offline_hours",
    labelEn: "Device Offline Hours",
    labelAr: "ساعات عدم اتصال الجهاز",
    descEn: "Alert when a device has been offline for this many hours",
    descAr: "تنبيه عند انقطاع اتصال الجهاز لهذا العدد من الساعات",
    unit: "hrs",
    min: 1,
  },
  {
    key: "low_orders_pct",
    labelEn: "Low Orders Percentage",
    labelAr: "نسبة الطلبات المنخفضة",
    descEn: "Alert when order count drops below this percentage of average",
    descAr: "تنبيه عند انخفاض عدد الطلبات دون هذه النسبة من المتوسط",
    unit: "%",
    min: 1,
  },
];

function AlertThresholdsTab({ isAr, isAdmin }: { isAr: boolean; isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [localValues, setLocalValues] = useState<AlertsConfig | null>(null);
  const [dirty, setDirty] = useState(false);

  const { data, isLoading } = useQuery<AlertsConfig>({
    queryKey: ["alerts-config"],
    queryFn: async () => {
      const res = await api.get("/api/settings/alerts-config");
      return res.data;
    },
    select: (d) => {
      setLocalValues((prev) => prev ?? d);
      return d;
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: AlertsConfig) => {
      const res = await api.put("/api/settings/alerts-config", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["alerts-config"] });
      toast.success(isAr ? "تم حفظ إعدادات التنبيهات" : "Alert thresholds saved");
      setDirty(false);
    },
    onError: () => {
      toast.error(isAr ? "فشل الحفظ" : "Failed to save thresholds");
    },
  });

  const handleChange = (key: keyof AlertsConfig, value: string) => {
    const num = parseInt(value, 10);
    if (isNaN(num)) return;
    setLocalValues((prev) => (prev ? { ...prev, [key]: num } : prev));
    setDirty(true);
  };

  const handleSave = () => {
    if (localValues) mutation.mutate(localValues);
  };

  const handleReset = () => {
    if (data) { setLocalValues(data); setDirty(false); }
  };

  const values = localValues ?? data;

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-[#E6E9EE]">
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F0F2F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md flex items-center justify-center bg-[#F59E0B0D]">
              <Bell className="w-3.5 h-3.5 text-[#F59E0B]" strokeWidth={2} />
            </div>
            <span className="text-[13px] font-semibold text-[#0C1825]">
              {isAr ? "حدود التنبيهات" : "Alert Thresholds"}
            </span>
          </div>
          {isAdmin && dirty && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={handleReset}
                className="h-7 px-2.5 text-[11px] border-[#E6E9EE] text-[#6B7A8D]"
              >
                {isAr ? "إعادة تعيين" : "Reset"}
              </Button>
              <Button
                onClick={handleSave}
                disabled={mutation.isPending}
                className="h-7 px-3 text-[11px] bg-[#2563EB] hover:bg-[#1d4ed8] text-white"
              >
                {mutation.isPending && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />
                )}
                {isAr ? "حفظ" : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        {/* Fields */}
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-5 h-5 animate-spin text-[#2563EB]" />
          </div>
        ) : (
          <div className="divide-y divide-[#F0F2F5]">
            {ALERT_FIELDS.map((field) => (
              <div
                key={field.key}
                className="flex items-center justify-between px-4 py-3"
              >
                <div className="flex-1 min-w-0 pr-6">
                  <p className="text-[13px] font-medium text-[#0C1825]">
                    {isAr ? field.labelAr : field.labelEn}
                  </p>
                  <p className="text-[11px] text-[#6B7A8D] mt-0.5">
                    {isAr ? field.descAr : field.descEn}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isAdmin ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={field.min}
                        value={values?.[field.key] ?? ""}
                        onChange={(e) => handleChange(field.key, e.target.value)}
                        className="h-8 w-20 text-[13px] text-center tabular-nums"
                      />
                      <span className="text-[11px] text-[#6B7A8D] w-8">
                        {field.unit}
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      <span className="text-[13px] font-semibold text-[#0C1825] tabular-nums">
                        {values?.[field.key] ?? "—"}
                      </span>
                      <span className="text-[11px] text-[#6B7A8D]">{field.unit}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {!isAdmin && !isLoading && (
          <div className="px-4 pb-3">
            <p className="text-[11px] text-[#6B7A8D] bg-[#F7F8FA] rounded-md px-3 py-2">
              {isAr
                ? "يمكن للمدير فقط تعديل حدود التنبيهات"
                : "Only administrators can modify alert thresholds"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { language } = useUIStore();
  const { user } = useAuthStore();
  const isAr = language === "ar";
  const isAdmin = user?.role === "admin";

  return (
    <div className="max-w-[860px] space-y-4">
      {/* Page title */}
      <div>
        <h1 className="text-[20px] font-bold text-[#0C1825] tracking-tight">
          {isAr ? "الإعدادات" : "Settings"}
        </h1>
        <p className="text-[12px] text-[#6B7A8D] mt-0.5">
          {isAr
            ? "إدارة إعدادات الشركة والمستخدمين والتنبيهات"
            : "Manage company profile, users, and alert thresholds"}
        </p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="company">
        <TabsList className="h-9 bg-[#F7F8FA] border border-[#E6E9EE] p-0.5 gap-0.5">
          <TabsTrigger
            value="company"
            className="h-8 px-4 text-[12px] font-medium data-[state=active]:bg-white data-[state=active]:text-[#0F2B46] data-[state=active]:shadow-sm text-[#6B7A8D]"
          >
            <Building2 className="w-3.5 h-3.5" />
            {isAr ? "الشركة" : "Company"}
          </TabsTrigger>
          <TabsTrigger
            value="users"
            className="h-8 px-4 text-[12px] font-medium data-[state=active]:bg-white data-[state=active]:text-[#0F2B46] data-[state=active]:shadow-sm text-[#6B7A8D]"
          >
            <Users className="w-3.5 h-3.5" />
            {isAr ? "المستخدمون" : "Users"}
          </TabsTrigger>
          <TabsTrigger
            value="alerts"
            className="h-8 px-4 text-[12px] font-medium data-[state=active]:bg-white data-[state=active]:text-[#0F2B46] data-[state=active]:shadow-sm text-[#6B7A8D]"
          >
            <Bell className="w-3.5 h-3.5" />
            {isAr ? "التنبيهات" : "Alerts"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="company" className="mt-4">
          <CompanyProfileTab isAr={isAr} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <UserManagementTab isAr={isAr} isAdmin={isAdmin} />
        </TabsContent>

        <TabsContent value="alerts" className="mt-4">
          <AlertThresholdsTab isAr={isAr} isAdmin={isAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
