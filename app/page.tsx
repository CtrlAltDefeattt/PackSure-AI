"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Camera,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileDown,
  FileImage,
  LoaderCircle,
  RefreshCw,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Status = "compliant" | "violation" | "review";

type Finding = {
  key: string;
  label: string;
  value: string;
  status: Status;
  confidence: number;
  rule: string;
  evidence: string;
};

const DEMO_TEXT = `SUNRISE OATS
Net Quantity: 500 g
MRP: ₹120.00
Manufactured & Packed by: Sunrise Foods Private Limited
Plot 18, MIDC Industrial Area, Pune, Maharashtra 411019
Month & Year of Packing: AUG 2026
Batch No: SOA2608A
Consumer Care: care@sunrisefoods.in | +91 1800 220 118`;

const STATUS_STYLE: Record<Status, string> = {
  compliant: "border-emerald-200 bg-emerald-50 text-emerald-700",
  violation: "border-red-200 bg-red-50 text-red-700",
  review: "border-amber-200 bg-amber-50 text-amber-700",
};

const STATUS_LABEL: Record<Status, string> = {
  compliant: "Compliant",
  violation: "Violation",
  review: "Review",
};

function match(text: string, pattern: RegExp) {
  const found = text.match(pattern);
  return found?.[1]?.trim().replace(/\s+/g, " ") ?? "";
}

function evidenceLine(text: string, pattern: RegExp) {
  return text.split("\n").find((line) => pattern.test(line))?.trim() ?? "No matching evidence found";
}

function extractFindings(rawText: string): Finding[] {
  const text = rawText.replace(/\r/g, "").replace(/[ \t]+/g, " ").trim();
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  const product = lines.find((line) =>
    line.length >= 3 && line.length <= 70 &&
    !/(net|mrp|manufact|pack|consumer|batch|month|date|address|email|phone)/i.test(line),
  ) ?? "";
  const netQuantity = match(text, /(?:net\s*(?:quantity|qty)|contents?)\s*[:\-]?\s*([0-9]+(?:\.[0-9]+)?\s*(?:kg|g|gm|mg|l|ltr|ml|cl|pcs?|pieces?))/i);
  const mrp = match(text, /(?:m\.?r\.?p\.?|maximum\s+retail\s+price)\s*[:\-]?\s*(?:rs\.?|inr|₹)?\s*([0-9]+(?:\.[0-9]{1,2})?)/i);
  const manufacturer = match(text, /(?:manufactured|mfd|packed|marketed)\s*(?:and|&)?\s*(?:packed)?\s*by\s*[:\-]?\s*([^\n]+)/i);
  const address = lines.find((line) => /(plot|road|street|industrial|area|district|maharashtra|pune|mumbai|india|pin\s*code|\b[1-9][0-9]{5}\b)/i.test(line)) ?? "";
  const packingDate = match(text, /(?:month\s*(?:and|&)\s*year\s*of\s*(?:packing|manufacture)|mfg\.?\s*date|mfd\.?|packed\s*on|pkd\.?)\s*[:\-]?\s*([^\n]+)/i);
  const consumerCare = match(text, /(?:consumer\s*(?:care|complaint)|customer\s*care|contact)\s*[:\-]?\s*([^\n]+)/i) ||
    match(text, /([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
  const origin = match(text, /(?:country\s*of\s*origin|made\s*in)\s*[:\-]?\s*([^\n]+)/i);
  const taxPhrasePresent = /(inclusive\s+of\s+all\s+taxes|incl\.?\s*(?:of)?\s*all\s+taxes)/i.test(text);

  const declaration = (
    key: string,
    label: string,
    value: string,
    rule: string,
    evidence: string,
    missingStatus: Status = "violation",
    confidence = 93,
  ): Finding => ({
    key,
    label,
    value,
    status: value ? "compliant" : missingStatus,
    confidence: value ? confidence : 35,
    rule,
    evidence,
  });

  const findings: Finding[] = [
    declaration("product", "Product identity", product, "Common or generic name must be declared", product || "No product name detected", "violation", 82),
    declaration("net", "Net quantity", netQuantity, "Standard unit and quantity must be declared", evidenceLine(text, /net|quantity|qty|contents/i)),
    declaration("manufacturer", "Manufacturer / packer", manufacturer, "Responsible entity must be identified", evidenceLine(text, /manufact|mfd|packed|marketed/i), "violation", 89),
    declaration("address", "Complete address", address, "Name and address of manufacturer / packer", address || "No address-like line detected", "review", 78),
    declaration("date", "Month & year", packingDate, "Manufacture or packing month and year", evidenceLine(text, /month|year|mfg|mfd|packed|pkd/i), "violation", 86),
    declaration("care", "Consumer care", consumerCare, "Consumer complaint contact must be available", evidenceLine(text, /consumer|customer|contact|@|1800/i), "violation", 90),
    declaration("origin", "Country of origin", origin, "Required when the commodity is imported", evidenceLine(text, /country|origin|made in/i), "review", 60),
  ];

  findings.splice(2, 0, {
    key: "mrp",
    label: "MRP declaration",
    value: mrp ? `₹${mrp}` : "",
    status: !mrp || !taxPhrasePresent ? "violation" : "compliant",
    confidence: mrp ? 94 : 35,
    rule: "MRP must include the phrase ‘inclusive of all taxes’",
    evidence: evidenceLine(text, /m\.?r\.?p|maximum retail price/i),
  });

  return findings;
}

function StatusIcon({ status }: { status: Status }) {
  if (status === "compliant") return <Check aria-hidden="true" className="size-3.5" />;
  if (status === "violation") return <X aria-hidden="true" className="size-3.5" />;
  return <AlertTriangle aria-hidden="true" className="size-3.5" />;
}

export default function Home() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [rawText, setRawText] = useState(DEMO_TEXT);
  const [findings, setFindings] = useState<Finding[]>(() => extractFindings(DEMO_TEXT));
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("SIH demo package");
  const [isScanning, setIsScanning] = useState(false);
  const [progress, setProgress] = useState(100);
  const [progressLabel, setProgressLabel] = useState("Demo report loaded");
  const [selectedKey, setSelectedKey] = useState("mrp");
  const [error, setError] = useState("");

  const summary = useMemo(() => {
    const compliant = findings.filter((item) => item.status === "compliant").length;
    const violations = findings.filter((item) => item.status === "violation").length;
    const review = findings.filter((item) => item.status === "review").length;
    const score = Math.round((compliant / findings.length) * 100);
    return { compliant, violations, review, score };
  }, [findings]);

  const selectedFinding = findings.find((item) => item.key === selectedKey) ?? findings[0];

  async function scanFile(file: File) {
    if (!file.type.startsWith("image/")) {
      setError("Please upload a JPG, PNG or WEBP image.");
      return;
    }
    setError("");
    setFileName(file.name);
    setPreview(URL.createObjectURL(file));
    setIsScanning(true);
    setProgress(4);
    setProgressLabel("Loading OCR engine");

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (message: { status: string; progress: number }) => {
          setProgress(Math.max(4, Math.round((message.progress ?? 0) * 100)));
          setProgressLabel(message.status.replace(/_/g, " "));
        },
      });
      try {
        const result = await worker.recognize(file);
        const text = result.data.text.trim();
        if (!text) throw new Error("No readable text was detected.");
        setRawText(text);
        setFindings(extractFindings(text));
        setSelectedKey("mrp");
        setProgress(100);
        setProgressLabel("Compliance report ready");
      } finally {
        await worker.terminate();
      }
    } catch (scanError) {
      setError(scanError instanceof Error ? scanError.message : "The scan could not be completed.");
      setProgressLabel("Scan failed");
    } finally {
      setIsScanning(false);
    }
  }

  function handleFile(file?: File) {
    if (file) void scanFile(file);
  }

  function loadDemo() {
    setPreview(null);
    setFileName("SIH demo package");
    setRawText(DEMO_TEXT);
    setFindings(extractFindings(DEMO_TEXT));
    setSelectedKey("mrp");
    setProgress(100);
    setProgressLabel("Demo report loaded");
    setError("");
  }

  function updateValue(key: string, value: string) {
    setFindings((current) => current.map((item) => {
      if (item.key !== key) return item;
      let status: Status = value.trim() ? "compliant" : item.key === "origin" || item.key === "address" ? "review" : "violation";
      if (item.key === "mrp" && !/(inclusive\s+of\s+all\s+taxes)/i.test(rawText)) status = "violation";
      return { ...item, value, status, confidence: value.trim() ? Math.max(item.confidence, 75) : 35 };
    }));
  }

  return (
    <main className="min-h-screen bg-[#f4f7f9] text-[#172332]">
      <header className="no-print sticky top-0 z-30 border-b border-[#d9e3ea] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1480px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-[#1676b8] text-white shadow-sm">
              <ScanLine className="size-5" aria-hidden="true" />
            </div>
            <div>
              <p className="text-lg font-black tracking-tight">PackSure <span className="text-[#1676b8]">AI</span></p>
              <p className="text-[10px] font-bold uppercase tracking-[0.19em] text-slate-500">SIH26034 · Compliance scanner</p>
            </div>
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">Offline-first OCR</span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600">Rulebook v0.1</span>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1480px] px-4 py-5 sm:px-6 sm:py-7">
        <section className="mb-5 flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#1676b8]">
              <Sparkles className="size-4" aria-hidden="true" /> Inspector workspace
            </div>
            <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-4xl">Scan a package. Verify every declaration.</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              OCR extracts label evidence; transparent rules decide the verdict. Every finding remains editable and traceable.
            </p>
          </div>
          <div className="no-print flex flex-wrap gap-2">
            <Button variant="outline" className="h-10 border-[#b8c8d6] bg-white font-bold" onClick={loadDemo}>
              <RefreshCw /> Load SIH demo
            </Button>
            <Button className="h-10 bg-[#173d62] font-bold hover:bg-[#102f4e]" onClick={() => window.print()}>
              <FileDown /> Export report
            </Button>
          </div>
        </section>

        <section className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="no-print space-y-5">
            <div className="border-2 border-[#1676b8] bg-white p-5 shadow-[4px_4px_0_#d7eaf6]">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#1676b8]">01 · Capture</p><h2 className="mt-1 text-xl font-black">Package image</h2></div>
                <Camera className="size-6 text-[#1676b8]" aria-hidden="true" />
              </div>

              <button
                type="button"
                aria-label="Upload package image"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => { event.preventDefault(); handleFile(event.dataTransfer.files[0]); }}
                className="group relative grid min-h-64 w-full place-items-center overflow-hidden border-2 border-dashed border-[#b8c8d6] bg-[#f7fafc] p-5 text-center transition hover:border-[#1676b8] hover:bg-[#eff7fc] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
              >
                {preview ? (
                  <>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={preview} alt="Uploaded commodity package" className="absolute inset-0 size-full object-contain p-3" />
                    <span className="absolute inset-x-3 bottom-3 rounded-lg bg-[#172332]/90 px-3 py-2 text-xs font-bold text-white">Click to replace image</span>
                  </>
                ) : (
                  <div>
                    <div className="mx-auto mb-4 grid size-14 place-items-center rounded-full bg-[#e4f2fb] text-[#1676b8] transition group-hover:scale-105"><Upload className="size-6" aria-hidden="true" /></div>
                    <p className="font-black">Drop a package image here</p>
                    <p className="mt-2 text-xs leading-5 text-slate-500">or click to use camera / gallery<br />JPG, PNG or WEBP</p>
                  </div>
                )}
              </button>
              <input ref={inputRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => handleFile(event.target.files?.[0])} />

              <div className="mt-4 flex items-center gap-3 border-t border-slate-200 pt-4">
                <FileImage className="size-4 shrink-0 text-slate-500" aria-hidden="true" />
                <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-600">{fileName}</span>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Local only</span>
              </div>
              {error && <p role="alert" className="mt-3 border-l-4 border-red-500 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">{error}</p>}
            </div>

            <div className="border border-[#c8d6e0] bg-[#173d62] p-5 text-white">
              <div className="flex items-center justify-between gap-4">
                <div><p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">02 · Extract</p><p className="mt-1 font-black capitalize">{progressLabel}</p></div>
                {isScanning ? <LoaderCircle className="size-5 animate-spin text-[#f58220]" /> : <ShieldCheck className="size-6 text-emerald-300" />}
              </div>
              <Progress value={progress} className="mt-4 h-2 bg-white/20 [&_[data-slot=progress-indicator]]:bg-[#f58220]" />
              <div className="mt-2 flex justify-between text-[11px] font-bold text-blue-100"><span>Browser OCR</span><span>{progress}%</span></div>
            </div>
          </aside>

          <div className="min-w-0 space-y-5">
            <section className="border border-[#c8d6e0] bg-white shadow-sm">
              <div className="grid border-b border-[#dbe5eb] md:grid-cols-[1fr_390px]">
                <div className="p-5 sm:p-6">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-[#1676b8]">03 · Validate</p>
                  <div className="mt-2 flex flex-wrap items-end gap-x-4 gap-y-2"><h2 className="text-2xl font-black sm:text-3xl">Compliance report</h2><span className="mb-1 text-xs font-bold text-slate-500">{findings.length} declarations checked</span></div>
                </div>
                <div className="grid grid-cols-4 border-t border-[#dbe5eb] md:border-l md:border-t-0">
                  <Metric value={summary.score} label="Score" color="text-[#1676b8]" />
                  <Metric value={summary.compliant} label="Pass" color="text-emerald-600" />
                  <Metric value={summary.violations} label="Fail" color="text-red-600" />
                  <Metric value={summary.review} label="Review" color="text-amber-600" last />
                </div>
              </div>

              <div className="overflow-hidden">
                <Table>
                  <TableHeader className="bg-[#f5f8fa]"><TableRow>
                    <TableHead className="w-[23%] px-4 font-black text-[#173d62]">Declaration</TableHead>
                    <TableHead className="min-w-[230px] font-black text-[#173d62]">Extracted value</TableHead>
                    <TableHead className="font-black text-[#173d62]">Verdict</TableHead>
                    <TableHead className="font-black text-[#173d62]">Confidence</TableHead>
                    <TableHead className="w-10"><span className="sr-only">Evidence</span></TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {findings.map((item) => (
                      <TableRow key={item.key} data-state={selectedKey === item.key ? "selected" : undefined} className="cursor-pointer" onClick={() => setSelectedKey(item.key)}>
                        <TableCell className="px-4 py-3 font-bold text-[#173d62]">{item.label}</TableCell>
                        <TableCell className="py-3"><input aria-label={`Extracted value for ${item.label}`} value={item.value} placeholder="Not detected" onClick={(event) => event.stopPropagation()} onChange={(event) => updateValue(item.key, event.target.value)} className="h-9 w-full min-w-48 border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition focus:border-[#1676b8] focus:ring-2 focus:ring-blue-100" /></TableCell>
                        <TableCell className="py-3"><StatusBadge status={item.status} /></TableCell>
                        <TableCell className="py-3 font-bold text-slate-600">{item.confidence}%</TableCell>
                        <TableCell className="py-3"><ChevronRight className="size-4 text-slate-400" aria-hidden="true" /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-[1.15fr_.85fr]">
              <div className="border border-[#c8d6e0] bg-white p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#1676b8]">Evidence trace</p><h3 className="mt-1 text-xl font-black">{selectedFinding.label}</h3></div>
                  <StatusBadge status={selectedFinding.status} />
                </div>
                <div className="mt-5 border-l-4 border-[#f58220] bg-[#fff7ed] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-700">Matched label evidence</p>
                  <p className="mt-2 font-mono text-sm font-bold leading-6 text-[#172332]">“{selectedFinding.evidence}”</p>
                </div>
                <div className="mt-4 flex items-start gap-3 border border-[#dbe5eb] bg-[#f7fafc] p-4">
                  <ClipboardCheck className="mt-0.5 size-5 shrink-0 text-[#1676b8]" aria-hidden="true" />
                  <div><p className="text-xs font-black uppercase tracking-wide text-slate-500">Applied rule</p><p className="mt-1 text-sm font-bold leading-6">{selectedFinding.rule}</p></div>
                </div>
              </div>

              <div className="border border-[#c8d6e0] bg-[#173d62] p-5 text-white sm:p-6">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-200">04 · Report</p>
                <div className="mt-3 flex items-center gap-3">
                  <div className={`grid size-12 place-items-center rounded-full ${summary.violations ? "bg-red-500" : "bg-emerald-500"}`}>{summary.violations ? <AlertTriangle className="size-6" /> : <ShieldCheck className="size-6" />}</div>
                  <div><h3 className="text-xl font-black">{summary.violations ? "Action required" : "Compliant package"}</h3><p className="text-xs font-bold text-blue-100">Evidence-linked inspection outcome</p></div>
                </div>
                <div className="mt-5 space-y-3 border-t border-white/15 pt-5 text-sm">
                  <div className="flex justify-between"><span className="text-blue-100">Critical violations</span><strong>{summary.violations}</strong></div>
                  <div className="flex justify-between"><span className="text-blue-100">Manual review items</span><strong>{summary.review}</strong></div>
                  <div className="flex justify-between"><span className="text-blue-100">Audit reference</span><strong>PKS-{new Date().getFullYear()}-0026</strong></div>
                </div>
                <Button className="no-print mt-6 w-full bg-[#f58220] font-black text-white hover:bg-[#d96d13]" onClick={() => window.print()}><FileDown /> Print / save PDF report</Button>
                <p className="mt-4 text-[10px] leading-4 text-blue-200">Prototype decision support only. Final enforcement remains with the authorized Legal Metrology officer.</p>
              </div>
            </section>

            <details className="no-print border border-[#c8d6e0] bg-white p-5">
              <summary className="cursor-pointer select-none text-sm font-black text-[#173d62]">View raw OCR text</summary>
              <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap border bg-slate-950 p-4 font-mono text-xs leading-5 text-slate-100">{rawText}</pre>
            </details>
          </div>
        </section>
      </div>
    </main>
  );
}

function Metric({ value, label, color, last = false }: { value: number; label: string; color: string; last?: boolean }) {
  return <div className={`grid place-items-center p-3 text-center ${last ? "" : "border-r border-[#dbe5eb]"}`}><span className={`text-2xl font-black ${color}`}>{value}</span><span className="text-[10px] font-black uppercase text-slate-500">{label}</span></div>;
}

function StatusBadge({ status }: { status: Status }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-black ${STATUS_STYLE[status]}`}><StatusIcon status={status} /> {STATUS_LABEL[status]}</span>;
}
