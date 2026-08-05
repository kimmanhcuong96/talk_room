import { ArrowLeft, BookOpen, HeartHandshake, Languages, Mail, MessageCircle, ShieldCheck, Sparkles, Users } from "lucide-react";
import type { ReactNode } from "react";
import { type InfoPageCopy, type Language, infoPageCopies, translate } from "../lib/i18n";
import type { InfoPage as InfoPageName } from "../lib/routes";

type InfoPageProps = {
  page: InfoPageName;
  language: Language;
  onBack: () => void;
};

const email = "kimmanhcuong96@gmail.com";

function PrivacyContent({ copy }: { copy: NonNullable<InfoPageCopy["privacy"]> }) {
  return (
    <>
      <div className="rounded-lg border border-mint/20 bg-mint/10 p-4 text-sm leading-6 text-white/80">
        <strong className="text-mint">{copy.summaryLabel}</strong> {copy.summary}
      </div>
      <p className="mt-5 text-sm text-white/45">{copy.updated}</p>
      <div className="mt-8 grid gap-8">
        {copy.sections.map(({ heading, body }) => (
          <section key={heading}>
            <h2 className="text-xl font-semibold text-white">{heading}</h2>
            <p className="mt-3 leading-7 text-white/68">{body}</p>
          </section>
        ))}
      </div>
    </>
  );
}

function ContactContent({ copy }: { copy: NonNullable<InfoPageCopy["contact"]> }) {
  return (
    <div className="grid gap-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>
        <h2 className="text-xl font-semibold text-white">{copy.heading}</h2>
        <p className="mt-3 max-w-xl leading-7 text-white/68">{copy.body}</p>
      </div>
      <a
        href={`mailto:${email}?subject=${encodeURIComponent(copy.subject)}`}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-mint px-5 text-sm font-semibold text-ink transition hover:bg-mint/90"
      >
        <Mail size={18} />
        {copy.action}
      </a>
      <a className="sm:col-span-2 break-all rounded-lg border border-white/10 bg-field p-5 text-lg font-medium text-mint hover:underline" href={`mailto:${email}`}>
        {email}
      </a>
      <p className="sm:col-span-2 text-sm leading-6 text-white/45">{copy.safetyNote}</p>
    </div>
  );
}

const aboutIcons = {
  languages: Languages,
  heart: HeartHandshake,
  users: Users
} as const;

function AboutContent({ copy }: { copy: NonNullable<InfoPageCopy["about"]> }) {
  return (
    <>
      <div className="grid gap-4 md:grid-cols-3">
        {copy.cards.map((card) => {
          const Icon = aboutIcons[card.icon];

          return (
            <article key={card.heading} className="rounded-lg border border-white/10 bg-field p-5">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-mint/12 text-mint">
                <Icon size={22} />
              </span>
              <h2 className="mt-5 text-lg font-semibold text-white">{card.heading}</h2>
              <p className="mt-3 text-sm leading-6 text-white/62">{card.body}</p>
            </article>
          );
        })}
      </div>
      <section className="mt-10 border-l-2 border-mint pl-5">
        <h2 className="text-2xl font-semibold text-white">{copy.statementHeading}</h2>
        <p className="mt-4 leading-7 text-white/68">{copy.statementBody}</p>
      </section>
      <section className="mt-10 rounded-lg bg-gradient-to-br from-[#173328] to-[#152536] p-6 sm:p-8">
        <div className="flex items-center gap-3 text-mint">
          <Sparkles size={22} />
          <span className="text-sm font-semibold uppercase tracking-widest">{copy.highlightLabel}</span>
        </div>
        <p className="mt-4 text-xl leading-8 text-white">{copy.highlightBody}</p>
      </section>
    </>
  );
}

function renderContent(page: InfoPageName, copy: InfoPageCopy): ReactNode {
  if (page === "privacy" && copy.privacy) {
    return <PrivacyContent copy={copy.privacy} />;
  }

  if (page === "contact" && copy.contact) {
    return <ContactContent copy={copy.contact} />;
  }

  if (page === "about" && copy.about) {
    return <AboutContent copy={copy.about} />;
  }

  return null;
}

export function InfoPage({ page, language, onBack }: InfoPageProps) {
  const current = infoPageCopies[language][page];
  const HeroIcon = page === "privacy" ? ShieldCheck : page === "contact" ? MessageCircle : BookOpen;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-8 text-white sm:px-6 lg:px-8">
      <button type="button" onClick={onBack} className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white/75 transition hover:bg-white/10">
        <ArrowLeft size={17} />
        {translate(language, "backToRooms")}
      </button>
      <header className="mt-10 border-b border-white/10 pb-10">
        <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-mint">
          <HeroIcon size={19} />
          {current.eyebrow}
        </div>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight sm:text-5xl">{current.title}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-white/68">{current.intro}</p>
      </header>
      <div className="py-10">{renderContent(page, current)}</div>
    </main>
  );
}
