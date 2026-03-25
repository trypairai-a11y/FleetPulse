"use client";
import { useState } from "react";
import { useApiGet } from "@/hooks/useApi";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/cn";
import PlatformBadge from "@/components/shared/PlatformBadge";
import { Plus, X } from "lucide-react";
import api from "@/lib/api";

type Tab = "companies" | "users" | "profile";

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>("companies");
  const { user } = useAuth();
  const { data: companiesData, refetch: refetchCompanies } = useApiGet<any>("/api/companies?limit=50");
  const [showAddCompany, setShowAddCompany] = useState(false);
  const [newCompany, setNewCompany] = useState({ name: "", platform: "KEETA", licenseCount: 1 });

  // Profile form
  const [profileForm, setProfileForm] = useState({ name: user?.name || "", email: user?.email || "" });

  const companies = companiesData?.data || [];

  const handleAddCompany = async () => {
    try {
      await api.post("/api/companies", newCompany);
      setShowAddCompany(false);
      refetchCompanies();
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      await api.put("/api/auth/me", profileForm);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-xl font-semibold">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {(["companies", "users", "profile"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-lg transition-colors capitalize",
              tab === t ? "bg-white text-foreground shadow-sm" : "text-secondary hover:text-foreground"
            )}>
            {t}
          </button>
        ))}
      </div>

      {tab === "companies" && (
        <div>
          <div className="flex justify-end mb-4">
            <button onClick={() => setShowAddCompany(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors">
              <Plus size={16} /> Add Company
            </button>
          </div>
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-50">
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Platform</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Licenses</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Drivers</th>
                  <th className="text-left text-xs font-medium text-secondary px-5 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((company: any) => (
                  <tr key={company.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-25">
                    <td className="px-5 py-3 text-sm font-medium">{company.name}</td>
                    <td className="px-5 py-3"><PlatformBadge platform={company.platform} /></td>
                    <td className="px-5 py-3 text-sm text-secondary">{company.licenseCount}</td>
                    <td className="px-5 py-3 text-sm text-secondary">{company._count?.drivers || 0}</td>
                    <td className="px-5 py-3">
                      <span className={cn("px-2 py-0.5 rounded-md text-xs font-medium",
                        company.isActive ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500")}>
                        {company.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {showAddCompany && (
            <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-lg w-full max-w-md p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">Add Company</h2>
                  <button onClick={() => setShowAddCompany(false)} className="p-1 hover:bg-gray-50 rounded-lg"><X size={18} /></button>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">Company Name</label>
                    <input value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-1.5">Platform</label>
                    <select value={newCompany.platform} onChange={(e) => setNewCompany({ ...newCompany, platform: e.target.value })}
                      className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20">
                      {["KEETA", "TALABAT", "DELIVEROO", "AMERICANA"].map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <button onClick={handleAddCompany}
                    className="w-full py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors">
                    Add Company
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === "users" && (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
          <p className="text-sm text-secondary">User management — list and manage dashboard users</p>
        </div>
      )}

      {tab === "profile" && (
        <div className="bg-white rounded-2xl shadow-sm p-6 max-w-lg">
          <h2 className="text-base font-semibold mb-4">Your Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Name</label>
              <input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Email</label>
              <input value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20" />
            </div>
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">Role</label>
              <input value={user?.role?.replace("_", " ") || ""} disabled
                className="w-full px-3 py-2 rounded-xl border border-gray-200 text-sm bg-gray-50 text-secondary" />
            </div>
            <button onClick={handleUpdateProfile}
              className="px-6 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-hover transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
