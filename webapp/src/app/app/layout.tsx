import { AppShell } from "@/components/AppShell";
import { ConfirmProvider } from "@/components/ConfirmDialog";
import { ToastProvider } from "@/components/Toast";
import { UserLocationProvider } from "@/components/UserLocation";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <UserLocationProvider><AppShell>{children}</AppShell></UserLocationProvider>
      </ConfirmProvider>
    </ToastProvider>
  );
}
