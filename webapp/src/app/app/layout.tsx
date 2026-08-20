import { BottomNav } from "@/components/BottomNav";
import { ToastProvider } from "@/components/Toast";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="mx-auto min-h-screen w-full max-w-[480px] bg-bg-app shadow-pop sm:my-6 sm:min-h-[calc(100vh-3rem)] sm:overflow-hidden sm:rounded-[34px]">
        <div className="pb-28">{children}</div>
        <BottomNav />
      </div>
    </ToastProvider>
  );
}
