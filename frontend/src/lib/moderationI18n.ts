import type { Language } from "./i18n";

export type ModerationCopyKey =
  | "safety" | "safetyDescription" | "report" | "block" | "reason" | "details" | "detailsPlaceholder"
  | "submitReport" | "noParticipants" | "confirmBlock" | "reportSent" | "userBlocked" | "moderationFailed"
  | "roomBlocked" | "globalBlocked" | "harassment" | "hate_speech" | "sexual_content" | "spam" | "impersonation" | "other";

const copy: Record<Language, Record<ModerationCopyKey, string>> = {
  en: {
    safety: "Safety", safetyDescription: "Report harmful behavior or manage this room.", report: "Report", block: "Block from room",
    reason: "Reason", details: "Details (optional)", detailsPlaceholder: "Add concise context for the moderation team...", submitReport: "Submit report",
    noParticipants: "No other participants are in the room.", confirmBlock: "Block this person from this room?", reportSent: "Report submitted for review.",
    userBlocked: "The user was blocked from this room.", moderationFailed: "The moderation action could not be completed.",
    roomBlocked: "You are blocked from this room.", globalBlocked: "Your access to all rooms has been blocked.", harassment: "Harassment or bullying",
    hate_speech: "Hate speech", sexual_content: "Sexual or inappropriate content", spam: "Spam or scams", impersonation: "Impersonation", other: "Other"
  },
  vi: {
    safety: "An toàn", safetyDescription: "Báo cáo hành vi xấu hoặc quản lý phòng này.", report: "Báo cáo", block: "Chặn khỏi phòng",
    reason: "Lý do", details: "Chi tiết (không bắt buộc)", detailsPlaceholder: "Cung cấp ngữ cảnh ngắn gọn cho đội ngũ kiểm duyệt...", submitReport: "Gửi báo cáo",
    noParticipants: "Hiện không có người tham gia nào khác.", confirmBlock: "Chặn người này khỏi phòng?", reportSent: "Đã gửi báo cáo để xem xét.",
    userBlocked: "Người dùng đã bị chặn khỏi phòng.", moderationFailed: "Không thể hoàn tất thao tác kiểm duyệt.",
    roomBlocked: "Bạn đã bị chặn khỏi phòng này.", globalBlocked: "Bạn đã bị chặn truy cập tất cả phòng.", harassment: "Quấy rối hoặc bắt nạt",
    hate_speech: "Ngôn từ thù ghét", sexual_content: "Nội dung tình dục hoặc không phù hợp", spam: "Spam hoặc lừa đảo", impersonation: "Mạo danh", other: "Khác"
  },
  zh: {
    safety: "安全", safetyDescription: "举报不良行为或管理此房间。", report: "举报", block: "禁止进入房间", reason: "原因",
    details: "详情（可选）", detailsPlaceholder: "为审核团队提供简要信息……", submitReport: "提交举报", noParticipants: "房间内没有其他参与者。",
    confirmBlock: "禁止此人进入该房间？", reportSent: "举报已提交审核。", userBlocked: "该用户已被禁止进入房间。", moderationFailed: "无法完成审核操作。",
    roomBlocked: "你已被禁止进入此房间。", globalBlocked: "你已被禁止进入所有房间。", harassment: "骚扰或欺凌", hate_speech: "仇恨言论",
    sexual_content: "色情或不当内容", spam: "垃圾信息或诈骗", impersonation: "冒充他人", other: "其他"
  },
  ja: {
    safety: "安全", safetyDescription: "迷惑行為を報告、またはこのルームを管理します。", report: "報告", block: "ルームからブロック", reason: "理由",
    details: "詳細（任意）", detailsPlaceholder: "モデレーション担当者向けに簡潔な状況を入力…", submitReport: "報告を送信", noParticipants: "他の参加者はいません。",
    confirmBlock: "このユーザーをルームからブロックしますか？", reportSent: "報告を審査に送信しました。", userBlocked: "ユーザーをルームからブロックしました。",
    moderationFailed: "モデレーション操作を完了できませんでした。", roomBlocked: "このルームへの参加がブロックされています。", globalBlocked: "すべてのルームへの参加がブロックされています。",
    harassment: "嫌がらせ・いじめ", hate_speech: "ヘイトスピーチ", sexual_content: "性的・不適切な内容", spam: "スパム・詐欺", impersonation: "なりすまし", other: "その他"
  }
};

export function moderationTranslate(language: Language, key: ModerationCopyKey) {
  return copy[language][key];
}
