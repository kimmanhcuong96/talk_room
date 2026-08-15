import { Check, ChevronLeft, LoaderCircle, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getVerificationRequests, reviewVerificationRequest, type AdminVerificationRequest } from "../../lib/adminAuth";
import type { Language } from "../../lib/i18n";
import { adminPath } from "../../lib/routes";
import type { AdminTranslationKey } from "../../lib/adminI18n";

type Props = { token: string; language: Language; t: (key: AdminTranslationKey) => string };

export function VerificationRequestsPage({ token, t }: Props) {
  const [requests, setRequests] = useState<AdminVerificationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setRequests(await getVerificationRequests(token)); } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "REQUEST_FAILED"); } finally { setLoading(false); } }, [token]);
  useEffect(() => { void load(); }, [load]);
  const review = async (id: string, decision: "approved" | "rejected") => { try { await reviewVerificationRequest(token, id, decision); setRequests((current) => current.filter((item) => item.id !== id)); } catch (reviewError) { setError(reviewError instanceof Error ? reviewError.message : "REQUEST_FAILED"); } };
  return <div className="grid gap-5"><a href={adminPath()} className="inline-flex w-fit items-center gap-2 text-sm text-white/60 hover:text-white"><ChevronLeft size={16}/>{t("backToDashboard")}</a><div><h2 className="text-2xl font-semibold">{t("verificationRequests")}</h2><p className="mt-2 text-sm text-white/60">{t("verificationRequestsDescription")}</p></div>{error ? <p className="rounded-md border border-coral/30 bg-coral/10 px-4 py-3 text-sm text-coral">{error}</p> : null}{loading ? <p className="py-10 text-center text-white/50"><LoaderCircle className="mr-2 inline animate-spin" size={17}/>{t("loading")}</p> : requests.length === 0 ? <p className="rounded-lg border border-white/10 bg-panel px-4 py-10 text-center text-white/50">{t("noVerificationRequests")}</p> : <div className="grid gap-4">{requests.map((request) => <article key={request.id} className="rounded-lg border border-white/10 bg-panel p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="font-semibold">{request.displayName}</h3><p className="text-xs text-white/45">{request.email} · {new Date(request.createdAt).toLocaleString()}</p></div><span className="rounded-full bg-amber-300/15 px-2.5 py-1 text-xs text-amber-200">{request.status}</span></div><div className="mt-4 grid gap-2"><p className="text-xs uppercase tracking-wide text-white/45">{t("verificationMessage")}</p><p className="whitespace-pre-wrap rounded-md bg-white/[0.03] p-3 text-sm leading-6 text-white/80">{request.message}</p><p className="text-xs text-mint">{t("commitment")}: {request.communityCommitment ? "✓" : "—"}</p></div><div className="mt-4 flex justify-end gap-2"><button type="button" onClick={() => void review(request.id, "rejected")} className="inline-flex h-9 items-center gap-2 rounded-md bg-coral/15 px-3 text-xs font-semibold text-coral hover:bg-coral/25"><X size={15}/>{t("reject")}</button><button type="button" onClick={() => void review(request.id, "approved")} className="inline-flex h-9 items-center gap-2 rounded-md bg-mint px-3 text-xs font-semibold text-ink hover:bg-mint/90"><Check size={15}/>{t("approve")}</button></div></article>)}</div>}</div>;
}
