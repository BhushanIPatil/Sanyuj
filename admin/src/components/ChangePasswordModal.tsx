"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { PasswordInput } from "@/components/PasswordInput";

export function ChangePasswordModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const mismatch = confirm.length > 0 && password !== confirm;

  const submit = async () => {
    if (password !== confirm) return;
    setSaving(true);
    setError("");
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const email = user?.email;
      if (!email) throw new Error("Not signed in");

      const { error: authErr } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      });
      if (authErr) throw new Error("Current password is incorrect.");

      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) throw new Error(updateErr.message || "Could not update password");
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-ink/40 p-4">
      <form
        className="w-full max-w-md rounded-[24px] border border-line bg-white p-6 shadow-pop"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <h2 className="font-display text-lg font-bold">Change password</h2>
        <p className="mt-1 text-sm text-ink-soft">Update the password for your admin account.</p>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-bold text-ink-soft">Current password</span>
          <PasswordInput
            value={currentPassword}
            onChange={setCurrentPassword}
            required
            autoComplete="current-password"
          />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-bold text-ink-soft">New password</span>
          <PasswordInput
            value={password}
            onChange={setPassword}
            required
            minLength={6}
            autoComplete="new-password"
          />
        </label>
        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-bold text-ink-soft">Confirm new password</span>
          <PasswordInput
            value={confirm}
            onChange={setConfirm}
            required
            minLength={6}
            autoComplete="new-password"
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
