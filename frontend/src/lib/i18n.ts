export type Language = "en" | "vi" | "zh" | "ja";

type TranslationKey =
  | "aboutUs"
  | "backToRooms"
  | "buyMeCoffee"
  | "chat"
  | "closeChat"
  | "connectAndAccess"
  | "connectingServer"
  | "contactUs"
  | "createGroup"
  | "free4TalkApp"
  | "full"
  | "join"
  | "language"
  | "leaveRoom"
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
    closeChat: "Close chat",
    connectAndAccess: "Connect and access",
    connectingServer: "Connecting to server",
    contactUs: "Contact Us",
    createGroup: "Create a new group",
    free4TalkApp: "Free4Talk APP",
    full: "Full",
    join: "Join",
    language: "Language",
    leaveRoom: "Leave room",
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
    closeChat: "Đóng chat",
    connectAndAccess: "Kết nối và vào phòng",
    connectingServer: "Đang kết nối server",
    contactUs: "Liên hệ",
    createGroup: "Tạo nhóm mới",
    free4TalkApp: "Ứng dụng Free4Talk",
    full: "Đầy",
    join: "Vào",
    language: "Ngôn ngữ",
    leaveRoom: "Rời phòng",
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
    closeChat: "关闭聊天",
    connectAndAccess: "连接并进入",
    connectingServer: "正在连接服务器",
    contactUs: "联系我们",
    createGroup: "创建新群组",
    free4TalkApp: "Free4Talk 应用",
    full: "已满",
    join: "加入",
    language: "语言",
    leaveRoom: "离开房间",
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
    closeChat: "チャットを閉じる",
    connectAndAccess: "接続して入室",
    connectingServer: "サーバーに接続中",
    contactUs: "お問い合わせ",
    createGroup: "新しいグループを作成",
    free4TalkApp: "Free4Talk アプリ",
    full: "満室",
    join: "参加",
    language: "言語",
    leaveRoom: "ルームを退出",
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
