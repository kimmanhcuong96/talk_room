import type { Language } from "../../lib/i18n";

type PresenceBotCopy = {
  title: string;
  description: (active: number) => string;
  totalLabel: string;
  save: string;
  saved: string;
  loadFailed: string;
  saveFailed: string;
};

const copies: Record<Language, PresenceBotCopy> = {
  en: {
    title: "Presence Bots",
    description: (active) => `Non-interactive room-presence pool. Active now: ${active}.`,
    totalLabel: "Total Presence Bots",
    save: "Save",
    saved: "Presence Bot setting updated.",
    loadFailed: "Could not load Presence Bot settings. Run migration 015.",
    saveFailed: "Could not update the Presence Bot setting."
  },
  vi: {
    title: "Bot hiện diện",
    description: (active) => `Nhóm bot chỉ dùng để tạo sự hiện diện trong phòng. Đang hoạt động: ${active}.`,
    totalLabel: "Tổng số bot hiện diện",
    save: "Lưu",
    saved: "Đã cập nhật cài đặt bot hiện diện.",
    loadFailed: "Không thể tải cài đặt bot hiện diện. Hãy chạy migration 015.",
    saveFailed: "Không thể cập nhật cài đặt bot hiện diện."
  },
  zh: {
    title: "在线占位机器人",
    description: (active) => `仅用于房间在线展示，不进行互动。当前活跃：${active}。`,
    totalLabel: "在线占位机器人总数",
    save: "保存",
    saved: "在线占位机器人设置已更新。",
    loadFailed: "无法加载在线占位机器人设置。请运行迁移 015。",
    saveFailed: "无法更新在线占位机器人设置。"
  },
  ja: {
    title: "プレゼンスボット",
    description: (active) => `ルームの在室表示専用で、ユーザーとは交流しません。現在稼働中：${active}。`,
    totalLabel: "プレゼンスボット総数",
    save: "保存",
    saved: "プレゼンスボット設定を更新しました。",
    loadFailed: "プレゼンスボット設定を読み込めません。マイグレーション 015 を実行してください。",
    saveFailed: "プレゼンスボット設定を更新できませんでした。"
  }
};

export function presenceBotCopy(language: Language) {
  return copies[language];
}
