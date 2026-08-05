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
    homeTitle: "Talking Room | 4MeTalk & For Me Talk Language Practice",
    homeDescription: "Join Talking Room, also known as 4MeTalk and For Me Talk, to practice languages, share your thoughts, and connect through live voice rooms.",
    privacyTitle: "Privacy Policy | Talking Room",
    privacyDescription: "Learn how Talking Room handles account, room, chat, audio, and video data while you use 4MeTalk and For Me Talk.",
    contactTitle: "Contact Us | Talking Room",
    contactDescription: "Contact the Talking Room team for support, feedback, feature ideas, room reports, or partnership enquiries.",
    aboutTitle: "About Talking Room | 4MeTalk & For Me Talk",
    aboutDescription: "Discover Talking Room, a welcoming space for language practice, meaningful conversations, and genuine connection.",
    roomTitle: "Conversation Room | Talking Room",
    roomDescription: "Join a live Talking Room conversation to practice speaking, listen, chat, and connect with other language learners."
  },
  vi: {
    homeTitle: "Talking Room | 4MeTalk & For Me Talk luyện tập ngôn ngữ",
    homeDescription: "Tham gia Talking Room, còn được biết đến với tên 4MeTalk và For Me Talk, để luyện ngôn ngữ, tâm sự và kết nối qua các phòng trò chuyện trực tiếp.",
    privacyTitle: "Chính sách riêng tư | Talking Room",
    privacyDescription: "Tìm hiểu cách Talking Room xử lý dữ liệu tài khoản, phòng, trò chuyện, âm thanh và video khi bạn sử dụng 4MeTalk và For Me Talk.",
    contactTitle: "Liên hệ | Talking Room",
    contactDescription: "Liên hệ đội ngũ Talking Room để được hỗ trợ, góp ý tính năng, báo cáo vấn đề trong phòng hoặc trao đổi hợp tác.",
    aboutTitle: "Về Talking Room | 4MeTalk & For Me Talk",
    aboutDescription: "Khám phá Talking Room, không gian thân thiện để luyện tập ngôn ngữ, trò chuyện chân thành và tạo nên những kết nối ý nghĩa.",
    roomTitle: "Phòng trò chuyện | Talking Room",
    roomDescription: "Tham gia phòng Talking Room trực tiếp để luyện nói, lắng nghe, nhắn tin và kết nối với những người học ngôn ngữ khác."
  },
  zh: {
    homeTitle: "Talking Room | 4MeTalk 与 For Me Talk 语言练习",
    homeDescription: "加入 Talking Room（也称为 4MeTalk 和 For Me Talk），通过实时语音房练习语言、分享心情并结识新朋友。",
    privacyTitle: "隐私政策 | Talking Room",
    privacyDescription: "了解使用 4MeTalk 和 For Me Talk 时，Talking Room 如何处理账户、房间、聊天、音频和视频数据。",
    contactTitle: "联系我们 | Talking Room",
    contactDescription: "联系 Talking Room 团队，获取支持、提出功能建议、报告房间问题或洽谈合作。",
    aboutTitle: "关于 Talking Room | 4MeTalk 与 For Me Talk",
    aboutDescription: "了解 Talking Room：一个用于语言练习、真诚交流和建立有意义联系的友好空间。",
    roomTitle: "在线会话房 | Talking Room",
    roomDescription: "加入 Talking Room 实时会话，练习口语、倾听、聊天并与其他语言学习者建立联系。"
  },
  ja: {
    homeTitle: "Talking Room | 4MeTalk・For Me Talk 語学練習",
    homeDescription: "Talking Room（4MeTalk、For Me Talk）に参加して、ライブ音声ルームで語学を練習し、気持ちを共有し、人とつながりましょう。",
    privacyTitle: "プライバシーポリシー | Talking Room",
    privacyDescription: "4MeTalk と For Me Talk の利用時に、Talking Room がアカウント、ルーム、チャット、音声、映像データを扱う方法をご案内します。",
    contactTitle: "お問い合わせ | Talking Room",
    contactDescription: "サポート、機能提案、ルーム内の問題報告、提携のご相談は Talking Room チームへお問い合わせください。",
    aboutTitle: "Talking Room について | 4MeTalk・For Me Talk",
    aboutDescription: "Talking Room は、語学練習、心の通う会話、有意義なつながりのための親しみやすい空間です。",
    roomTitle: "会話ルーム | Talking Room",
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
              ? `${roomName} | Talking Room`
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

    const existingStructuredData = document.getElementById("talking-room-structured-data");
    existingStructuredData?.remove();
    if (page === "home") {
      const structuredData = document.createElement("script");
      structuredData.id = "talking-room-structured-data";
      structuredData.type = "application/ld+json";
      structuredData.text = JSON.stringify({
        "@context": "https://schema.org",
        "@graph": [
          {
            "@type": "WebSite",
            name: "Talking Room",
            alternateName: ["4MeTalk", "For Me Talk"],
            url: siteOrigin,
            description: copy.homeDescription,
            inLanguage: ["en", "vi", "zh-CN", "ja"]
          },
          {
            "@type": "WebApplication",
            name: "Talking Room",
            alternateName: ["4MeTalk", "For Me Talk"],
            applicationCategory: "CommunicationApplication",
            operatingSystem: "Web",
            url: siteOrigin,
            description: copy.homeDescription,
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }
          },
          {
            "@type": "ItemList",
            name: "Talking Room pages",
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
      document.getElementById("talking-room-structured-data")?.remove();
    };
  }, [language, page, roomName]);

  return null;
}
