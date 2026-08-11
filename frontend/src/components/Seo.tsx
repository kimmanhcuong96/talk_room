import { useEffect } from "react";
import type { Language } from "../lib/i18n";
import { infoPagePath } from "../lib/routes";

type SeoPage = "home" | "privacy" | "contact" | "about" | "room";

type SeoCopy = {
  homeTitle: string;
  homeDescription: string;
  privacyTitle: string;
  privacyDescription: string;
  contactTitle: string;
  contactDescription: string;
  aboutTitle: string;
  aboutDescription: string;
  roomTitle: string;
  roomDescription: string;
};

const seoCopies: Record<Language, SeoCopy> = {
  en: {
    homeTitle: "me2talk | Me to talk Language Practice",
    homeDescription: "Join me2talk, pronounced Me to talk, to practice languages, share your thoughts, and connect through live voice rooms.",
    privacyTitle: "Privacy Policy | me2talk",
    privacyDescription: "Learn how me2talk handles account, room, chat, audio, and video data while you use Me to talk.",
    contactTitle: "Contact Us | me2talk",
    contactDescription: "Contact the me2talk team for support, feedback, feature ideas, room reports, or partnership enquiries.",
    aboutTitle: "About me2talk | Me to talk",
    aboutDescription: "Discover me2talk, a welcoming space for language practice, meaningful conversations, and genuine connection.",
    roomTitle: "Conversation Room | me2talk",
    roomDescription: "Join a live Talking Room conversation to practice speaking, listen, chat, and connect with other language learners."
  },
  vi: {
    homeTitle: "me2talk | Me to talk luyện tập ngôn ngữ",
    homeDescription: "Tham gia me2talk, đọc là Me to talk, để luyện ngôn ngữ, tâm sự và kết nối qua các phòng trò chuyện trực tiếp.",
    privacyTitle: "Chính sách riêng tư | me2talk",
    privacyDescription: "Tìm hiểu cách me2talk xử lý dữ liệu tài khoản, phòng, trò chuyện, âm thanh và video khi bạn sử dụng Me to talk.",
    contactTitle: "Liên hệ | me2talk",
    contactDescription: "Liên hệ đội ngũ me2talk để được hỗ trợ, góp ý tính năng, báo cáo vấn đề trong phòng hoặc trao đổi hợp tác.",
    aboutTitle: "Về me2talk | Me to talk",
    aboutDescription: "Khám phá me2talk, không gian thân thiện để luyện tập ngôn ngữ, trò chuyện chân thành và tạo nên những kết nối ý nghĩa.",
    roomTitle: "Phòng trò chuyện | me2talk",
    roomDescription: "Tham gia phòng Talking Room trực tiếp để luyện nói, lắng nghe, nhắn tin và kết nối với những người học ngôn ngữ khác."
  },
  zh: {
    homeTitle: "me2talk | Me to talk 语言练习",
    homeDescription: "加入 me2talk（读作 Me to talk），通过实时语音房练习语言、分享心情并结识新朋友。",
    privacyTitle: "隐私政策 | me2talk",
    privacyDescription: "了解使用 Me to talk 时，me2talk 如何处理账户、房间、聊天、音频和视频数据。",
    contactTitle: "联系我们 | me2talk",
    contactDescription: "联系 me2talk 团队，获取支持、提出功能建议、报告房间问题或洽谈合作。",
    aboutTitle: "关于 me2talk | Me to talk",
    aboutDescription: "了解 me2talk：一个用于语言练习、真诚交流和建立有意义联系的友好空间。",
    roomTitle: "在线会话房 | me2talk",
    roomDescription: "加入 Talking Room 实时会话，练习口语、倾听、聊天并与其他语言学习者建立联系。"
  },
  ja: {
    homeTitle: "me2talk | Me to talk 語学練習",
    homeDescription: "me2talk（Me to talk）に参加して、ライブ音声ルームで語学を練習し、気持ちを共有し、人とつながりましょう。",
    privacyTitle: "プライバシーポリシー | me2talk",
    privacyDescription: "Me to talk の利用時に、me2talk がアカウント、ルーム、チャット、音声、映像データを扱う方法をご案内します。",
    contactTitle: "お問い合わせ | me2talk",
    contactDescription: "サポート、機能提案、ルーム内の問題報告、提携のご相談は me2talk チームへお問い合わせください。",
    aboutTitle: "me2talk について | Me to talk",
    aboutDescription: "me2talk は、語学練習、心の通う会話、有意義なつながりのための親しみやすい空間です。",
    roomTitle: "会話ルーム | me2talk",
    roomDescription: "Talking Room のライブ会話に参加して、スピーキング、リスニング、チャットを楽しみ、語学学習者とつながりましょう。"
  }
};

const localeByLanguage: Record<Language, string> = {
  en: "en_US",
  vi: "vi_VN",
  zh: "zh_CN",
  ja: "ja_JP"
};

function setMeta(selector: string, attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(selector);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export function Seo({ language, page, roomName }: { language: Language; page: SeoPage; roomName?: string }) {
  useEffect(() => {
    const copy = seoCopies[language];
    const pageTitle = page === "home"
      ? copy.homeTitle
      : page === "privacy"
        ? copy.privacyTitle
        : page === "contact"
          ? copy.contactTitle
          : page === "about"
            ? copy.aboutTitle
            : roomName
              ? `${roomName} | me2talk`
              : copy.roomTitle;
    const description = page === "home"
      ? copy.homeDescription
      : page === "privacy"
        ? copy.privacyDescription
        : page === "contact"
          ? copy.contactDescription
          : page === "about"
            ? copy.aboutDescription
            : copy.roomDescription;
    const configuredSiteUrl = import.meta.env.VITE_SITE_URL?.trim();
    const siteOrigin = configuredSiteUrl ? new URL(configuredSiteUrl).origin : window.location.origin;
    const canonicalUrl = new URL(window.location.pathname, siteOrigin).toString();
    const shouldIndex = page !== "room";

    document.title = pageTitle;
    document.documentElement.lang = language === "zh" ? "zh-CN" : language;
    setMeta('meta[name="description"]', "name", "description", description);
    setMeta('meta[name="robots"]', "name", "robots", shouldIndex ? "index, follow" : "noindex, nofollow");
    setMeta('meta[property="og:title"]', "property", "og:title", pageTitle);
    setMeta('meta[property="og:description"]', "property", "og:description", description);
    setMeta('meta[property="og:type"]', "property", "og:type", "website");
    setMeta('meta[property="og:url"]', "property", "og:url", canonicalUrl);
    setMeta('meta[property="og:locale"]', "property", "og:locale", localeByLanguage[language]);
    setMeta('meta[name="twitter:card"]', "name", "twitter:card", "summary");
    setMeta('meta[name="twitter:title"]', "name", "twitter:title", pageTitle);
    setMeta('meta[name="twitter:description"]', "name", "twitter:description", description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;

    const existingStructuredData = document.getElementById("me2talk-structured-data");
    existingStructuredData?.remove();
    if (page === "home") {
      const structuredData = document.createElement("script");
      structuredData.id = "me2talk-structured-data";
      structuredData.type = "application/ld+json";
      structuredData.text = JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            name: "me2talk",
            alternateName: ["Me to talk"],
            url: siteOrigin,
            description: copy.homeDescription,
            inLanguage: ["en", "vi", "zh-CN", "ja"]
          },
          {
            "@type": "WebApplication",
            name: "me2talk",
            alternateName: ["Me to talk"],
            applicationCategory: "CommunicationApplication",
            operatingSystem: "Web",
            url: siteOrigin,
            description: copy.homeDescription,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
          },
          {
            "@type": "ItemList",
            name: "me2talk pages",
            itemListElement: [
              { "@type": "SiteNavigationElement", position: 1, name: "About Us", url: new URL(infoPagePath("about"), siteOrigin).toString() },
              { "@type": "SiteNavigationElement", position: 2, name: "Privacy Policy", url: new URL(infoPagePath("privacy"), siteOrigin).toString() },
              { "@type": "SiteNavigationElement", position: 3, name: "Contact Us", url: new URL(infoPagePath("contact"), siteOrigin).toString() }
            ]
          }
        ]
      });
      document.head.appendChild(structuredData);
    }

    return () => {
      document.getElementById("me2talk-structured-data")?.remove();
    };
  }, [language, page, roomName]);

  return null;
}
