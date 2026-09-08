"use client";

import { useState } from "react";

export type UserFormValues = {
  full_name: string;
  email: string;
  phone: string;
  password: string;
  pincode: string;
  locality: string;
  area: string;
  address: string;
  onboarding_complete: boolean;
  status: "active" | "inactive" | "deleted";
};

export const EMPTY_USER_FORM: UserFormValues = {
  full_name: "",
  email: "",
  phone: "",
  password: "",
  pincode: "",
  locality: "",
  area: "",
  address: "",
  onboarding_complete: false,
  status: "active",
};

export function UserFormModal({
  mode,
  initial,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  initial: UserFormValues;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => void;
}) {
  const [form, setForm] = useState(initial);

  const set = (key: keyof UserFormValues, value: string | boolean) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-ink/40 p-4">
      <form
        className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-[24px] border border-line bg-white shadow-pop"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(form);
        }}
      >
        <div className="border-b border-line px-6 py-4">
          <h2 className="font-display text-lg font-bold">{mode === "create" ? "Create user" : "Edit user"}</h2>
          <p className="mt-1 text-sm text-ink-soft">
            {mode === "create" ? "Create a login the customer can use immediately." : "Update profile and account status."}
          </p>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-6 py-4">
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">Full name</span>
            <input className="input-box py-3 text-sm" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">Email</span>
            <input
              type="email"
              required
              className="input-box py-3 text-sm"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">Phone</span>
            <input className="input-box py-3 text-sm" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </label>
          {mode === "create" ? (
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-ink-soft">Password</span>
              <input
                type="password"
                required
                minLength={6}
                className="input-box py-3 text-sm"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
              />
            </label>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-ink-soft">Pincode</span>
              <input className="input-box py-3 text-sm" value={form.pincode} onChange={(e) => set("pincode", e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-ink-soft">Locality</span>
              <input className="input-box py-3 text-sm" value={form.locality} onChange={(e) => set("locality", e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-ink-soft">Area</span>
              <input className="input-box py-3 text-sm" value={form.area} onChange={(e) => set("area", e.target.value)} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-bold text-ink-soft">Status</span>
              <select
                className="input-box py-3 text-sm"
                value={form.status}
                onChange={(e) => set("status", e.target.value as UserFormValues["status"])}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                {mode === "edit" ? <option value="deleted">Deleted</option> : null}
              </select>
            </label>
          </div>
          <label className="block">
            <span className="mb-1 block text-xs font-bold text-ink-soft">Address</span>
            <input className="input-box py-3 text-sm" value={form.address} onChange={(e) => set("address", e.target.value)} />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={form.onboarding_complete}
              onChange={(e) => set("onboarding_complete", e.target.checked)}
            />
            Onboarding complete
          </label>
          {error ? <p className="text-sm font-semibold text-rose">{error}</p> : null}
        </div>
        <div className="flex gap-3 border-t border-line px-6 py-4">
          <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1 !w-auto py-3" disabled={saving}>
            {saving ? "Saving…" : mode === "create" ? "Create" : "Update"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function PasswordModal({
  name,
  saving,
  error,
  onClose,
  onSubmit,
}: {
  name: string;
  saving: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (password: string) => void;
}) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const mismatch = confirm.length > 0 && password !== confirm;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-ink/40 p-4">
      <form
        className="w-full max-w-md rounded-[24px] border border-line bg-white p-6 shadow-pop"
        onSubmit={(e) => {
          e.preventDefault();
          if (password !== confirm) return;
          onSubmit(password);
        }}
      >
        <h2 className="font-display text-lg font-bold">Change password</h2>
        <p className="mt-1 text-sm text-ink-soft">Set a new password for {name}.</p>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-bold text-ink-soft">New password</span>
          <input
            type="password"
            required
            minLength={6}
            className="input-box py-3 text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-bold text-ink-soft">Confirm password</span>
          <input
            type="password"
            required
            minLength={6}
            className="input-box py-3 text-sm"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {mismatch ? <p className="mt-2 text-sm font-semibold text-rose">Passwords do not match.</p> : null}
        {error ? <p className="mt-2 text-sm font-semibold text-rose">{error}</p> : null}
        <div className="mt-5 flex gap-3">
          <button type="button" className="btn-secondary flex-1" onClick={onClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" className="btn-primary flex-1 !w-auto py-3" disabled={saving || mismatch}>
            {saving ? "Saving…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
