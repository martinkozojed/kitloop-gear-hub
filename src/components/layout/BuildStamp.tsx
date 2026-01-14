import React from "react";
import { getBuildInfo } from "@/lib/buildInfo";

export const BuildStamp = () => {
  const { shortCommit, buildTime } = getBuildInfo();

  return (
    <div className="fixed bottom-3 right-3 z-40">
      <span className="inline-flex items-center gap-2 rounded-full border bg-background/90 px-3 py-1 text-xs font-mono text-muted-foreground shadow-sm">
        <span className="font-semibold">Build</span>
        <span>{shortCommit}</span>
        <span className="text-muted-foreground/70">•</span>
        <span>{buildTime}</span>
      </span>
    </div>
  );
};

export default BuildStamp;
