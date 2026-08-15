import { CheckCircle2, Clock3, Send, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { getVerificationRequest, submitVerificationRequest, type VerificationRequest } from "../lib/auth";
import { type Language, translate } from "../lib/i18n";

type VerificationRequestDialogProps = {
  open: boolean;
  token: string | undefined;
  language: Language;
  onClose: () => void;
  onSubmitted: (request: VerificationRequest) => void;
};

export function VerificationRequestDialog({ open, token, language, onClose, onSubmitted }: VerificationRequestDialogProps) {
  const [request, setRequest] = useState<VerificationRequest | null>(null);
  const [message, setMessage] = useState("");
  const [commitment, setCommitment] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const t = (key: Parameters<typeof translate>[1]) => translate(language, key);

  useEffect(() => {
    if (!open || !token) return;
    let cancelled = false;
    setRequest(null);
    setMessage("");
    setCommitment(false);
    setError(null);
    void getVerificationRequest(token).then((current) => {
      if (!cancelled) {
        setRequest(current);
        if (current) { setMessage(current.message); setCommitment(current.communityCommitment); }
      }
    }).catch(() => { if (!cancelled) setError(t("verificationRequestLoadFailed")); });
    return () => { cancelled = true; };
  }, [open, token, language]);

  if (!open) return null;
  const canSubmit = message.trim().length >= 20 && commitment && !loading;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) { setError(t("verificationRequestLogin")); return; }
    if (message.trim().length < 20 || !commitment) { setError(t("verificationRequestRequired")); return; }
    setLoading(true); setError(null);
    try {
      const created = await submitVerificationRequest(token, message.trim(), commitment);
      setRequest(created); onSubmitted(created);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t("verificationRequestFailed"));
    } finally { setLoading(false); }
  };

  return <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="verification-request-title" className="w-full max-w-lg rounded-xl border border-white/10 bg-panel p-5 text-white shadow-2xl shadow-black/50">
      <div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2 text-mint"><ShieldCheck size={19}/><h2 id="verification-request-title" className="text-lg font-semibold">{t("verificationRequestTitle")}</h2></div><p className="mt-2 text-sm leading-6 text-white/60">{t("verificationRequestIntro")}</p></div><button type="button" onClick={onClose} aria-label={t("closeDialog")} className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-white/55 hover:bg-white/10 hover:text-white"><X size={17}/></button></div>
      {request && request.status !== "rejected" ? <div className={`mt-5 rounded-lg border p-4 ${request.status === "pending" ? "border-amber-300/25 bg-amber-300/10" : "border-mint/25 bg-mint/10"}`}><div className="flex items-center gap-2 font-semibold">{request.status === "pending" ? <Clock3 size={17}/> : <CheckCircle2 size={17}/>} {t(request.status === "pending" ? "verificationRequestPending" : "verificationRequestApproved")}</div><p className="mt-2 text-sm text-white/65">{request.message}</p></div> : <form onSubmit={(event) => void submit(event)} className="mt-5 grid gap-4">{request?.status === "rejected" ? <p className="rounded-md border border-coral/25 bg-coral/10 p-3 text-sm text-coral">{t("verificationRequestRejected")}</p> : null}<label className="grid gap-2 text-sm font-medium">{t("verificationRequestMessage")}<textarea value={message} onChange={(event) => setMessage(event.target.value)} minLength={20} maxLength={2000} required rows={5} placeholder={t("verificationRequestMessagePlaceholder")} className="resize-y rounded-md border border-white/10 bg-field px-3 py-2 text-sm outline-none focus:border-mint"/><span className="text-right text-xs text-white/40">{message.length}/2000</span></label><label className="flex cursor-pointer items-start gap-3 rounded-md border border-white/10 bg-white/[0.03] p-3 text-sm text-white/75"><input type="checkbox" checked={commitment} onChange={(event) => setCommitment(event.target.checked)} className="mt-0.5 h-4 w-4 cursor-pointer accent-[#75f2b8]"/><span>{t("verificationRequestCommitment")}</span></label>{error ? <p role="alert" className="text-sm text-coral">{error}</p> : null}<button type="submit" disabled={!canSubmit} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-mint px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"><Send size={16}/>{loading ? t("verificationRequestSubmitting") : t("verificationRequestSubmit")}</button></form>}
      {request && error ? <p role="alert" className="mt-3 text-sm text-coral">{error}</p> : null}
    </section>
  </div>;
}
