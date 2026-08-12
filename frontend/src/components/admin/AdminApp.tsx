import { ArrowLeft, BarChart3, Bot, BrainCircuit, ChevronLeft, ChevronRight, Flag, LoaderCircle, LogOut, ShieldCheck, UserCog, Users } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  clearAdminToken,
  AdminRequestError,
  createAdminInvite,
  getAdminMe,
  getAdminUsers,
  getManagedUsers,
  readAdminToken,
  refreshAdminSession,
  setAdminAccount,
  setManagedUserRole,
  suspendAdminAccount,
  storeAdminToken,
  type AdminProfile,
  type AdminRole,
  type AdminSession,
  type AdminStatus,
  type ManagedUser
} from "../../lib/adminAuth";
import { readStoredToken, storeApplicationToken } from "../../lib/auth";
import { adminTranslate, type AdminTranslationKey } from "../../lib/adminI18n";
import type { UserRole } from "../../lib/auth";
import { isLanguage, type Language } from "../../lib/i18n";
import { adminPath, getAdminPageFromPath, homePath } from "../../lib/routes";
import { ReportsPage } from "./ReportsPage";
import { adminModerationCopy } from "../../lib/adminModerationI18n";
import { adminAnalyticsCopy } from "../../lib/adminAnalyticsI18n";
import { VirtualUsersPage } from "./VirtualUsersSettings";
import { UsageAnalyticsPage } from "./UsageAnalyticsPage";
import { AdminReloadButton } from "./AdminReloadButton";
import { LLMUsagePage } from "./LLMUsagePage";

const LANGUAGE_STORAGE_KEY = "me2talk:language";
const LEGACY_LANGUAGE_STORAGE_KEY = "english-talk-rooms:language";

function getAdminLanguage(): Language {
  const value = localStorage.getItem(LANGUAGE_STORAGE_KEY) ?? localStorage.getItem(LEGACY_LANGUAGE_STORAGE_KEY);
  if (value) {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, value);
  }
  return isLanguage(value) ? value : "en";
}

function formatDate(value: string | null, language: Language) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(language, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

type Translator = (key: AdminTranslationKey, values?: Record<string, string | number>) => string;

function localizeAdminError(error: unknown, t: Translator) {
  const message = error instanceof Error ? error.message : "ADMIN_REQUEST_FAILED";
  if (message.includes("has not been invited")) return t("adminNotInvited");
  if (message.includes("account is suspended")) return t("adminSuspended");
  if (message.includes("linked to another Google account")) return t("googleAccountConflict");
  if (message.includes("already exists")) return t("adminAlreadyExists");
  if (message.includes("change your own admin")) return t("cannotChangeSelf");
  if (message.includes("last active owner")) return t("lastOwnerProtected");
  if (message.includes("Owner permission") || message.includes("permission")) return t("accessDenied");
  return message === "ADMIN_REQUEST_FAILED" ? t("requestFailed") : message;
}

function ErrorNotice({ error }: { error: string | null }) {
  return error ? <div className="rounded-md border border-coral/40 bg-coral/15 px-4 py-3 text-sm text-coral">{error}</div> : null;
}

function AdminLayout({ session, title, t, onSignOut, children }: {
  session: AdminSession;
  title: string;
  t: Translator;
  onSignOut: () => void;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-ink text-white">
      <header className="border-b border-white/10 bg-panel/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center rounded-lg bg-mint/15 text-mint"><ShieldCheck size={21} /></span>
            <div><p className="text-xs font-semibold uppercase tracking-widest text-mint">{t("adminArea")}</p><h1 className="text-xl font-semibold">{title}</h1></div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="max-w-64 truncate rounded-md bg-white/5 px-3 py-2 text-white/65">{session.admin.email} · {t(session.admin.role)}</span>
            <a href={homePath()} className="inline-flex h-9 items-center gap-2 rounded-md bg-white/5 px-3 text-white/70 hover:bg-white/10"><ArrowLeft size={15} />{t("backToSite")}</a>
            <button type="button" onClick={onSignOut} className="inline-flex h-9 items-center gap-2 rounded-md bg-coral/15 px-3 text-coral hover:bg-coral/25"><LogOut size={15} />{t("signOut")}</button>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </main>
  );
}

function Dashboard({ session, t }: { session: AdminSession; t: Translator }) {
  const moderation = adminModerationCopy(getAdminLanguage());
  const cards = [
    { page: "users" as const, icon: Users, title: t("userManagement"), description: t("userManagementDescription"), allowed: true },
    { page: "virtual-users" as const, icon: Bot, title: "Virtual Users", description: "Manage the 15 fixed chat bot profiles and view their live room status.", allowed: true },
    { page: "llm-usage" as const, icon: BrainCircuit, title: "LLM Usage", description: "Monitor Virtual User LLM requests, token usage, providers, and models.", allowed: true },
    { page: "reports" as const, icon: Flag, title: moderation.title, description: moderation.description, allowed: true },
    { page: "analytics" as const, icon: BarChart3, title: adminAnalyticsCopy(getAdminLanguage()).title, description: adminAnalyticsCopy(getAdminLanguage()).description, allowed: true },
    { page: "admins" as const, icon: UserCog, title: t("adminManagement"), description: t("adminManagementDescription"), allowed: session.admin.role === "owner" }
  ];
  return (
    <div>
      <p className="mb-6 text-white/60">{t("dashboardDescription")}</p>
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon;
          const content = <><div className="flex items-start justify-between"><span className="grid h-12 w-12 place-items-center rounded-lg bg-[#258ff4]/15 text-[#55aaff]"><Icon size={24} /></span>{!card.allowed ? <span className="rounded-full bg-[#ffd84d]/15 px-3 py-1 text-xs font-semibold text-[#ffd84d]">{t("ownerOnly")}</span> : null}</div><h2 className="mt-5 text-xl font-semibold">{card.title}</h2><p className="mt-2 leading-6 text-white/60">{card.description}</p><span className="mt-6 inline-flex items-center gap-2 font-semibold text-mint">{card.allowed ? t("manage") : t("accessDenied")}</span></>;
          return card.allowed
            ? <a key={card.page} href={adminPath(card.page)} className="rounded-xl border border-white/10 bg-panel p-6 shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:border-mint/35">{content}</a>
            : <section key={card.page} className="rounded-xl border border-white/8 bg-panel/60 p-6 opacity-65">{content}</section>;
        })}
      </div>
    </div>
  );
}

const userRoles: UserRole[] = ["unverified", "verified", "supporter"];

function userRoleLabel(role: UserRole, t: Translator) {
  return t(role === "supporter" ? "userRoleSupporter" : role === "verified" ? "userRoleVerified" : "userRoleUnverified");
}

function UsersPage({ session, language, t }: { session: AdminSession; language: Language; t: Translator }) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pages = Math.max(1, Math.ceil(total / 20));

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const result = await getManagedUsers(session.token, { page, search, role });
      setUsers(result.items); setTotal(result.total);
    } catch (loadError) { setError(localizeAdminError(loadError, t)); }
    finally { setLoading(false); }
  }, [page, role, search, session.token]);

  useEffect(() => { void load(); }, [load]);

  const updateRole = async (user: ManagedUser, nextRole: UserRole) => {
    setError(null);
    try {
      const updated = await setManagedUserRole(session.token, user.id, nextRole);
      setUsers((current) => current.map((item) => item.id === updated.id ? updated : item));
    } catch (updateError) { setError(localizeAdminError(updateError, t)); }
  };

  return (
    <div className="grid gap-5">
      <a href={adminPath()} className="inline-flex w-fit items-center gap-2 text-sm text-white/60 hover:text-white"><ChevronLeft size={16} />{t("backToDashboard")}</a>
      <form className="flex flex-col gap-3 rounded-lg border border-white/10 bg-panel p-4 sm:flex-row" onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}>
        <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder={t("searchUsers")} className="h-10 min-w-0 flex-1 rounded-md border border-white/10 bg-field px-3 text-sm outline-none focus:border-mint" />
        <select value={role} onChange={(event) => { setRole(event.target.value); setPage(1); }} className="h-10 rounded-md border border-white/10 bg-field px-3 text-sm outline-none"><option value="">{t("allRoles")}</option>{userRoles.map((value) => <option key={value} value={value}>{userRoleLabel(value, t)}</option>)}</select>
        <button className="h-10 rounded-md bg-[#258ff4] px-5 text-sm font-semibold hover:bg-[#1d7edb]">{t("search")}</button>
      </form>
      <div className="flex justify-end"><AdminReloadButton language={language} loading={loading} onClick={() => void load()} /></div>
      <ErrorNotice error={error} />
      <div className="overflow-x-auto rounded-lg border border-white/10 bg-panel">
        <table className="w-full min-w-[850px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-white/45"><tr><th className="px-4 py-3">{t("account")}</th><th className="px-4 py-3">{t("role")}</th><th className="px-4 py-3">{t("createdAt")}</th><th className="px-4 py-3">{t("lastLogin")}</th></tr></thead>
          <tbody className="divide-y divide-white/8">
            {loading ? <tr><td colSpan={4} className="px-4 py-10 text-center text-white/50"><LoaderCircle className="mr-2 inline animate-spin" size={17} />{t("loading")}</td></tr> : null}
            {!loading && users.length === 0 ? <tr><td colSpan={4} className="px-4 py-10 text-center text-white/50">{t("noUsers")}</td></tr> : null}
            {!loading && users.map((user) => <tr key={user.id} className="hover:bg-white/[0.025]"><td className="px-4 py-3"><div className="font-medium">{user.displayName}</div><div className="mt-1 text-xs text-white/45">{user.email}</div></td><td className="px-4 py-3"><select value={user.role} onChange={(event) => void updateRole(user, event.target.value as UserRole)} className="h-9 rounded-md border border-white/10 bg-field px-2 outline-none focus:border-mint">{userRoles.map((value) => <option key={value} value={value}>{userRoleLabel(value, t)}</option>)}</select></td><td className="px-4 py-3 text-white/60">{formatDate(user.createdAt, language)}</td><td className="px-4 py-3 text-white/60">{formatDate(user.lastLogin, language)}</td></tr>)}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-sm"><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="inline-flex h-9 items-center gap-2 rounded-md bg-white/5 px-3 disabled:opacity-35"><ChevronLeft size={15} />{t("previous")}</button><span className="text-white/55">{t("pageOf", { page, pages })}</span><button disabled={page >= pages} onClick={() => setPage((value) => value + 1)} className="inline-flex h-9 items-center gap-2 rounded-md bg-white/5 px-3 disabled:opacity-35">{t("next")}<ChevronRight size={15} /></button></div>
    </div>
  );
}

function AdminRow({ item, currentAdminId, language, t, onSaved, onError, token }: { item: AdminProfile; currentAdminId: string; language: Language; t: Translator; token: string; onSaved: (admin: AdminProfile) => void; onError: (error: string) => void }) {
  const [role, setRole] = useState<AdminRole>(item.role);
  const [status, setStatus] = useState<AdminStatus>(item.status);
  const [saving, setSaving] = useState(false);
  const isSelf = item.id === currentAdminId;
  const save = async () => { setSaving(true); try { onSaved(await setAdminAccount(token, item.id, { role, status })); } catch (error) { onError(localizeAdminError(error, t)); } finally { setSaving(false); } };
  const suspend = async () => { if (!window.confirm(t("confirmSuspend"))) return; setSaving(true); try { onSaved(await suspendAdminAccount(token, item.id)); setStatus("suspended"); } catch (error) { onError(localizeAdminError(error, t)); } finally { setSaving(false); } };
  return <tr className="hover:bg-white/[0.025]"><td className="px-4 py-3"><div className="font-medium">{item.displayName || item.email}</div><div className="mt-1 text-xs text-white/45">{item.email}</div></td><td className="px-4 py-3"><select disabled={isSelf} value={role} onChange={(event) => setRole(event.target.value as AdminRole)} className="h-9 rounded-md border border-white/10 bg-field px-2 disabled:opacity-45"><option value="admin">{t("admin")}</option><option value="owner">{t("owner")}</option></select></td><td className="px-4 py-3"><select disabled={isSelf} value={status} onChange={(event) => setStatus(event.target.value as AdminStatus)} className="h-9 rounded-md border border-white/10 bg-field px-2 disabled:opacity-45"><option value="invited">{t("invited")}</option><option value="active">{t("active")}</option><option value="suspended">{t("suspended")}</option></select></td><td className="px-4 py-3 text-white/60">{formatDate(item.lastLogin, language)}</td><td className="px-4 py-3"><div className="flex gap-2"><button disabled={isSelf || saving || (role === item.role && status === item.status)} onClick={() => void save()} className="h-8 rounded-md bg-mint px-3 text-xs font-semibold text-ink disabled:opacity-35">{t("save")}</button><button disabled={isSelf || saving || item.status === "suspended"} onClick={() => void suspend()} className="h-8 rounded-md bg-coral/15 px-3 text-xs font-semibold text-coral disabled:opacity-35">{t("suspend")}</button></div></td></tr>;
}

function AdminsPage({ session, language, t }: { session: AdminSession; language: Language; t: Translator }) {
  const [admins, setAdmins] = useState<AdminProfile[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<AdminRole>("admin");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => { setLoading(true); setError(null); try { setAdmins(await getAdminUsers(session.token)); } catch (loadError) { setError(localizeAdminError(loadError, t)); } finally { setLoading(false); } }, [session.token, t]);
  useEffect(() => { void load(); }, [load]);
  const invite = async (event: FormEvent) => { event.preventDefault(); setError(null); try { const created = await createAdminInvite(session.token, email.trim(), role); setAdmins((current) => [created, ...current]); setEmail(""); setRole("admin"); } catch (inviteError) { setError(localizeAdminError(inviteError, t)); } };
  const update = (admin: AdminProfile) => setAdmins((current) => current.map((item) => item.id === admin.id ? admin : item));

  return <div className="grid gap-5"><a href={adminPath()} className="inline-flex w-fit items-center gap-2 text-sm text-white/60 hover:text-white"><ChevronLeft size={16} />{t("backToDashboard")}</a><form onSubmit={(event) => void invite(event)} className="grid gap-3 rounded-lg border border-white/10 bg-panel p-4 md:grid-cols-[1fr_160px_auto]"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={t("email")} className="h-10 rounded-md border border-white/10 bg-field px-3 text-sm outline-none focus:border-mint" /><select value={role} onChange={(event) => setRole(event.target.value as AdminRole)} className="h-10 rounded-md border border-white/10 bg-field px-3"><option value="admin">{t("admin")}</option><option value="owner">{t("owner")}</option></select><button className="h-10 rounded-md bg-[#258ff4] px-5 text-sm font-semibold hover:bg-[#1d7edb]">{t("inviteAdmin")}</button></form><div className="flex justify-end"><AdminReloadButton language={language} loading={loading} onClick={() => void load()} /></div><ErrorNotice error={error} /><div className="overflow-x-auto rounded-lg border border-white/10 bg-panel"><table className="w-full min-w-[920px] text-left text-sm"><thead className="border-b border-white/10 bg-white/[0.03] text-xs uppercase tracking-wide text-white/45"><tr><th className="px-4 py-3">{t("account")}</th><th className="px-4 py-3">{t("role")}</th><th className="px-4 py-3">{t("status")}</th><th className="px-4 py-3">{t("lastLogin")}</th><th className="px-4 py-3">{t("actions")}</th></tr></thead><tbody className="divide-y divide-white/8">{loading ? <tr><td colSpan={5} className="px-4 py-10 text-center text-white/50"><LoaderCircle className="mr-2 inline animate-spin" size={17} />{t("loading")}</td></tr> : null}{!loading && admins.length === 0 ? <tr><td colSpan={5} className="px-4 py-10 text-center text-white/50">{t("noAdmins")}</td></tr> : null}{!loading && admins.map((item) => <AdminRow key={item.id} item={item} currentAdminId={session.admin.id} language={language} t={t} token={session.token} onSaved={update} onError={setError} />)}</tbody></table></div></div>;
}

export function AdminApp() {
  const language = useMemo(getAdminLanguage, []);
  const page = getAdminPageFromPath() ?? "dashboard";
  const t = useCallback<Translator>((key, values) => adminTranslate(language, key, values), [language]);
  const [session, setSession] = useState<AdminSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const acceptSession = (nextSession: AdminSession) => {
      if (cancelled) return;
      if (page === "admins" && nextSession.admin.role !== "owner") {
        window.location.replace(adminPath());
        return;
      }
      storeAdminToken(nextSession.token);
      setSession(nextSession);
      setLoading(false);
    };

    const restoreSession = async () => {
      const adminToken = readAdminToken();
      if (adminToken) {
        try {
          acceptSession({ token: adminToken, admin: await getAdminMe(adminToken) });
          return;
        } catch {
          // Fall through and renew from the still-valid application session.
        }
      }

      const applicationToken = readStoredToken();
      if (applicationToken) {
        try {
          const refreshed = await refreshAdminSession(applicationToken);
          storeApplicationToken(refreshed.applicationToken);
          acceptSession(refreshed);
          return;
        } catch {
          // The application session or admin access is no longer valid.
        }
      }

      if (!cancelled) {
        clearAdminToken();
        window.location.replace(homePath());
      }
    };

    void restoreSession();
    return () => {
      cancelled = true;
    };
  }, [page]);

  useEffect(() => {
    if (!session) return;
    let refreshing = false;

    const renewSession = async () => {
      if (refreshing) return;
      const applicationToken = readStoredToken();
      if (!applicationToken) {
        clearAdminToken();
        window.location.replace(homePath());
        return;
      }

      refreshing = true;
      try {
        const nextSession = await refreshAdminSession(applicationToken);
        if (page === "admins" && nextSession.admin.role !== "owner") {
          window.location.replace(adminPath());
          return;
        }
        storeAdminToken(nextSession.token);
        storeApplicationToken(nextSession.applicationToken);
        setSession(nextSession);
      } catch (error) {
        if (error instanceof AdminRequestError && (error.status === 401 || error.status === 403)) {
          clearAdminToken();
          window.location.replace(homePath());
        }
      } finally {
        refreshing = false;
      }
    };

    const interval = window.setInterval(() => void renewSession(), 30 * 60 * 1000);
    const handleFocus = () => void renewSession();
    window.addEventListener("focus", handleFocus);
    void renewSession();
    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [page, session?.admin.id]);

  if (loading) return <main className="grid min-h-screen place-items-center bg-ink text-white"><LoaderCircle size={28} className="animate-spin text-mint" /></main>;
  if (!session) return <main className="grid min-h-screen place-items-center bg-ink text-white"><LoaderCircle size={28} className="animate-spin text-mint" /></main>;

  const signOut = () => { clearAdminToken(); setSession(null); };
  const pageTitle = page === "users" ? t("userManagement") : page === "virtual-users" ? "Virtual Users" : page === "llm-usage" ? "LLM Usage" : page === "admins" ? t("adminManagement") : page === "reports" ? adminModerationCopy(language).title : page === "analytics" ? adminAnalyticsCopy(language).title : t("adminArea");
  let content: ReactNode = <Dashboard session={session} t={t} />;
  if (page === "users") content = <UsersPage session={session} language={language} t={t} />;
  if (page === "admins") content = <AdminsPage session={session} language={language} t={t} />;
  if (page === "reports") content = <ReportsPage session={session} language={language} backLabel={t("backToDashboard")} previousLabel={t("previous")} nextLabel={t("next")} loadingLabel={t("loading")} pageLabel={(current, pages) => t("pageOf", { page: current, pages })} />;
  if (page === "virtual-users") content = <VirtualUsersPage token={session.token} language={language} />;
  if (page === "llm-usage") content = <LLMUsagePage token={session.token} language={language} />;
  if (page === "analytics") content = <UsageAnalyticsPage token={session.token} language={language} />;
  return <AdminLayout session={session} title={pageTitle} t={t} onSignOut={signOut}>{content}</AdminLayout>;
}
