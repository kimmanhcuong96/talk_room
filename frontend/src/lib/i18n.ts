export type Language = "en" | "vi" | "zh" | "ja";

export type TranslationKey =
  | "aboutUs"
  | "backToRooms"
  | "buyMeCoffee"
  | "chat"
  | "chooseSignInMethod"
  | "closeSignIn"
  | "closeChat"
  | "connectAndAccess"
  | "connectingServer"
  | "contactUs"
  | "createGroup"
  | "free4TalkApp"
  | "full"
  | "google"
  | "googlePromptNotDisplayed"
  | "googlePromptSkipped"
  | "googlePromptUseButton"
  | "googleSignInFailed"
  | "googleSignInNotConfigured"
  | "googleSignInStartFailed"
  | "googleSignInUnavailable"
  | "join"
  | "language"
  | "leaveRoom"
  | "loadUserProfileFailed"
  | "messagePlaceholder"
  | "micMute"
  | "micUnavailable"
  | "micUnmute"
  | "nickname"
  | "nicknameRequired"
  | "nicknamePlaceholder"
  | "privacyPolicy"
  | "readyAccess"
  | "roomConnectionFailed"
  | "roomConnectionLost"
  | "roomFull"
  | "roomFullError"
  | "roomJoinTimeout"
  | "search"
  | "searchPlaceholder"
  | "serverConnected"
  | "signIn"
  | "signInWithGoogle"
  | "signOut"
  | "signingIn"
  | "screenShareDenied"
  | "screenShareOff"
  | "screenShareOn"
  | "screenShareStartFailed"
  | "screenShareUnavailable"
  | "speakers"
  | "speaking"
  | "title"
  | "videoOff"
  | "videoOn"
  | "videoUnavailable";

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: {
    aboutUs: "About Us",
    backToRooms: "Back to rooms",
    buyMeCoffee: "Buy me a coffee",
    chat: "Chat",
    chooseSignInMethod: "Choose sign-in method",
    closeSignIn: "Close sign in",
    closeChat: "Close chat",
    connectAndAccess: "Connect and access",
    connectingServer: "Connecting to server",
    contactUs: "Contact Us",
    createGroup: "Create a new group",
    free4TalkApp: "Free4Talk APP",
    full: "Full",
    google: "Google",
    googlePromptNotDisplayed: "Google prompt was not displayed: {reason}.",
    googlePromptSkipped: "Google prompt was skipped: {reason}.",
    googlePromptUseButton: "Use the Google button below.",
    googleSignInFailed: "Google sign-in failed.",
    googleSignInNotConfigured: "Google sign-in is not configured.",
    googleSignInStartFailed: "Could not start Google sign-in.",
    googleSignInUnavailable: "Google Sign-In is unavailable.",
    join: "Join",
    language: "Language",
    leaveRoom: "Leave room",
    loadUserProfileFailed: "Could not load user profile.",
    messagePlaceholder: "Message",
    micMute: "Mute microphone",
    micUnavailable: "No microphone found",
    micUnmute: "Unmute microphone",
    nickname: "Nickname",
    nicknameRequired: "Please enter a nickname.",
    nicknamePlaceholder: "Enter your nickname",
    privacyPolicy: "Privacy Policy",
    readyAccess: "Ready access",
    roomConnectionFailed: "Room connection failed",
    roomConnectionLost: "Lost connection to the room server.",
    roomFull: "Room is full",
    roomFullError: "That room is full. Please choose another room.",
    roomJoinTimeout: "Could not connect to this room.",
    search: "Search",
    searchPlaceholder: "Search by Topic & User",
    serverConnected: "Server connected",
    signIn: "Sign in",
    signInWithGoogle: "Sign in with Google",
    signOut: "Sign out",
    signingIn: "Signing in...",
    screenShareDenied: "Someone is already sharing their screen.",
    screenShareOff: "Stop sharing screen",
    screenShareOn: "Share screen",
    screenShareStartFailed: "Could not start screen sharing.",
    screenShareUnavailable: "Screen sharing is unavailable",
    speakers: "{count}/4 speakers",
    speaking: "Speaking",
    title: "Practice speaking now",
    videoOff: "Turn camera off",
    videoOn: "Turn camera on",
    videoUnavailable: "No camera found"
  },
  vi: {
    aboutUs: "Về chúng tôi",
    backToRooms: "Quay lại phòng",
    buyMeCoffee: "Mời tôi cà phê",
    chat: "Trò chuyện",
    chooseSignInMethod: "Chọn phương thức đăng nhập",
    closeSignIn: "Đóng đăng nhập",
    closeChat: "Đóng chat",
    connectAndAccess: "Kết nối và vào phòng",
    connectingServer: "Đang kết nối server",
    contactUs: "Liên hệ",
    createGroup: "Tạo nhóm mới",
    free4TalkApp: "Ứng dụng Free4Talk",
    full: "Đầy",
    google: "Google",
    googlePromptNotDisplayed: "Không hiển thị được cửa sổ Google: {reason}.",
    googlePromptSkipped: "Google đã bỏ qua cửa sổ đăng nhập: {reason}.",
    googlePromptUseButton: "Hãy dùng nút Google bên dưới.",
    googleSignInFailed: "Đăng nhập Google thất bại.",
    googleSignInNotConfigured: "Đăng nhập Google chưa được cấu hình.",
    googleSignInStartFailed: "Không thể bắt đầu đăng nhập Google.",
    googleSignInUnavailable: "Đăng nhập Google hiện không khả dụng.",
    join: "Vào",
    language: "Ngôn ngữ",
    leaveRoom: "Rời phòng",
    loadUserProfileFailed: "Không thể tải thông tin người dùng.",
    messagePlaceholder: "Tin nhắn",
    micMute: "Tắt micro",
    micUnavailable: "Không tìm thấy micro",
    micUnmute: "Bật micro",
    nickname: "Tên hiển thị",
    nicknameRequired: "Vui lòng nhập tên hiển thị.",
    nicknamePlaceholder: "Nhập tên của bạn",
    privacyPolicy: "Chính sách riêng tư",
    readyAccess: "Sẵn sàng vào phòng",
    roomConnectionFailed: "Kết nối phòng thất bại",
    roomConnectionLost: "Mất kết nối tới server phòng.",
    roomFull: "Phòng đã đầy",
    roomFullError: "Phòng này đã đầy. Vui lòng chọn phòng khác.",
    roomJoinTimeout: "Không thể kết nối vào phòng này.",
    search: "Tìm kiếm",
    searchPlaceholder: "Tìm theo chủ đề & người dùng",
    serverConnected: "Đã kết nối server",
    signIn: "Đăng nhập",
    signInWithGoogle: "Đăng nhập bằng Google",
    signOut: "Đăng xuất",
    signingIn: "Đang đăng nhập...",
    screenShareDenied: "Đã có người đang chia sẻ màn hình.",
    screenShareOff: "Dừng chia sẻ màn hình",
    screenShareOn: "Chia sẻ màn hình",
    screenShareStartFailed: "Không thể bắt đầu chia sẻ màn hình.",
    screenShareUnavailable: "Không thể chia sẻ màn hình",
    speakers: "{count}/4 người",
    speaking: "Đang nói",
    title: "Luyện nói ngay",
    videoOff: "Tắt camera",
    videoOn: "Bật camera",
    videoUnavailable: "Không tìm thấy camera"
  },
  zh: {
    aboutUs: "关于我们",
    backToRooms: "返回房间列表",
    buyMeCoffee: "请我喝咖啡",
    chat: "聊天",
    chooseSignInMethod: "选择登录方式",
    closeSignIn: "关闭登录",
    closeChat: "关闭聊天",
    connectAndAccess: "连接并进入",
    connectingServer: "正在连接服务器",
    contactUs: "联系我们",
    createGroup: "创建新群组",
    free4TalkApp: "Free4Talk 应用",
    full: "已满",
    google: "Google",
    googlePromptNotDisplayed: "Google 登录提示未显示：{reason}。",
    googlePromptSkipped: "Google 登录提示已跳过：{reason}。",
    googlePromptUseButton: "请使用下方的 Google 按钮。",
    googleSignInFailed: "Google 登录失败。",
    googleSignInNotConfigured: "尚未配置 Google 登录。",
    googleSignInStartFailed: "无法启动 Google 登录。",
    googleSignInUnavailable: "Google 登录当前不可用。",
    join: "加入",
    language: "语言",
    leaveRoom: "离开房间",
    loadUserProfileFailed: "无法加载用户资料。",
    messagePlaceholder: "消息",
    micMute: "关闭麦克风",
    micUnavailable: "未找到麦克风",
    micUnmute: "打开麦克风",
    nickname: "昵称",
    nicknameRequired: "请输入昵称。",
    nicknamePlaceholder: "输入你的昵称",
    privacyPolicy: "隐私政策",
    readyAccess: "准备进入",
    roomConnectionFailed: "房间连接失败",
    roomConnectionLost: "与房间服务器断开连接。",
    roomFull: "房间已满",
    roomFullError: "该房间已满。请选择其他房间。",
    roomJoinTimeout: "无法连接到该房间。",
    search: "搜索",
    searchPlaceholder: "按主题和用户搜索",
    serverConnected: "服务器已连接",
    signIn: "登录",
    signInWithGoogle: "使用 Google 登录",
    signOut: "退出登录",
    signingIn: "正在登录...",
    screenShareDenied: "已有用户正在共享屏幕。",
    screenShareOff: "停止共享屏幕",
    screenShareOn: "共享屏幕",
    screenShareStartFailed: "无法开始屏幕共享。",
    screenShareUnavailable: "屏幕共享不可用",
    speakers: "{count}/4 人",
    speaking: "正在说话",
    title: "立即练习口语",
    videoOff: "关闭摄像头",
    videoOn: "打开摄像头",
    videoUnavailable: "未找到摄像头"
  },
  ja: {
    aboutUs: "私たちについて",
    backToRooms: "ルーム一覧へ戻る",
    buyMeCoffee: "コーヒーをおごる",
    chat: "チャット",
    chooseSignInMethod: "ログイン方法を選択",
    closeSignIn: "ログインを閉じる",
    closeChat: "チャットを閉じる",
    connectAndAccess: "接続して入室",
    connectingServer: "サーバーに接続中",
    contactUs: "お問い合わせ",
    createGroup: "新しいグループを作成",
    free4TalkApp: "Free4Talk アプリ",
    full: "満室",
    google: "Google",
    googlePromptNotDisplayed: "Google のログイン画面を表示できませんでした: {reason}。",
    googlePromptSkipped: "Google のログイン画面がスキップされました: {reason}。",
    googlePromptUseButton: "下の Google ボタンを使用してください。",
    googleSignInFailed: "Google ログインに失敗しました。",
    googleSignInNotConfigured: "Google ログインが設定されていません。",
    googleSignInStartFailed: "Google ログインを開始できませんでした。",
    googleSignInUnavailable: "Google ログインは現在利用できません。",
    join: "参加",
    language: "言語",
    leaveRoom: "ルームを退出",
    loadUserProfileFailed: "ユーザープロフィールを読み込めませんでした。",
    messagePlaceholder: "メッセージ",
    micMute: "マイクをミュート",
    micUnavailable: "マイクが見つかりません",
    micUnmute: "マイクをオン",
    nickname: "ニックネーム",
    nicknameRequired: "ニックネームを入力してください。",
    nicknamePlaceholder: "ニックネームを入力",
    privacyPolicy: "プライバシーポリシー",
    readyAccess: "入室準備",
    roomConnectionFailed: "ルーム接続に失敗しました",
    roomConnectionLost: "ルームサーバーとの接続が切れました。",
    roomFull: "ルームは満室です",
    roomFullError: "このルームは満室です。別のルームを選んでください。",
    roomJoinTimeout: "このルームに接続できませんでした。",
    search: "検索",
    searchPlaceholder: "トピックとユーザーで検索",
    serverConnected: "サーバーに接続済み",
    signIn: "ログイン",
    signInWithGoogle: "Google でログイン",
    signOut: "ログアウト",
    signingIn: "ログイン中...",
    screenShareDenied: "他のユーザーがすでに画面共有しています。",
    screenShareOff: "画面共有を停止",
    screenShareOn: "画面を共有",
    screenShareStartFailed: "画面共有を開始できませんでした。",
    screenShareUnavailable: "画面共有は利用できません",
    speakers: "{count}/4 人",
    speaking: "発話中",
    title: "今すぐスピーキング練習",
    videoOff: "カメラをオフ",
    videoOn: "カメラをオン",
    videoUnavailable: "カメラが見つかりません"
  }
};

export const languages: Array<{ value: Language; label: string }> = [
  { value: "en", label: "English" },
  { value: "vi", label: "Tiếng Việt" },
  { value: "zh", label: "中文" },
  { value: "ja", label: "日本語" }
];

export function isLanguage(value: string | null): value is Language {
  return value === "en" || value === "vi" || value === "zh" || value === "ja";
}

export function translate(language: Language, key: TranslationKey, values?: Record<string, string | number>) {
  let text = translations[language][key] ?? translations.en[key];

  if (values) {
    for (const [name, value] of Object.entries(values)) {
      text = text.replace(`{${name}}`, String(value));
    }
  }

  return text;
}
