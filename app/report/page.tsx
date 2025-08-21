"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const ReportEditor = dynamic(()=>import("../../components/ReportEditor"), { ssr: false });

export default function ReportPage() {
  const [initialHtml, setInitialHtml] = useState<string>("");
  useEffect(()=>{
    const saved = localStorage.getItem("report:html") || "<h1>Untitled report</h1>";
    setInitialHtml(saved);
  }, []);
  return (
    <div className="space-y-6">
      <section className="panel p-4"><h1 className="text-xl font-semibold">Report editor</h1></section>
      <ReportEditor initialHTML={initialHtml} />
    </div>
  );
}
