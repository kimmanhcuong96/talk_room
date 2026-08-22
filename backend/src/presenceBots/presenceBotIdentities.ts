const vietnameseNames = [
  "Nguyễn Minh Anh", "Trần Quốc Bảo", "Lê Thu Hà", "Phạm Gia Huy", "Hoàng Ngọc Lan",
  "Võ Đức Minh", "Đặng Khánh Linh", "Bùi Thanh Nam", "Đỗ Hải Yến", "Hồ Quang Vinh",
  "Ngô Mai Phương", "Dương Tuấn Kiệt", "Lý Bảo Ngọc", "Vũ Anh Khoa", "Phan Thảo Vy",
  "Trương Nhật Minh", "Đinh Hà My"
] as const;

const chineseNames = [
  "李伟", "王芳", "张敏", "刘洋", "陈静", "杨磊", "赵欣怡", "黄俊杰", "周雨桐",
  "吴子涵", "徐嘉豪", "孙梦琪", "胡浩然", "朱晓彤", "高宇轩", "林诗雅", "何文博"
] as const;

const koreanNames = [
  "김민준", "이서연", "박지훈", "최지우", "정현우", "강수빈", "조도윤", "윤하은",
  "장예준", "임서현", "한시우", "오유진", "서준호", "신채원", "권태민", "황나연"
] as const;

const britishNames = [
  "Oliver Bennett", "Amelia Clarke", "George Whitmore", "Isla Thompson", "Harry Collins",
  "Sophie Harrington", "Arthur Hughes", "Freya Mitchell", "Jack Fletcher", "Emily Davies",
  "Thomas Walker", "Grace Wilson", "Henry Parker", "Lily Morgan", "Edward Foster", "Charlotte Reed"
] as const;

const americanNames = [
  "Ethan Miller", "Olivia Carter", "Noah Anderson", "Ava Robinson", "Liam Jackson",
  "Mia Harris", "Lucas Martin", "Sophia Thompson", "Mason Garcia", "Harper Lewis",
  "Logan Clark", "Ella Martinez", "James Walker", "Chloe Hall", "Benjamin Young",
  "Zoe King", "Daniel Scott"
] as const;

const indianNames = [
  "Aarav Sharma", "Ananya Patel", "Vihaan Reddy", "Diya Gupta", "Arjun Mehta",
  "Isha Nair", "Kabir Singh", "Meera Iyer", "Rohan Kapoor", "Saanvi Joshi",
  "Aditya Rao", "Kavya Desai", "Rahul Verma", "Priya Malhotra", "Neel Shah",
  "Tara Menon", "Vikram Bhat"
] as const;

export const presenceBotNames = [
  ...vietnameseNames,
  ...chineseNames,
  ...koreanNames,
  ...britishNames,
  ...americanNames,
  ...indianNames
] as const;

export const presenceBotIllustrationAvatars = Array.from(
  { length: 20 },
  (_, index) => `/avatars/bot-scenes/presence-${String(index + 1).padStart(2, "0")}.svg`
);

function initialsForName(name: string) {
  const words = name.trim().split(/\s+/u);
  if (words.length > 1) {
    return `${Array.from(words[0] ?? "")[0] ?? ""}${Array.from(words.at(-1) ?? "")[0] ?? ""}`.toLocaleUpperCase();
  }
  return Array.from(name).slice(0, 2).join("").toLocaleUpperCase();
}

export const presenceBotIdentityPool = presenceBotNames.map((name, index) => {
  const hue = Math.round((index * 137.508) % 360);
  const avatar = index % 5 === 4
    ? presenceBotIllustrationAvatars[Math.floor(index / 5)]!
    : `initials:${encodeURIComponent(initialsForName(name))}:${hue}`;
  return { name, avatar };
});

export function selectPresenceBotIdentity(random = Math.random) {
  const index = Math.min(
    presenceBotIdentityPool.length - 1,
    Math.max(0, Math.floor(random() * presenceBotIdentityPool.length))
  );
  return presenceBotIdentityPool[index] ?? presenceBotIdentityPool[0]!;
}
