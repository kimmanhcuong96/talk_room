import type { Language } from "./i18n";

export type AdminTranslationKey =
  | "accessDenied" | "account" | "actions" | "active" | "admin" | "adminAlreadyExists" | "adminArea" | "adminLoginDescription"
  | "adminManagement" | "adminManagementDescription" | "allRoles" | "backToDashboard" | "backToSite" | "cancel"
  | "confirmSuspend" | "createdAt" | "dashboardDescription" | "email" | "invite" | "inviteAdmin" | "invited"
  | "adminNotInvited" | "adminSuspended" | "cannotChangeSelf" | "googleAccountConflict" | "lastLogin" | "lastOwnerProtected" | "loading" | "manage" | "next" | "noAdmins" | "noUsers" | "owner" | "ownerOnly"
  | "pageOf" | "previous" | "requestFailed" | "role" | "save" | "search" | "searchUsers" | "signOut" | "status" | "suspend"
  | "suspended" | "userManagement" | "userManagementDescription" | "userRoleSupporter" | "userRoleUnverified"
  | "userRoleVerified" | "users" | "rewardPoints" | "rewardStreak" | "pointsToday" | "rewardByType" | "topEarners";

const copies: Record<Language, Record<AdminTranslationKey, string>> = {
  en: {
    accessDenied: "You do not have permission to access this page.", account: "Account", actions: "Actions", active: "Active",
    admin: "Admin", adminAlreadyExists: "An admin account with this email already exists.", adminArea: "Administration", adminLoginDescription: "Sign in with an invited Google account to continue.",
    adminNotInvited: "This Google account has not been invited to the admin area.", adminSuspended: "This admin account is suspended.",
    adminManagement: "Admin users", adminManagementDescription: "Invite, update, or suspend administrative accounts.", allRoles: "All roles",
    backToDashboard: "Back to dashboard", backToSite: "Back to site", cancel: "Cancel", confirmSuspend: "Suspend this admin account?",
    createdAt: "Created", dashboardDescription: "Choose an area to manage.", email: "Email", invite: "Invite", inviteAdmin: "Invite admin",
    invited: "Invited", lastLogin: "Last login", loading: "Loading...", manage: "Manage", next: "Next", noAdmins: "No admin accounts found.",
    cannotChangeSelf: "You cannot change your own admin role or status.", googleAccountConflict: "This email is linked to another Google account.", lastOwnerProtected: "The last active owner cannot be demoted or suspended.", noUsers: "No users found.", owner: "Owner", ownerOnly: "Owner only", pageOf: "Page {page} of {pages}", previous: "Previous", requestFailed: "The admin request could not be completed.",
    role: "Role", save: "Save", search: "Search", searchUsers: "Search name or email", signOut: "Sign out", status: "Status",
    suspend: "Suspend", suspended: "Suspended", userManagement: "App users", userManagementDescription: "Search users and update product roles.",
    userRoleSupporter: "Supporter", userRoleUnverified: "Unverified", userRoleVerified: "Verified", users: "Users", rewardPoints: "Points", rewardStreak: "Streak", pointsToday: "Points issued today", rewardByType: "Last 30 days by type", topEarners: "Top earners (30 days)"
  },
  vi: {
    accessDenied: "Bạn không có quyền truy cập trang này.", account: "Tài khoản", actions: "Thao tác", active: "Đang hoạt động",
    admin: "Admin", adminAlreadyExists: "Đã tồn tại tài khoản admin với email này.", adminArea: "Quản trị hệ thống", adminLoginDescription: "Đăng nhập bằng tài khoản Google đã được mời để tiếp tục.",
    adminNotInvited: "Tài khoản Google này chưa được mời vào khu vực quản trị.", adminSuspended: "Tài khoản admin này đã bị khóa.",
    adminManagement: "Quản lý admin", adminManagementDescription: "Mời, cập nhật hoặc khóa tài khoản quản trị.", allRoles: "Tất cả role",
    backToDashboard: "Về trang quản trị", backToSite: "Về trang chính", cancel: "Hủy", confirmSuspend: "Khóa tài khoản admin này?",
    createdAt: "Ngày tạo", dashboardDescription: "Chọn khu vực bạn muốn quản lý.", email: "Email", invite: "Mời", inviteAdmin: "Mời admin",
    invited: "Đã mời", lastLogin: "Đăng nhập gần nhất", loading: "Đang tải...", manage: "Quản lý", next: "Tiếp", noAdmins: "Chưa có tài khoản admin.",
    cannotChangeSelf: "Bạn không thể thay đổi role hoặc trạng thái admin của chính mình.", googleAccountConflict: "Email này đã được liên kết với một tài khoản Google khác.", lastOwnerProtected: "Không thể hạ quyền hoặc khóa owner đang hoạt động cuối cùng.", noUsers: "Không tìm thấy người dùng.", owner: "Owner", ownerOnly: "Chỉ Owner", pageOf: "Trang {page}/{pages}", previous: "Trước", requestFailed: "Không thể hoàn tất yêu cầu quản trị.",
    role: "Role", save: "Lưu", search: "Tìm kiếm", searchUsers: "Tìm theo tên hoặc email", signOut: "Đăng xuất", status: "Trạng thái",
    suspend: "Khóa", suspended: "Đã khóa", userManagement: "Quản lý người dùng", userManagementDescription: "Tìm kiếm và cập nhật role của người dùng ứng dụng.",
    userRoleSupporter: "Supporter", userRoleUnverified: "Chưa xác minh", userRoleVerified: "Đã xác minh", users: "Người dùng", rewardPoints: "Điểm", rewardStreak: "Chuỗi", pointsToday: "Điểm phát hành hôm nay", rewardByType: "30 ngày gần nhất theo loại", topEarners: "Người nhận nhiều điểm nhất (30 ngày)"
  },
  zh: {
    accessDenied: "你没有权限访问此页面。", account: "账户", actions: "操作", active: "启用", admin: "管理员", adminAlreadyExists: "此邮箱的管理员账户已存在。", adminArea: "系统管理",
    adminNotInvited: "此 Google 账户尚未受邀进入管理区域。", adminSuspended: "此管理员账户已停用。",
    adminLoginDescription: "请使用已受邀的 Google 账户登录。", adminManagement: "管理员用户", adminManagementDescription: "邀请、更新或停用管理员账户。",
    allRoles: "所有角色", backToDashboard: "返回管理面板", backToSite: "返回网站", cancel: "取消", confirmSuspend: "停用此管理员账户？",
    createdAt: "创建时间", dashboardDescription: "请选择要管理的区域。", email: "邮箱", invite: "邀请", inviteAdmin: "邀请管理员",
    invited: "已邀请", lastLogin: "最近登录", loading: "加载中...", manage: "管理", next: "下一页", noAdmins: "未找到管理员账户。",
    cannotChangeSelf: "不能更改自己的管理员角色或状态。", googleAccountConflict: "此邮箱已关联到其他 Google 账户。", lastOwnerProtected: "不能降级或停用最后一位有效所有者。", noUsers: "未找到用户。", owner: "所有者", ownerOnly: "仅所有者", pageOf: "第 {page}/{pages} 页", previous: "上一页", requestFailed: "无法完成管理请求。", role: "角色",
    save: "保存", search: "搜索", searchUsers: "按姓名或邮箱搜索", signOut: "退出", status: "状态", suspend: "停用", suspended: "已停用",
    userManagement: "应用用户", userManagementDescription: "搜索用户并更新产品角色。", userRoleSupporter: "Supporter",
    userRoleUnverified: "未验证", userRoleVerified: "已验证", users: "用户", rewardPoints: "积分", rewardStreak: "连续天数", pointsToday: "今日发放积分", rewardByType: "最近30天按类型", topEarners: "积分最高用户（30天）"
  },
  ja: {
    accessDenied: "このページにアクセスする権限がありません。", account: "アカウント", actions: "操作", active: "有効", admin: "管理者", adminAlreadyExists: "このメールアドレスの管理者はすでに存在します。",
    adminNotInvited: "この Google アカウントは管理エリアに招待されていません。", adminSuspended: "この管理者アカウントは停止されています。",
    adminArea: "システム管理", adminLoginDescription: "招待済みの Google アカウントでログインしてください。", adminManagement: "管理者ユーザー",
    adminManagementDescription: "管理者アカウントの招待、更新、停止を行います。", allRoles: "すべてのロール", backToDashboard: "管理画面に戻る",
    backToSite: "サイトに戻る", cancel: "キャンセル", confirmSuspend: "この管理者アカウントを停止しますか？", createdAt: "作成日",
    dashboardDescription: "管理する項目を選択してください。", email: "メール", invite: "招待", inviteAdmin: "管理者を招待", invited: "招待済み",
    lastLogin: "最終ログイン", loading: "読み込み中...", manage: "管理", next: "次へ", noAdmins: "管理者アカウントがありません。",
    cannotChangeSelf: "自分自身の管理者ロールや状態は変更できません。", googleAccountConflict: "このメールは別の Google アカウントに関連付けられています。", lastOwnerProtected: "最後の有効なオーナーは降格または停止できません。", noUsers: "ユーザーが見つかりません。", owner: "オーナー", ownerOnly: "オーナーのみ", pageOf: "{page}/{pages} ページ",
    previous: "前へ", requestFailed: "管理リクエストを完了できませんでした。", role: "ロール", save: "保存", search: "検索", searchUsers: "名前またはメールで検索", signOut: "ログアウト",
    status: "状態", suspend: "停止", suspended: "停止済み", userManagement: "アプリユーザー",
    userManagementDescription: "ユーザーを検索し、製品ロールを更新します。", userRoleSupporter: "Supporter",
    userRoleUnverified: "未認証", userRoleVerified: "認証済み", users: "ユーザー", rewardPoints: "ポイント", rewardStreak: "連続日数", pointsToday: "本日の発行ポイント", rewardByType: "過去30日間の種類別", topEarners: "上位獲得者（30日）"
  }
};

export function adminTranslate(language: Language, key: AdminTranslationKey, values?: Record<string, string | number>) {
  let text = copies[language][key] ?? copies.en[key];
  for (const [name, value] of Object.entries(values ?? {})) text = text.replace(`{${name}}`, String(value));
  return text;
}
