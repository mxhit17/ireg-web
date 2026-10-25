import { Suspense } from "react";

import { HomeView } from "@/components/home/home-view";

/** Home = the "Threads & Search" tab: saved, recently added and popular projects (GET home). */
export default function HomePage() {
  return (
    <Suspense>
      <HomeView />
    </Suspense>
  );
}
