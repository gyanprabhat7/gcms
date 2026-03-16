'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { jsPDF } from 'jspdf';
import { FileText, Download, Loader2, CheckCircle, X, Eye, Settings, Clock } from 'lucide-react';
import { useStore } from '@/lib/store';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';

const STORAGE_KEY = 'gcms_chat_config';
const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_CHAT_BASE_URL || 'https://api.openai.com/v1';
const DEFAULT_MODEL = process.env.NEXT_PUBLIC_CHAT_MODEL || 'gpt-4o-mini';

// Time estimates (seconds)
const SCRAPE_TIME_PER_ARTICLE = 6; // 5-worker parallel processing (effective time)
const AI_ANALYSIS_TIME = 30; // Model inference
const TOKENS_PER_ARTICLE = 400; // ~10k tokens / 25 articles

type BriefStage = 'idle' | 'config' | 'scraping' | 'analyzing' | 'done' | 'error';

interface ChatConfig {
  baseUrl: string;
  model: string;
  apiKey: string;
}

function loadChatConfig(): ChatConfig {
  if (typeof window === 'undefined') return { baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL, apiKey: '' };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return { baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL, apiKey: '', ...JSON.parse(stored) };
  } catch { /* ignore */ }
  return { baseUrl: DEFAULT_BASE_URL, model: DEFAULT_MODEL, apiKey: '' };
}

function formatETA(seconds: number): string {
  if (seconds < 60) return `~${seconds}s`;
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return secs > 0 ? `~${mins}m ${secs}s` : `~${mins}m`;
}

export default function SitrepGenerator() {
  const incidents = useStore((state) => state.incidents);
  const timeframe = useStore((state) => state.timeframe);

  const [stage, setStage] = useState<BriefStage>('idle');
  const [progress, setProgress] = useState('');
  const [report, setReport] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  // User-configurable
  const [countryCount, setCountryCount] = useState(5);
  const [articlesPerCountry, setArticlesPerCountry] = useState(5);

  // Live progress
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const totalArticles = countryCount * articlesPerCountry;
  const estimatedTokens = totalArticles * TOKENS_PER_ARTICLE;
  const estimatedSeconds = (totalArticles * SCRAPE_TIME_PER_ARTICLE) + AI_ANALYSIS_TIME;

  // Get filtered countries based on current data
  const availableCountries = useMemo(() => {
    let hours = 24;
    if (timeframe.endsWith('H')) hours = parseInt(timeframe, 10);
    else if (timeframe.endsWith('D')) hours = parseInt(timeframe, 10) * 24;
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    const filtered = incidents.filter(i => new Date(i.timestamp).getTime() >= cutoff);
    const countryMap: Record<string, number> = {};
    filtered.forEach(i => {
      if (i.country) countryMap[i.country] = (countryMap[i.country] || 0) + 1;
    });

    return Object.keys(countryMap)
      .sort((a, b) => countryMap[b] - countryMap[a])
      .map(c => ({ name: c, count: countryMap[c] }));
  }, [incidents, timeframe]);

  // Top countries based on user selection
  const topCountries = useMemo(() => {
    let hours = 24;
    if (timeframe.endsWith('H')) hours = parseInt(timeframe, 10);
    else if (timeframe.endsWith('D')) hours = parseInt(timeframe, 10) * 24;
    const cutoff = Date.now() - hours * 60 * 60 * 1000;

    const filtered = incidents.filter(i => new Date(i.timestamp).getTime() >= cutoff);
    const selected = availableCountries.slice(0, countryCount);

    return selected.map(({ name }) => {
      const countryIncidents = filtered
        .filter(i => i.country === name)
        .sort((a, b) => b.severity - a.severity)
        .slice(0, articlesPerCountry);
      return { name, incidents: countryIncidents, totalCount: countryIncidents.length };
    });
  }, [incidents, timeframe, availableCountries, countryCount, articlesPerCountry]);

  // Timer for live progress
  useEffect(() => {
    if (stage === 'scraping' || stage === 'analyzing') {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => setElapsedSeconds(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [stage]);

  const generateBrief = useCallback(async () => {
    if (topCountries.length === 0) return;

    try {
      setStage('scraping');
      setReport(null);

      const actualTotal = topCountries.reduce((s, c) => s + c.incidents.length, 0);
      setProgress(`Scraping & translating ${actualTotal} intelligence sources...`);

      const chatConfig = loadChatConfig();
      const payload = {
        countries: topCountries.map(c => ({
          name: c.name,
          incidents: c.incidents.map(i => ({
            summary: i.summary,
            type: i.type,
            severity: i.severity,
            url: i.url,
          }))
        })),
        baseUrl: chatConfig.baseUrl !== DEFAULT_BASE_URL ? chatConfig.baseUrl : undefined,
        model: chatConfig.model !== DEFAULT_MODEL ? chatConfig.model : undefined,
        apiKey: chatConfig.apiKey || undefined,
      };

      setStage('analyzing');
      setProgress('THERON analyzing cross-theater intelligence...');

      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || data.error) {
        throw new Error(data.error || 'Brief generation failed');
      }

      setReport(data.report);
      setStage('done');
      setProgress('Classified Brief ready.');
    } catch (err) {
      setStage('error');
      setProgress(err instanceof Error ? err.message : 'Unknown error');
    }
  }, [topCountries]);

  const downloadPDF = useCallback(() => {
    if (!report) return;

    const doc = new jsPDF();
    const today = format(new Date(), 'yyyy-MM-dd HH:mm:ss');
    let pageNum = 1;

    const extract = (xml: string, tag: string): string => {
      const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
      const match = xml.match(regex);
      return match ? match[1].trim() : '';
    };

    const addHeaderFooter = (theaterName?: string) => {
      doc.setFillColor(20, 20, 20);
      doc.rect(0, 0, 210, 18, 'F');
      doc.setFont("courier", "bold");
      doc.setTextColor(255, 50, 50);
      doc.setFontSize(8);
      doc.text("TOP SECRET // NOFORN // GCMS EYES ONLY", 105, 8, { align: "center" });
      doc.setTextColor(200, 200, 200);
      doc.setFontSize(6);
      doc.text(`CLASSIFIED BRIEF — ${today}`, 105, 14, { align: "center" });

      if (theaterName) {
        doc.setFillColor(40, 40, 40);
        doc.rect(15, 22, 180, 8, 'F');
        doc.setFont("courier", "bold");
        doc.setTextColor(0, 200, 255);
        doc.setFontSize(10);
        doc.text(theaterName.toUpperCase(), 105, 28, { align: "center" });
      }

      doc.setDrawColor(80, 80, 80);
      doc.line(15, 284, 195, 284);
      doc.setFont("courier", "normal");
      doc.setTextColor(120, 120, 120);
      doc.setFontSize(6);
      doc.text("THERON // GCMS INTELLIGENCE SYSTEM", 15, 290);
      doc.text(`PAGE ${pageNum}`, 195, 290, { align: "right" });
      doc.text(`ANALYST: THERON (AI)`, 105, 290, { align: "center" });
    };

    const writeSection = (label: string, content: string, y: number): number => {
      if (!content) return y;

      doc.setFont("courier", "bold");
      doc.setTextColor(0, 150, 200);
      doc.setFontSize(8);
      doc.text(label.toUpperCase(), 15, y);
      y += 1;
      doc.setDrawColor(0, 150, 200);
      doc.line(15, y, 195, y);
      y += 4;

      doc.setFont("courier", "normal");
      doc.setTextColor(40, 40, 40);
      doc.setFontSize(7.5);
      const cleanText = content.replace(/\[UNVERIFIED\]/g, '[UNVERIFIED]').replace(/\n{2,}/g, '\n');
      const lines = doc.splitTextToSize(cleanText, 175);

      let isBold = false;
      lines.forEach((line: string) => {
        if (y > 278) return;

        let x = 17;
        if (line.includes('[UNVERIFIED]')) doc.setTextColor(200, 50, 50);
        else doc.setTextColor(40, 40, 40);

        // Split by ** delimiters and toggle bold state
        const parts = line.split(/(\*\*)/);
        parts.forEach(part => {
          if (part === '**') {
            isBold = !isBold;
            doc.setFont("courier", isBold ? "bold" : "normal");
          } else {
            doc.text(part, x, y);
            x += doc.getTextWidth(part);
          }
        });

        y += 3.2;
      });
      y += 2;
      return y;
    };

    const theaterRegex = /<theater\s+name="([^"]*)">([\s\S]*?)<\/theater>/gi;
    const theaters: { name: string; xml: string }[] = [];
    let m;
    while ((m = theaterRegex.exec(report)) !== null) {
      theaters.push({ name: m[1], xml: m[2] });
    }

    const sections = [
      { tag: 'causal_analysis', label: 'Causal Analysis' },
      { tag: 'escalation_assessment', label: 'Escalation Assessment' },
      { tag: 'key_actors', label: 'Key Actors' },
      { tag: 'conflict_symmetry', label: 'Conflict Symmetry' },
      { tag: 'civilian_impact', label: 'Civilian Impact' },
      { tag: 'regional_contagion', label: 'Regional Contagion' },
      { tag: 'international_response', label: 'International Response' },
      { tag: 'historical_pattern', label: 'Historical Pattern' },
      { tag: 'source_credibility', label: 'Source Credibility' },
      { tag: 'forecast', label: '30-90 Day Forecast' },
    ];

    // Cover page
    addHeaderFooter();
    doc.setFont("courier", "bold");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(16);
    doc.text("CLASSIFIED", 105, 80, { align: "center" });
    doc.text("INTELLIGENCE BRIEF", 105, 92, { align: "center" });
    doc.setDrawColor(0, 150, 200);
    doc.line(50, 98, 160, 98);
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(`DATE: ${today}`, 105, 115, { align: "center" });
    doc.text(`ANALYST: THERON (GCMS AI)`, 105, 122, { align: "center" });
    doc.text(`THEATERS: ${theaters.map(t => t.name).join(' | ')}`, 105, 129, { align: "center" });
    doc.text(`ARTICLES ANALYZED: ${topCountries.reduce((s, c) => s + c.incidents.length, 0)}`, 105, 136, { align: "center" });
    doc.text(`ESTIMATED TOKENS: ~${estimatedTokens.toLocaleString()}`, 105, 143, { align: "center" });
    doc.setFontSize(7);
    doc.setTextColor(200, 50, 50);
    doc.text("FOR AUTHORIZED PERSONNEL ONLY", 105, 200, { align: "center" });

    // Theater pages
    theaters.forEach(theater => {
      doc.addPage();
      pageNum++;
      addHeaderFooter(theater.name);
      let y = 36;
      sections.forEach(sec => {
        const content = extract(theater.xml, sec.tag);
        if (content && y < 278) y = writeSection(sec.label, content, y);
      });
    });

    // Synthesis page
    const synthesisXml = extract(report, 'synthesis');
    if (synthesisXml) {
      doc.addPage();
      pageNum++;
      addHeaderFooter('CROSS-THEATER SYNTHESIS');
      let y = 36;
      y = writeSection('Cross-Theater Analysis', extract(synthesisXml, 'cross_theater'), y);
      y = writeSection('Global Risk Assessment', extract(synthesisXml, 'risk_assessment'), y);
      writeSection('Actionable Recommendations', extract(synthesisXml, 'recommendations'), y);
    }

    // Fallback
    if (theaters.length === 0) {
      doc.addPage();
      pageNum++;
      addHeaderFooter('RAW ANALYSIS');
      doc.setFont("courier", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(40, 40, 40);
      const lines = doc.splitTextToSize(report, 175);
      let y = 36;
      lines.forEach((line: string) => {
        if (y > 278) { doc.addPage(); pageNum++; addHeaderFooter(); y = 24; }
        doc.text(line, 15, y);
        y += 3.2;
      });
    }

    // Download the file
    const fileName = `GCMS_CLASSIFIED_BRIEF_${today.replace(/[: ]/g, '_')}.pdf`;
    doc.save(fileName);

    // Also open in new tab
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);
    window.open(blobUrl, '_blank');
  }, [report, topCountries, estimatedTokens]);

  // Auto-open PDF when done
  useEffect(() => {
    if (stage === 'done' && report) downloadPDF();
  }, [stage, report, downloadPDF]);

  const isProcessing = stage === 'scraping' || stage === 'analyzing';
  const remainingSeconds = Math.max(0, estimatedSeconds - elapsedSeconds);

  return (
    <>
      {/* Main Button */}
      <button
        onClick={() => setStage(stage === 'config' ? 'idle' : 'config')}
        disabled={isProcessing || availableCountries.length === 0}
        className="flex items-center gap-2 px-3 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded transition-all text-xs font-mono font-bold w-full justify-center group disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : stage === 'done' ? <CheckCircle className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
        <span>{isProcessing ? 'GENERATING...' : 'GENERATE CLASSIFIED BRIEF'}</span>
        {!isProcessing && <Settings className="w-3 h-3 opacity-50" />}
      </button>

      {/* Config Panel */}
      <AnimatePresence>
        {stage === 'config' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-2 p-3 border border-border rounded bg-card/50 space-y-3">
              <div className="text-[11px] font-mono text-secondary uppercase tracking-widest font-bold">Brief Configuration</div>

              {/* Country Count */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Countries</span>
                  <span className="text-foreground">{countryCount} / {Math.min(10, availableCountries.length)}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={Math.min(10, availableCountries.length)}
                  value={countryCount}
                  onChange={e => setCountryCount(Number(e.target.value))}
                  className="w-full h-1.5 accent-primary cursor-pointer"
                />
              </div>

              {/* Articles per Country */}
              <div className="space-y-1">
                <div className="flex justify-between text-[11px] font-mono text-muted-foreground">
                  <span>Articles / Country</span>
                  <span className="text-foreground">{articlesPerCountry}</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={15}
                  value={articlesPerCountry}
                  onChange={e => setArticlesPerCountry(Number(e.target.value))}
                  className="w-full h-1.5 accent-primary cursor-pointer"
                />
              </div>

              {/* Estimates */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 border border-border rounded bg-background/50">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">Articles</div>
                  <div className="text-sm font-bold font-mono text-foreground">{totalArticles}</div>
                </div>
                <div className="p-2 border border-border rounded bg-background/50">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">Tokens</div>
                  <div className="text-sm font-bold font-mono text-foreground">~{(estimatedTokens / 1000).toFixed(0)}k</div>
                </div>
                <div className="p-2 border border-border rounded bg-background/50">
                  <div className="text-[10px] font-mono text-muted-foreground uppercase">ETA</div>
                  <div className="text-sm font-bold font-mono text-foreground">{formatETA(estimatedSeconds)}</div>
                </div>
              </div>

              {/* Theaters Preview */}
              <div className="text-[11px] font-mono text-muted-foreground space-y-1 max-h-24 overflow-y-auto">
                {topCountries.map((c, i) => (
                  <div key={c.name} className="flex justify-between">
                    <span>{i + 1}. {c.name}</span>
                    <span>{c.incidents.length} articles</span>
                  </div>
                ))}
              </div>

              {/* Generate Button */}
              <button
                onClick={generateBrief}
                className="w-full py-2.5 bg-primary/20 hover:bg-primary/30 text-primary text-xs font-mono uppercase tracking-wider rounded border border-primary/30 transition-colors flex items-center justify-center gap-2 font-bold"
              >
                <Clock className="w-3 h-3" />
                Generate ({formatETA(estimatedSeconds)})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Indicator */}
      {(stage === 'scraping' || stage === 'analyzing') && (
        <div className="mt-2 p-3 border border-primary/30 rounded bg-primary/5 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[9px] font-mono text-primary animate-pulse">{progress}</span>
            <span className="text-[9px] font-mono text-muted-foreground">
              {formatETA(remainingSeconds)} left
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-1 bg-background rounded overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-1000 ease-linear"
              style={{ width: `${Math.min(100, (elapsedSeconds / estimatedSeconds) * 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-[8px] font-mono text-muted-foreground">
            <span>{Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')} elapsed</span>
            <span>{totalArticles} articles • ~{(estimatedTokens / 1000).toFixed(0)}k tokens</span>
          </div>
        </div>
      )}

      {/* Done / Error Status */}
      {stage === 'done' && (
        <div className="mt-2 text-[9px] font-mono p-2 rounded border border-secondary/30 text-secondary bg-secondary/5">
          {progress}
          <div className="flex gap-2 mt-2">
            <button onClick={() => setShowPreview(true)} className="flex items-center gap-1 text-primary hover:underline">
              <Eye className="w-3 h-3" /> Preview
            </button>
            <button onClick={downloadPDF} className="flex items-center gap-1 text-secondary hover:underline">
              <Download className="w-3 h-3" /> Download PDF
            </button>
          </div>
        </div>
      )}

      {stage === 'error' && (
        <div className="mt-2 text-[9px] font-mono p-2 rounded border border-alert/30 text-alert bg-alert/5">
          {progress}
        </div>
      )}

      {/* Preview Modal */}
      <AnimatePresence>
        {showPreview && report && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-3xl max-h-[85vh] bg-card border border-primary/30 rounded-sm shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="p-4 border-b border-border bg-primary/5 flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <div>
                    <h2 className="text-sm font-bold font-mono text-foreground uppercase tracking-widest">Classified Brief</h2>
                    <p className="text-[9px] text-muted-foreground font-mono">ANALYST: THERON — {topCountries.map(c => c.name).join(', ')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={downloadPDF} className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 border border-secondary/30 text-secondary text-[10px] font-mono uppercase rounded hover:bg-secondary/20 transition-all">
                    <Download className="w-3 h-3" /> PDF
                  </button>
                  <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-white/10 rounded transition-colors text-muted-foreground hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="p-6 overflow-y-auto flex-1 prose prose-invert prose-sm max-w-none font-mono
                prose-headings:text-primary prose-headings:uppercase prose-headings:tracking-wider
                prose-strong:text-foreground prose-li:text-foreground/80
                prose-p:text-foreground/70 prose-p:leading-relaxed
              ">
                <ReactMarkdown>{report}</ReactMarkdown>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}