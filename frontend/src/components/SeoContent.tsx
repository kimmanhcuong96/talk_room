import { Globe2, MessageCircleHeart, UsersRound } from "lucide-react";
import type { Language } from "../lib/i18n";
import { infoPagePath, type InfoPage } from "../lib/routes";

type SeoContentCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  cards: Array<{ title: string; body: string; link: string; page: InfoPage }>;
};

const copyByLanguage: Record<Language, SeoContentCopy> = {
  en: {
    eyebrow: "Talk, practice, connect",
    title: "A Talking Room for every conversation",
    intro: "Whether you search for Talking Room, 4MeTalk, or For Me Talk, you will find the same welcoming place to practice languages and connect through real conversation.",
    cards: [
      { title: "Talking Room", body: "Join topic-based voice rooms, practice speaking naturally, listen to others, and build confidence one conversation at a time.", link: "Learn about Talking Room", page: "about" },
      { title: "4MeTalk language practice", body: "Use short, live conversations to turn vocabulary into practical communication with learners from different backgrounds.", link: "Read our privacy policy", page: "privacy" },
      { title: "For Me Talk connection", body: "Share what is on your mind, meet people with similar interests, and create meaningful connections in a simple online space.", link: "Contact the team", page: "contact" }
    ]
  },
  vi: {
    eyebrow: "Trò chuyện, luyện tập, kết nối",
    title: "Talking Room cho mọi cuộc trò chuyện",
    intro: "Dù bạn tìm Talking Room, 4MeTalk hay For Me Talk, bạn đều đến cùng một không gian thân thiện để luyện tập ngôn ngữ và kết nối qua những cuộc trò chuyện thật.",
    cards: [
      { title: "Talking Room", body: "Tham gia phòng thoại theo chủ đề, luyện nói tự nhiên, lắng nghe người khác và xây dựng sự tự tin qua từng cuộc trò chuyện.", link: "Tìm hiểu về Talking Room", page: "about" },
      { title: "4MeTalk luyện tập ngôn ngữ", body: "Biến vốn từ thành khả năng giao tiếp thực tế qua những cuộc trò chuyện trực tiếp, ngắn gọn với người học từ nhiều nơi.", link: "Đọc chính sách riêng tư", page: "privacy" },
      { title: "For Me Talk kết nối", body: "Chia sẻ điều bạn đang nghĩ, gặp những người có cùng sở thích và tạo nên kết nối ý nghĩa trong một không gian trực tuyến đơn giản.", link: "Liên hệ đội ngũ", page: "contact" }
    ]
  },
  zh: {
    eyebrow: "交流、练习、连接",
    title: "适合每一次交流的 Talking Room",
    intro: "无论你搜索 Talking Room、4MeTalk 还是 For Me Talk，都能来到同一个友好空间，通过真实对话练习语言并结识他人。",
    cards: [
      { title: "Talking Room", body: "加入主题语音房，自然练习口语、倾听他人，并在每一次交流中增强自信。", link: "了解 Talking Room", page: "about" },
      { title: "4MeTalk 语言练习", body: "通过简短的实时对话，把词汇转化为实用的沟通能力，并与来自不同背景的学习者交流。", link: "阅读隐私政策", page: "privacy" },
      { title: "For Me Talk 连接", body: "分享你的想法，认识兴趣相投的人，在简单的在线空间中建立有意义的联系。", link: "联系我们", page: "contact" }
    ]
  },
  ja: {
    eyebrow: "話す、練習する、つながる",
    title: "あらゆる会話のための Talking Room",
    intro: "Talking Room、4MeTalk、For Me Talk のどの名前で検索しても、実際の会話を通じて語学を練習し、人とつながれる同じ温かな場所にたどり着きます。",
    cards: [
      { title: "Talking Room", body: "テーマ別の音声ルームに参加し、自然な会話を練習しながら人の話を聞き、会話ごとに自信を育てます。", link: "Talking Room について", page: "about" },
      { title: "4MeTalk 語学練習", body: "短いライブ会話を通じて、語彙を実践的なコミュニケーション力に変え、さまざまな背景の学習者と交流できます。", link: "プライバシーポリシー", page: "privacy" },
      { title: "For Me Talk のつながり", body: "思っていることを共有し、同じ関心を持つ人と出会い、シンプルなオンライン空間で有意義なつながりを築きます。", link: "お問い合わせ", page: "contact" }
    ]
  }
};

const icons = [Globe2, MessageCircleHeart, UsersRound];

export function SeoContent({ language, onOpenInfoPage }: { language: Language; onOpenInfoPage: (page: InfoPage) => void }) {
  const copy = copyByLanguage[language];

  return (
    <section aria-labelledby="discover-talking-room" className="border-t border-white/10 py-10">
      <p className="text-sm font-semibold uppercase tracking-widest text-mint">{copy.eyebrow}</p>
      <h2 id="discover-talking-room" className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">{copy.title}</h2>
      <p className="mt-4 max-w-3xl leading-7 text-white/65">{copy.intro}</p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {copy.cards.map((card, index) => {
          const Icon = icons[index];
          return (
            <article key={card.title} className="rounded-lg border border-white/10 bg-panel p-5">
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-mint/10 text-mint"><Icon size={22} aria-hidden="true" /></span>
              <h3 className="mt-5 text-xl font-semibold text-white">{card.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/62">{card.body}</p>
              <a
                href={infoPagePath(card.page)}
                onClick={(event) => { event.preventDefault(); onOpenInfoPage(card.page); }}
                className="mt-5 inline-flex text-sm font-semibold text-mint transition hover:text-mint/80 hover:underline"
              >
                {card.link}
              </a>
            </article>
          );
        })}
      </div>
    </section>
  );
}
