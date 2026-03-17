import { BotSkeleton } from "./components/BotSkeleton";

export default function Loading() {
  return (
    <div style={{ background: "#131722", minHeight: "100vh" }}>
      <BotSkeleton />
    </div>
  );
}
