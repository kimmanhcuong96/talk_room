import type { Language } from "./i18n";

const copy = {
  en: ["User reports", "Review reports and confirm system-wide blocks.", "All statuses", "Pending", "Blocked", "Dismissed", "From", "To", "Apply filters", "Reporter", "Reported user", "Room / reason", "Reported at", "No reports found.", "Confirm block", "Dismiss", "Confirm a system-wide block for this user?", "Dismiss this report?"],
  vi: ["Báo cáo người dùng", "Xem báo cáo và xác nhận chặn trên toàn hệ thống.", "Tất cả trạng thái", "Chờ xử lý", "Đã chặn", "Đã bỏ qua", "Từ ngày", "Đến ngày", "Áp dụng bộ lọc", "Người báo cáo", "Người bị báo cáo", "Phòng / lý do", "Ngày báo cáo", "Không có báo cáo.", "Xác nhận chặn", "Bỏ qua", "Xác nhận chặn người dùng này trên toàn hệ thống?", "Bỏ qua báo cáo này?"],
  zh: ["用户举报", "审核举报并确认全站封禁。", "所有状态", "待处理", "已封禁", "已驳回", "开始日期", "结束日期", "应用筛选", "举报者", "被举报用户", "房间 / 原因", "举报时间", "没有举报。", "确认封禁", "驳回", "确认在全站封禁此用户？", "驳回此举报？"],
  ja: ["ユーザー報告", "報告を確認し、システム全体のブロックを確定します。", "すべての状態", "保留中", "ブロック済み", "却下済み", "開始日", "終了日", "フィルター適用", "報告者", "対象ユーザー", "ルーム / 理由", "報告日時", "報告はありません。", "ブロックを確定", "却下", "このユーザーをシステム全体でブロックしますか？", "この報告を却下しますか？"]
} satisfies Record<Language, string[]>;

export function adminModerationCopy(language: Language) {
  const [title, description, all, pending, blocked, dismissed, from, to, apply, reporter, target, context, date, empty, confirm, dismiss, confirmQuestion, dismissQuestion] = copy[language];
  return { title, description, all, pending, blocked, dismissed, from, to, apply, reporter, target, context, date, empty, confirm, dismiss, confirmQuestion, dismissQuestion };
}
