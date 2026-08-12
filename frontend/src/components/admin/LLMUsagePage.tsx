import { Bot, BrainCircuit, ChevronLeft, Cpu, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { getLLMUsage, type LLMUsageBreakdownItem, type LLMUsageSummary, type LLMUsageTotals } from "../../lib/adminAuth";
import { adminPath } from "../../lib/routes";

function number(value: number) {
  return new Intl.NumberFormat("en").format(value);
}

function TotalsCard({ label, totals }: { label: string; totals: LLMUsageTotals }) {
  return (
    <div className="rounded-lg border border-white/10 bg-panel p-4">
      <p className="text-xs uppercase tracking-wide text-white/45">{label}</p>
      <p className="mt-2 text-lg font-semibold">{number(totals.totalTokens)} tokens</p>
      <p className="text-sm text-white/55">{number(totals.requests)} requests</p>
      <p className="mt-3 text-xs text-white/45">Input {number(totals.inputTokens)} · Output {number(totals.outputTokens)}</p>
    </div>
  );
}

function BreakdownTable({ title, icon: Icon, items }: { title: string; icon: typeof Bot; items: LLMUsageBreakdownItem[] }) {
  return (
    <section className="overflow-x-auto rounded-lg border border-white/10 bg-panel">
      <h3 className="flex items-center gap-2 border-b border-white/10 px-4 py-3 font-semibold"><Icon size={17} className="text-mint" />{title}</h3>
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead className="border-b border-white/10 text-xs uppercase tracking-wide text-white/45">
          <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Requests</th><th className="px-4 py-3">Input</th><th className="px-4 py-3">Output</th><th className="px-4 py-3">Total</th></tr>
        </thead>
        <tbody className="divide-y divide-white/8">
          {items.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-white/45">No LLM usage recorded this month.</td></tr> : null}
          {items.map((item) => (
            <tr key={item.key} className="hover:bg-white/[0.025]">
              <td className="px-4 py-3 font-medium">{item.label}</td>
              <td className="px-4 py-3 text-white/60">{number(item.requests)}</td>
              <td className="px-4 py-3 text-white/60">{number(item.inputTokens)}</td>
              <td className="px-4 py-3 text-white/60">{number(item.outputTokens)}</td>
              <td className="px-4 py-3 font-semibold text-mint">{number(item.totalTokens)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function LLMUsagePage({ token }: { token: string }) {
  const [usage, setUsage] = useState<LLMUsageSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getLLMUsage(token)
      .then(setUsage)
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load LLM usage."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <div className="grid place-items-center py-20"><LoaderCircle className="animate-spin text-mint" /></div>;

  return (
    <div className="grid gap-5">
      <a href={adminPath()} className="inline-flex w-fit items-center gap-2 text-sm text-white/60 hover:text-white"><ChevronLeft size={16} />Back to dashboard</a>
      {error ? <p className="rounded-md border border-coral/30 bg-coral/10 px-4 py-3 text-coral">{error}</p> : null}
      <section className="rounded-xl border border-white/10 bg-panel p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-mint/15 text-mint"><BrainCircuit size={22} /></span>
          <div><h2 className="text-xl font-semibold">LLM Usage</h2><p className="text-sm text-white/55">Monitor Virtual User LLM requests and token usage.</p></div>
        </div>
      </section>
      <section className="grid gap-4 md:grid-cols-4">
        <TotalsCard label="Today" totals={usage?.periods.today ?? { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }} />
        <TotalsCard label="This week" totals={usage?.periods.week ?? { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }} />
        <TotalsCard label="This month" totals={usage?.periods.month ?? { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }} />
        <TotalsCard label="This year" totals={usage?.periods.year ?? { requests: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0 }} />
      </section>
      <BreakdownTable title="By Virtual User" icon={Bot} items={usage?.byVirtualUser ?? []} />
      <BreakdownTable title="By Model" icon={Cpu} items={usage?.byModel ?? []} />
      <BreakdownTable title="By Provider" icon={BrainCircuit} items={usage?.byProvider ?? []} />
    </div>
  );
}
