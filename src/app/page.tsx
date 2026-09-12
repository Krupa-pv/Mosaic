import TodayView from "@/components/TodayView";

export default function HomePage() {
  // No auth in this build — the facility's staff name is display-only.
  return <TodayView staffName="Rosa" />;
}
