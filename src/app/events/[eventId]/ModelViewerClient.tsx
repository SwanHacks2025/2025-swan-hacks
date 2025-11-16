"use client";

import dynamic from "next/dynamic";

const Viewer = dynamic(() => import("./viewer"), {
  ssr: false,
});

export default function ModelViewerClient({ modelUrl }: { modelUrl: string }) {
  return <Viewer modelUrl={modelUrl} />;
}
