export type Language = "en" | "vi" | "zh" | "ja";

export type TranslationKey =
  | "aboutUs"
  | "adminArea"
  | "backToRooms"
  | "buyMeCoffee"
  | "cameraSupporterOnly"
  | "cameraUpgradeDescription"
  | "cameraUpgradeTitle"
  | "cancel"
  | "chat"
  | "chooseSignInMethod"
  | "closeSignIn"
  | "closeUpgradeGuide"
  | "closeChat"
  | "connectAndAccess"
  | "connectingServer"
  | "contactUs"
  | "createGroup"
  | "createRoom"
  | "createRoomDescription"
  | "createRoomName"
  | "createRoomNamePlaceholder"
  | "createRoomNameTooShort"
  | "createRoomVerifiedOnly"
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
  | "gotIt"
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
  | "primaryLanguage"
  | "secondaryLanguage"
  | "optional"
  | "selectLanguage"
  | "roomPrimaryLanguageRequired"
  | "roomLanguageInvalid"
  | "roomLanguagesMustDiffer"
  | "readyAccess"
  | "role"
  | "roleSupporter"
  | "roleUnverified"
  | "roleVerified"
  | "roomConnectionFailed"
  | "roomConnectionLost"
  | "roomFull"
  | "roomFullError"
  | "roomJoinTimeout"
  | "roomExpired"
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
    primaryLanguage: "Primary language",
    secondaryLanguage: "Secondary language",
    optional: "Optional",
    selectLanguage: "Select a language",
    roomPrimaryLanguageRequired: "Please select a primary language.",
    roomLanguageInvalid: "Please select a valid room language.",
    roomLanguagesMustDiffer: "Primary and secondary languages must be different.",
    aboutUs: "About Us",
    adminArea: "Administration",
    backToRooms: "Back to rooms",
    buyMeCoffee: "Buy me a coffee",
    cameraSupporterOnly: "Camera is available to supporters only",
    cameraUpgradeDescription: "Upgrade your account to Supporter to turn on your camera. You can continue using the microphone and chat with your current account.",
    cameraUpgradeTitle: "Upgrade to use camera",
    cancel: "Cancel",
    chat: "Chat",
    chooseSignInMethod: "Choose sign-in method",
    closeSignIn: "Close sign in",
    closeUpgradeGuide: "Close upgrade guide",
    closeChat: "Close chat",
    connectAndAccess: "Connect and access",
    connectingServer: "Connecting to server",
    contactUs: "Contact Us",
    createGroup: "Create a new group",
    createRoom: "Create room",
    createRoomDescription: "Choose a clear topic so people know what to talk about.",
    createRoomName: "Room name",
    createRoomNamePlaceholder: "Example: Everyday Japanese",
    createRoomNameTooShort: "Room name must contain at least 3 characters.",
    createRoomVerifiedOnly: "Only verified users and supporters can create rooms.",
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
    gotIt: "Got it",
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
    role: "Account type",
    roleSupporter: "Supporter",
    roleUnverified: "Unverified",
    roleVerified: "Verified",
    roomConnectionFailed: "Room connection failed",
    roomConnectionLost: "Lost connection to the room server.",
    roomFull: "Room is full",
    roomFullError: "That room is full. Please choose another room.",
    roomJoinTimeout: "Could not connect to this room.",
    roomExpired: "This room was removed after being empty for one minute.",
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
    primaryLanguage: "Ngôn ngữ chính",
    secondaryLanguage: "Ngôn ngữ phụ",
    optional: "Không bắt buộc",
    selectLanguage: "Chọn ngôn ngữ",
    roomPrimaryLanguageRequired: "Vui lòng chọn ngôn ngữ chính.",
    roomLanguageInvalid: "Vui lòng chọn một ngôn ngữ hợp lệ.",
    roomLanguagesMustDiffer: "Ngôn ngữ chính và ngôn ngữ phụ phải khác nhau.",
    aboutUs: "Về chúng tôi",
    adminArea: "Quản trị hệ thống",
    backToRooms: "Quay lại phòng",
    buyMeCoffee: "Mời tôi cà phê",
    cameraSupporterOnly: "Chỉ Supporter mới có thể bật camera",
    cameraUpgradeDescription: "Hãy nâng cấp tài khoản lên Supporter để bật camera. Bạn vẫn có thể tiếp tục sử dụng micro và trò chuyện với tài khoản hiện tại.",
    cameraUpgradeTitle: "Nâng cấp để sử dụng camera",
    cancel: "Hủy",
    chat: "Trò chuyện",
    chooseSignInMethod: "Chọn phương thức đăng nhập",
    closeSignIn: "Đóng đăng nhập",
    closeUpgradeGuide: "Đóng hướng dẫn nâng cấp",
    closeChat: "Đóng chat",
    connectAndAccess: "Kết nối và vào phòng",
    connectingServer: "Đang kết nối server",
    contactUs: "Liên hệ",
    createGroup: "Tạo nhóm mới",
    createRoom: "Tạo phòng",
    createRoomDescription: "Chọn một chủ đề rõ ràng để mọi người biết nội dung trò chuyện.",
    createRoomName: "Tên phòng",
    createRoomNamePlaceholder: "Ví dụ: Luyện nói tiếng Nhật hằng ngày",
    createRoomNameTooShort: "Tên phòng phải có ít nhất 3 ký tự.",
    createRoomVerifiedOnly: "Chỉ tài khoản Verified và Supporter mới có thể tạo phòng.",
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
    gotIt: "Đã hiểu",
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
    role: "Loại tài khoản",
    roleSupporter: "Supporter",
    roleUnverified: "Chưa xác minh",
    roleVerified: "Đã xác minh",
    roomConnectionFailed: "Kết nối phòng thất bại",
    roomConnectionLost: "Mất kết nối tới server phòng.",
    roomFull: "Phòng đã đầy",
    roomFullError: "Phòng này đã đầy. Vui lòng chọn phòng khác.",
    roomJoinTimeout: "Không thể kết nối vào phòng này.",
    roomExpired: "Phòng này đã bị xóa sau khi không có người tham gia trong một phút.",
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
    primaryLanguage: "主要语言",
    secondaryLanguage: "辅助语言",
    optional: "可选",
    selectLanguage: "选择语言",
    roomPrimaryLanguageRequired: "请选择主要语言。",
    roomLanguageInvalid: "请选择有效的房间语言。",
    roomLanguagesMustDiffer: "主要语言和辅助语言必须不同。",
    aboutUs: "关于我们",
    adminArea: "系统管理",
    backToRooms: "返回房间列表",
    buyMeCoffee: "请我喝咖啡",
    cameraSupporterOnly: "仅 Supporter 用户可以开启摄像头",
    cameraUpgradeDescription: "请将账户升级为 Supporter 以开启摄像头。当前账户仍可继续使用麦克风和聊天功能。",
    cameraUpgradeTitle: "升级后使用摄像头",
    cancel: "取消",
    chat: "聊天",
    chooseSignInMethod: "选择登录方式",
    closeSignIn: "关闭登录",
    closeUpgradeGuide: "关闭升级说明",
    closeChat: "关闭聊天",
    connectAndAccess: "连接并进入",
    connectingServer: "正在连接服务器",
    contactUs: "联系我们",
    createGroup: "创建新群组",
    createRoom: "创建房间",
    createRoomDescription: "请选择清晰的主题，让大家了解要讨论的内容。",
    createRoomName: "房间名称",
    createRoomNamePlaceholder: "例如：日常日语练习",
    createRoomNameTooShort: "房间名称至少需要 3 个字符。",
    createRoomVerifiedOnly: "只有 Verified 和 Supporter 用户可以创建房间。",
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
    gotIt: "知道了",
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
    role: "账户类型",
    roleSupporter: "Supporter",
    roleUnverified: "未验证",
    roleVerified: "已验证",
    roomConnectionFailed: "房间连接失败",
    roomConnectionLost: "与房间服务器断开连接。",
    roomFull: "房间已满",
    roomFullError: "该房间已满。请选择其他房间。",
    roomJoinTimeout: "无法连接到该房间。",
    roomExpired: "该房间空置一分钟后已被删除。",
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
    primaryLanguage: "メイン言語",
    secondaryLanguage: "サブ言語",
    optional: "任意",
    selectLanguage: "言語を選択",
    roomPrimaryLanguageRequired: "メイン言語を選択してください。",
    roomLanguageInvalid: "有効なルーム言語を選択してください。",
    roomLanguagesMustDiffer: "メイン言語とサブ言語は別の言語を選択してください。",
    aboutUs: "私たちについて",
    adminArea: "システム管理",
    backToRooms: "ルーム一覧へ戻る",
    buyMeCoffee: "コーヒーをおごる",
    cameraSupporterOnly: "カメラをオンにできるのは Supporter のみです",
    cameraUpgradeDescription: "カメラをオンにするには、アカウントを Supporter にアップグレードしてください。現在のアカウントでもマイクとチャットは引き続き利用できます。",
    cameraUpgradeTitle: "カメラ利用にはアップグレードが必要です",
    cancel: "キャンセル",
    chat: "チャット",
    chooseSignInMethod: "ログイン方法を選択",
    closeSignIn: "ログインを閉じる",
    closeUpgradeGuide: "アップグレード案内を閉じる",
    closeChat: "チャットを閉じる",
    connectAndAccess: "接続して入室",
    connectingServer: "サーバーに接続中",
    contactUs: "お問い合わせ",
    createGroup: "新しいグループを作成",
    createRoom: "ルームを作成",
    createRoomDescription: "会話の内容が分かる、明確なトピックを設定してください。",
    createRoomName: "ルーム名",
    createRoomNamePlaceholder: "例：毎日の日本語練習",
    createRoomNameTooShort: "ルーム名は3文字以上で入力してください。",
    createRoomVerifiedOnly: "ルームを作成できるのは Verified と Supporter のみです。",
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
    gotIt: "了解",
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
    role: "アカウント種別",
    roleSupporter: "Supporter",
    roleUnverified: "未認証",
    roleVerified: "認証済み",
    roomConnectionFailed: "ルーム接続に失敗しました",
    roomConnectionLost: "ルームサーバーとの接続が切れました。",
    roomFull: "ルームは満室です",
    roomFullError: "このルームは満室です。別のルームを選んでください。",
    roomJoinTimeout: "このルームに接続できませんでした。",
    roomExpired: "このルームは1分間空室だったため削除されました。",
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

const supportEmail = "kimmanhcuong96@gmail.com";

type InfoSection = {
  heading: string;
  body: string;
};

type AboutCard = {
  icon: "languages" | "heart" | "users";
  heading: string;
  body: string;
};

export type InfoPageCopy = {
  eyebrow: string;
  title: string;
  intro: string;
  privacy?: {
    summaryLabel: string;
    summary: string;
    updated: string;
    sections: InfoSection[];
  };
  contact?: {
    heading: string;
    body: string;
    action: string;
    subject: string;
    safetyNote: string;
  };
  about?: {
    cards: AboutCard[];
    statementHeading: string;
    statementBody: string;
    highlightLabel: string;
    highlightBody: string;
  };
};

export const infoPageCopies: Record<Language, Record<"privacy" | "contact" | "about", InfoPageCopy>> = {
  en: {
    privacy: {
      eyebrow: "Talking Room & privacy",
      title: "Privacy Policy",
      intro: "We respect your privacy and want you to understand what data is processed when you join a conversation.",
      privacy: {
        summaryLabel: "In short:",
        summary: "You can join rooms as a guest. We do not sell personal data or intentionally record calls.",
        updated: "Last updated: August 5, 2026",
        sections: [
          {
            heading: "1. Information we process",
            body: "When you use guest mode, we process your chosen display name, room state, messages, and microphone, camera, and screen-sharing status. Your browser stores your display name, language, and sign-in session to maintain the experience. If you sign in with Google, we receive and store your Google account identifier, email, display name, avatar, account role, account creation time, and latest login time."
          },
          {
            heading: "2. Audio, video, and messages",
            body: "Audio, video, and screen-sharing content is transmitted in real time between room participants using WebRTC. A connection may be direct or relayed through a TURN server when needed; Talking Room does not intentionally record or store calls. Text messages and room information are held temporarily in memory while the service is running, may be provided to people joining that room, and are not designed as a permanent chat history."
          },
          {
            heading: "3. How we use data",
            body: "We use data to sign you in, show your identity in a room, connect participants, operate chat and calls, maintain security, diagnose errors, and improve service reliability. We do not sell your personal data."
          },
          {
            heading: "4. Service providers",
            body: "Necessary data may be processed by Google when you sign in and by the hosting, database, or TURN infrastructure providers used by Talking Room. Those providers process data under their own terms and privacy policies."
          },
          {
            heading: "5. Retention and security",
            body: "Account data is kept while your account is active or longer where required by law. Locally stored data can be removed through your browser settings. We use reasonable technical safeguards, but no transmission or storage system can be guaranteed completely secure."
          },
          {
            heading: "6. Your choices and rights",
            body: `You can join as a guest, change your display name, deny microphone or camera permissions, or request access to, correction of, or deletion of account data by emailing ${supportEmail}. Denying a device permission may prevent the related feature from working.`
          },
          {
            heading: "7. Children's privacy",
            body: "The service is not directed to children under 13. If you believe a child has provided us with personal data, contact us so that we can review and remove it where appropriate."
          },
          {
            heading: "8. Changes and contact",
            body: `We may update this policy as features or laws change. The revised version and update date will appear on this page. Send privacy questions to ${supportEmail}.`
          }
        ]
      }
    },
    contact: {
      eyebrow: "We are listening",
      title: "Contact Us",
      intro: "A question, an idea, or a piece of feedback can all help make Talking Room better.",
      contact: {
        heading: "Email us",
        body: "Need technical support, want to suggest a feature, report a room issue, or discuss a partnership? Briefly describe the issue and attach a screenshot when helpful. We will reply as soon as we can.",
        action: "Write an email",
        subject: "Talking Room support",
        safetyNote: "Please do not send passwords, sign-in codes, or financial information by email."
      }
    },
    about: {
      eyebrow: "Talking Room - For me talk",
      title: "About Us",
      intro: "An online conversation space for language practice, sharing, and genuine human connection, simply by talking together.",
      about: {
        cards: [
          { icon: "languages", heading: "Practice languages", body: "Turn knowledge into confidence through real conversations around topics that match your goals and level." },
          { icon: "heart", heading: "A place to open up", body: "Sometimes we simply need a welcoming space to share, listen, and be ourselves." },
          { icon: "users", heading: "Connect naturally", body: "Meet people with shared interests, learn from new perspectives, and build meaningful connections." }
        ],
        statementHeading: "Talk to grow. Talk to be heard.",
        statementBody: "Talking Room - For me talk is built on a simple belief: an honest conversation can improve how we speak, grow our confidence, and bring us closer. No rigid lesson or complicated profile is required; choose a room, step inside, and begin with hello.",
        highlightLabel: "Your space",
        highlightBody: "Whether you come to practice a new language, share the story of your day, or meet someone on your wavelength, Talking Room wants every conversation to feel easy to start and worth remembering."
      }
    }
  },
  vi: {
    privacy: {
      eyebrow: "Talking Room và quyền riêng tư",
      title: "Chính sách riêng tư",
      intro: "Chúng tôi tôn trọng quyền riêng tư và muốn bạn hiểu rõ dữ liệu nào được xử lý khi tham gia một cuộc trò chuyện.",
      privacy: {
        summaryLabel: "Tóm tắt:",
        summary: "Bạn có thể vào phòng với tư cách khách. Chúng tôi không bán dữ liệu cá nhân và không chủ động ghi âm cuộc gọi.",
        updated: "Cập nhật lần cuối: 05/08/2026",
        sections: [
          {
            heading: "1. Thông tin chúng tôi xử lý",
            body: "Khi bạn dùng chế độ khách, chúng tôi xử lý tên hiển thị bạn chọn, trạng thái phòng, tin nhắn và trạng thái micro, camera, chia sẻ màn hình. Trình duyệt lưu tên hiển thị, ngôn ngữ và phiên đăng nhập để duy trì trải nghiệm. Nếu đăng nhập bằng Google, chúng tôi nhận và lưu mã tài khoản Google, email, tên hiển thị, ảnh đại diện, loại tài khoản, thời điểm tạo tài khoản và lần đăng nhập gần nhất."
          },
          {
            heading: "2. Âm thanh, video và tin nhắn",
            body: "Âm thanh, video và nội dung chia sẻ màn hình được truyền theo thời gian thực giữa những người trong phòng bằng WebRTC. Kết nối có thể đi trực tiếp hoặc được chuyển tiếp qua máy chủ TURN khi cần; Talking Room không chủ động ghi âm hay lưu bản ghi cuộc gọi. Tin nhắn văn bản và thông tin phòng được giữ tạm trong bộ nhớ khi dịch vụ đang chạy, có thể được gửi cho người tham gia phòng đó và không được thiết kế như lịch sử trò chuyện lâu dài."
          },
          {
            heading: "3. Cách chúng tôi sử dụng dữ liệu",
            body: "Dữ liệu được dùng để đăng nhập, hiển thị danh tính trong phòng, kết nối người tham gia, vận hành chat và cuộc gọi, duy trì bảo mật, xử lý lỗi và cải thiện độ ổn định của dịch vụ. Chúng tôi không bán dữ liệu cá nhân của bạn."
          },
          {
            heading: "4. Nhà cung cấp dịch vụ",
            body: "Một số dữ liệu cần thiết có thể được xử lý bởi Google khi bạn đăng nhập và bởi các nhà cung cấp hạ tầng lưu trữ, cơ sở dữ liệu hoặc kết nối TURN mà Talking Room sử dụng. Các bên này xử lý dữ liệu theo điều khoản và chính sách riêng của họ."
          },
          {
            heading: "5. Lưu trữ và bảo mật",
            body: "Dữ liệu tài khoản được lưu trong thời gian tài khoản còn hoạt động hoặc lâu hơn khi pháp luật yêu cầu. Dữ liệu lưu cục bộ có thể được xóa trong phần cài đặt trình duyệt. Chúng tôi áp dụng biện pháp kỹ thuật hợp lý để bảo vệ dữ liệu, nhưng không hệ thống truyền tải hoặc lưu trữ nào an toàn tuyệt đối."
          },
          {
            heading: "6. Lựa chọn và quyền của bạn",
            body: `Bạn có thể dùng phòng mà không đăng nhập, thay đổi tên hiển thị, từ chối quyền micro hoặc camera, hoặc yêu cầu truy cập, chỉnh sửa hay xóa dữ liệu tài khoản qua ${supportEmail}. Việc từ chối một quyền thiết bị có thể làm tính năng liên quan không hoạt động.`
          },
          {
            heading: "7. Quyền riêng tư của trẻ em",
            body: "Dịch vụ không hướng tới trẻ em dưới 13 tuổi. Nếu bạn tin rằng trẻ em đã cung cấp dữ liệu cá nhân cho chúng tôi, hãy liên hệ để chúng tôi xem xét và xóa dữ liệu phù hợp."
          },
          {
            heading: "8. Thay đổi chính sách và liên hệ",
            body: `Chính sách này có thể được cập nhật khi tính năng hoặc quy định thay đổi. Phiên bản mới sẽ được đăng tại trang này cùng ngày cập nhật. Mọi câu hỏi về quyền riêng tư xin gửi tới ${supportEmail}.`
          }
        ]
      }
    },
    contact: {
      eyebrow: "Chúng tôi luôn lắng nghe",
      title: "Liên hệ",
      intro: "Một câu hỏi, một ý tưởng hay một lời góp ý đều có thể giúp Talking Room trở nên tốt hơn.",
      contact: {
        heading: "Gửi email cho chúng tôi",
        body: "Bạn cần hỗ trợ kỹ thuật, muốn góp ý một tính năng, báo cáo vấn đề trong phòng hoặc trao đổi về hợp tác? Hãy mô tả ngắn gọn vấn đề và gửi kèm ảnh chụp màn hình nếu có. Chúng tôi sẽ phản hồi sớm nhất có thể.",
        action: "Soạn email",
        subject: "Hỗ trợ Talking Room",
        safetyNote: "Lưu ý: đừng gửi mật khẩu, mã đăng nhập hoặc thông tin tài chính qua email."
      }
    },
    about: {
      eyebrow: "Talking Room - For me talk",
      title: "Về chúng tôi",
      intro: "Một không gian trò chuyện trực tuyến để luyện tập ngôn ngữ, tâm sự và kết nối với mọi người theo cách chân thật nhất: cùng nhau nói chuyện.",
      about: {
        cards: [
          { icon: "languages", heading: "Luyện tập ngôn ngữ", body: "Biến kiến thức thành phản xạ qua những cuộc trò chuyện thật, với chủ đề phù hợp mục tiêu và trình độ của bạn." },
          { icon: "heart", heading: "Một nơi để tâm sự", body: "Có những lúc ta chỉ cần một không gian gần gũi để chia sẻ, lắng nghe và được là chính mình." },
          { icon: "users", heading: "Kết nối tự nhiên", body: "Gặp gỡ những người có chung mối quan tâm, học từ góc nhìn mới và xây dựng các kết nối ý nghĩa." }
        ],
        statementHeading: "Nói để tiến bộ. Nói để được lắng nghe.",
        statementBody: "Talking Room - For me talk được tạo ra với một niềm tin đơn giản: một cuộc trò chuyện chân thành có thể giúp ta phát âm tốt hơn, tự tin hơn và cũng cảm thấy gần nhau hơn. Không cần một bài học cứng nhắc hay hồ sơ cầu kỳ; hãy chọn căn phòng phù hợp, bước vào và bắt đầu bằng một lời chào.",
        highlightLabel: "Không gian của bạn",
        highlightBody: "Dù bạn đến để luyện một ngôn ngữ mới, kể câu chuyện của ngày hôm nay hay tìm một người bạn cùng tần số, Talking Room luôn muốn mỗi cuộc trò chuyện đều dễ bắt đầu và đáng để nhớ."
      }
    }
  },
  zh: {
    privacy: {
      eyebrow: "Talking Room 与隐私",
      title: "隐私政策",
      intro: "我们尊重你的隐私，并希望你清楚了解加入对话时会处理哪些数据。",
      privacy: {
        summaryLabel: "简要说明：",
        summary: "你可以以访客身份加入房间。我们不会出售个人数据，也不会主动录制通话。",
        updated: "最后更新：2026年8月5日",
        sections: [
          { heading: "1. 我们处理的信息", body: "当你使用访客模式时，我们会处理你选择的显示名称、房间状态、消息，以及麦克风、摄像头和屏幕共享状态。浏览器会保存你的显示名称、语言和登录会话，以维持使用体验。如果你使用 Google 登录，我们会接收并保存你的 Google 账户标识、邮箱、显示名称、头像、账户类型、账户创建时间和最近登录时间。" },
          { heading: "2. 音频、视频和消息", body: "音频、视频和屏幕共享内容会通过 WebRTC 在房间参与者之间实时传输。连接可能是直接连接，也可能在需要时通过 TURN 服务器中继；Talking Room 不会主动录制或保存通话。文字消息和房间信息会在服务运行期间临时保存在内存中，可能提供给加入该房间的人，并不是长期聊天记录。" },
          { heading: "3. 我们如何使用数据", body: "我们使用数据来完成登录、在房间中显示身份、连接参与者、运行聊天和通话、维护安全、诊断错误并提升服务稳定性。我们不会出售你的个人数据。" },
          { heading: "4. 服务提供商", body: "当你登录时，Google 可能会处理必要数据；Talking Room 使用的托管、数据库或 TURN 基础设施提供商也可能处理必要数据。这些提供商会按照其自身条款和隐私政策处理数据。" },
          { heading: "5. 保留与安全", body: "账户数据会在账户保持活动期间保存，或在法律要求时保存更久。本地保存的数据可通过浏览器设置删除。我们使用合理的技术保护措施，但任何传输或存储系统都无法保证绝对安全。" },
          { heading: "6. 你的选择和权利", body: `你可以以访客身份加入、更改显示名称、拒绝麦克风或摄像头权限，或通过 ${supportEmail} 请求访问、更正或删除账户数据。拒绝设备权限可能会导致相关功能无法使用。` },
          { heading: "7. 儿童隐私", body: "本服务并非面向 13 岁以下儿童。如果你认为儿童向我们提供了个人数据，请联系我们，我们会在适当情况下进行审查并删除。" },
          { heading: "8. 政策变更和联系", body: `当功能或法规发生变化时，我们可能会更新本政策。新版政策和更新日期会显示在此页面。如有隐私问题，请发送邮件至 ${supportEmail}。` }
        ]
      }
    },
    contact: {
      eyebrow: "我们在倾听",
      title: "联系我们",
      intro: "一个问题、一个想法或一条反馈，都能帮助 Talking Room 变得更好。",
      contact: {
        heading: "给我们发邮件",
        body: "需要技术支持、想建议功能、报告房间问题，或讨论合作？请简要说明问题，必要时附上截图。我们会尽快回复。",
        action: "写邮件",
        subject: "Talking Room 支持",
        safetyNote: "请不要通过邮件发送密码、登录验证码或财务信息。"
      }
    },
    about: {
      eyebrow: "Talking Room - For me talk",
      title: "关于我们",
      intro: "一个用于语言练习、倾诉分享和真实连接的在线对话空间，从开口聊天开始。",
      about: {
        cards: [
          { icon: "languages", heading: "练习语言", body: "通过真实对话，把知识转化为自信，话题可贴合你的目标和水平。" },
          { icon: "heart", heading: "一个可以敞开的地方", body: "有些时候，我们只是需要一个友好的空间来分享、倾听，并自然地做自己。" },
          { icon: "users", heading: "自然连接", body: "遇见兴趣相近的人，从新的视角学习，并建立有意义的连接。" }
        ],
        statementHeading: "说话，是为了成长，也是为了被听见。",
        statementBody: "Talking Room - For me talk 建立在一个简单的信念上：真诚的对话可以帮助我们说得更好、更有自信，也让人与人更靠近。不需要僵硬的课程或复杂的资料；选择一个房间，进入其中，从一句问候开始。",
        highlightLabel: "属于你的空间",
        highlightBody: "无论你是来练习一门新语言、分享今天的故事，还是遇见同频的人，Talking Room 都希望每一次对话都容易开始，也值得记住。"
      }
    }
  },
  ja: {
    privacy: {
      eyebrow: "Talking Room とプライバシー",
      title: "プライバシーポリシー",
      intro: "私たちはあなたのプライバシーを尊重し、会話に参加するときにどのデータが扱われるのかを分かりやすく伝えます。",
      privacy: {
        summaryLabel: "要点：",
        summary: "ゲストとしてルームに参加できます。個人データを販売せず、通話を意図的に録音することもありません。",
        updated: "最終更新日：2026年8月5日",
        sections: [
          { heading: "1. 処理する情報", body: "ゲストモードを使う場合、選択した表示名、ルームの状態、メッセージ、マイク・カメラ・画面共有の状態を処理します。ブラウザには表示名、言語、ログインセッションが保存され、体験を維持します。Google でログインする場合、Google アカウント識別子、メールアドレス、表示名、アバター、アカウント種別、アカウント作成時刻、直近のログイン時刻を受け取り保存します。" },
          { heading: "2. 音声、映像、メッセージ", body: "音声、映像、画面共有の内容は WebRTC によりルーム参加者の間でリアルタイムに送信されます。接続は直接行われる場合も、必要に応じて TURN サーバー経由で中継される場合もあります。Talking Room は通話を意図的に録音または保存しません。テキストメッセージとルーム情報はサービス稼働中に一時的にメモリへ保持され、そのルームへ参加する人に提供されることがありますが、恒久的なチャット履歴として設計されていません。" },
          { heading: "3. データの利用目的", body: "データは、ログイン、ルーム内での本人表示、参加者の接続、チャットと通話の運営、セキュリティ維持、エラー診断、サービス安定性の改善に利用します。個人データを販売することはありません。" },
          { heading: "4. サービス提供者", body: "ログイン時には Google が必要なデータを処理する場合があります。また、Talking Room が利用するホスティング、データベース、TURN インフラ提供者も必要なデータを処理する場合があります。これらの提供者は各自の規約とプライバシーポリシーに従ってデータを処理します。" },
          { heading: "5. 保持とセキュリティ", body: "アカウントデータは、アカウントが有効な間、または法律で必要とされる期間保持されます。ローカルに保存されたデータはブラウザ設定から削除できます。合理的な技術的保護策を用いますが、送信または保存システムの完全な安全性は保証できません。" },
          { heading: "6. あなたの選択と権利", body: `ゲストとして参加する、表示名を変更する、マイクやカメラの許可を拒否する、または ${supportEmail} にメールしてアカウントデータのアクセス、修正、削除を依頼できます。デバイス権限を拒否すると、関連機能が使えない場合があります。` },
          { heading: "7. 子どものプライバシー", body: "本サービスは 13 歳未満の子どもを対象としていません。子どもが個人データを提供したと思われる場合はご連絡ください。適切に確認し、必要に応じて削除します。" },
          { heading: "8. 変更と連絡先", body: `機能や法令の変更に応じて、本ポリシーを更新することがあります。更新版と更新日はこのページに表示されます。プライバシーに関する質問は ${supportEmail} までお送りください。` }
        ]
      }
    },
    contact: {
      eyebrow: "声を聞かせてください",
      title: "お問い合わせ",
      intro: "質問、アイデア、フィードバックは、Talking Room をより良くする大切なきっかけです。",
      contact: {
        heading: "メールで連絡",
        body: "技術サポート、機能提案、ルーム内の問題報告、協業の相談などがあれば、内容を簡単に書き、必要に応じてスクリーンショットを添えてください。できるだけ早く返信します。",
        action: "メールを書く",
        subject: "Talking Room サポート",
        safetyNote: "パスワード、ログインコード、金融情報をメールで送らないでください。"
      }
    },
    about: {
      eyebrow: "Talking Room - For me talk",
      title: "私たちについて",
      intro: "言語練習、気持ちの共有、自然なつながりのためのオンライン会話スペースです。ただ話すことから始まります。",
      about: {
        cards: [
          { icon: "languages", heading: "言語を練習する", body: "目標やレベルに合う話題でリアルな会話を重ね、知識を自信に変えていきます。" },
          { icon: "heart", heading: "心を開ける場所", body: "ただ共有し、聞いてもらい、自分らしくいられる温かい場所が必要な時があります。" },
          { icon: "users", heading: "自然につながる", body: "共通の関心を持つ人と出会い、新しい視点から学び、意味のあるつながりを育てます。" }
        ],
        statementHeading: "話して成長する。話して届く。",
        statementBody: "Talking Room - For me talk は、誠実な会話が発音を良くし、自信を育て、人と人を近づけるというシンプルな信念から生まれました。堅いレッスンや複雑なプロフィールは必要ありません。合うルームを選び、入室し、こんにちはから始めましょう。",
        highlightLabel: "あなたのための場所",
        highlightBody: "新しい言語を練習したい日も、今日の出来事を話したい日も、同じ空気感の人に出会いたい日も、Talking Room はすべての会話が始めやすく、思い出に残るものになることを願っています。"
      }
    }
  }
};
