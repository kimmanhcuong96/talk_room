import type { RoomLanguage } from "../rooms/roomLanguages.js";

const messagesByLanguage: Record<RoomLanguage, readonly string[]> = {
  en: [
    "Hi, what are you practicing today?", "I'm working on my listening skills.", "That sounds like a good plan.",
    "I learned a few useful words today.", "Does anyone have a favorite study method?", "Short daily practice really helps.",
    "I'm going to focus for a while.", "Good luck with your practice!", "This room feels nice and calm.", "See you again later."
  ],
  vi: [
    "Chào mọi người, hôm nay bạn đang luyện gì vậy?", "Mình đang luyện kỹ năng nghe.", "Kế hoạch đó nghe hay đấy.",
    "Hôm nay mình học được vài từ mới khá hữu ích.", "Mọi người thường học theo phương pháp nào?", "Luyện tập một chút mỗi ngày rất hiệu quả.",
    "Mình sẽ tập trung học một lúc nhé.", "Chúc mọi người học tốt!", "Phòng này yên tĩnh và dễ tập trung thật.", "Hẹn gặp lại mọi người sau nhé."
  ],
  zh: [
    "大家好，你们今天在练习什么？", "我正在练习听力。", "听起来是个不错的计划。",
    "我今天学了几个很实用的新词。", "大家有什么喜欢的学习方法吗？", "每天练习一会儿真的很有帮助。",
    "我要专心学习一会儿。", "祝大家学习顺利！", "这个房间很安静，很适合学习。", "下次再见。"
  ],
  ja: [
    "こんにちは。今日は何を練習していますか？", "私はリスニングを練習しています。", "いい計画ですね。",
    "今日は役に立つ単語をいくつか覚えました。", "みなさんの好きな勉強方法は何ですか？", "毎日少しずつ練習すると効果がありますね。",
    "しばらく集中して勉強します。", "みなさん、勉強を頑張ってください！", "この部屋は静かで集中しやすいですね。", "また後で会いましょう。"
  ],
  es: [
    "Hola, ¿qué están practicando hoy?", "Estoy practicando la comprensión auditiva.", "Parece un buen plan.",
    "Hoy aprendí algunas palabras muy útiles.", "¿Alguien tiene un método de estudio favorito?", "Practicar un poco cada día ayuda mucho.",
    "Voy a concentrarme un rato.", "¡Buena suerte con la práctica!", "Esta sala es tranquila y agradable.", "Nos vemos más tarde."
  ],
  fr: [
    "Bonjour, qu'est-ce que vous travaillez aujourd'hui ?", "Je travaille ma compréhension orale.", "C'est un bon programme.",
    "J'ai appris quelques mots utiles aujourd'hui.", "Vous avez une méthode d'étude préférée ?", "Un peu de pratique chaque jour aide beaucoup.",
    "Je vais me concentrer un moment.", "Bon courage pour vos exercices !", "Cette salle est calme et agréable.", "À plus tard."
  ],
  de: [
    "Hallo, was übt ihr heute?", "Ich übe gerade mein Hörverstehen.", "Das klingt nach einem guten Plan.",
    "Heute habe ich ein paar nützliche Wörter gelernt.", "Hat jemand eine bevorzugte Lernmethode?", "Ein bisschen Übung jeden Tag hilft wirklich.",
    "Ich konzentriere mich jetzt eine Weile.", "Viel Erfolg beim Üben!", "Dieser Raum ist angenehm ruhig.", "Bis später."
  ],
  pt: [
    "Olá, o que vocês estão praticando hoje?", "Estou praticando a compreensão auditiva.", "Parece um bom plano.",
    "Hoje aprendi algumas palavras úteis.", "Alguém tem um método de estudo favorito?", "Praticar um pouco todos os dias ajuda muito.",
    "Vou me concentrar por um tempo.", "Boa sorte com os estudos!", "Esta sala é tranquila e agradável.", "Até mais tarde."
  ],
  ru: [
    "Привет! Что вы сегодня практикуете?", "Я сейчас тренирую понимание речи на слух.", "Звучит как хороший план.",
    "Сегодня я выучил несколько полезных слов.", "У кого-нибудь есть любимый способ учиться?", "Небольшая практика каждый день очень помогает.",
    "Я немного позанимаюсь сосредоточенно.", "Удачи всем в занятиях!", "В этой комнате спокойно и уютно.", "До встречи позже."
  ],
  ar: [
    "مرحباً، ماذا تتدربون اليوم؟", "أنا أتدرب على مهارة الاستماع.", "تبدو هذه خطة جيدة.",
    "تعلمت اليوم بعض الكلمات المفيدة.", "هل لدى أحد طريقة مفضلة للدراسة؟", "التدرب قليلاً كل يوم مفيد جداً.",
    "سأركز في الدراسة لبعض الوقت.", "بالتوفيق للجميع في التدريب!", "هذه الغرفة هادئة ومريحة.", "أراكم لاحقاً."
  ],
  hi: [
    "नमस्ते, आज आप क्या अभ्यास कर रहे हैं?", "मैं सुनने का अभ्यास कर रहा हूँ।", "यह एक अच्छी योजना लगती है।",
    "आज मैंने कुछ उपयोगी नए शब्द सीखे।", "क्या किसी की कोई पसंदीदा अध्ययन विधि है?", "हर दिन थोड़ा अभ्यास सच में मदद करता है।",
    "मैं कुछ देर ध्यान लगाकर पढ़ूँगा।", "आप सभी के अभ्यास के लिए शुभकामनाएँ!", "यह कमरा शांत और अच्छा है।", "फिर मिलते हैं।"
  ],
  bn: [
    "হ্যালো, আজ আপনারা কী অনুশীলন করছেন?", "আমি শোনার দক্ষতা অনুশীলন করছি।", "এটা ভালো পরিকল্পনা মনে হচ্ছে।",
    "আজ আমি কয়েকটি দরকারি নতুন শব্দ শিখেছি।", "কারও কি পছন্দের কোনো শেখার পদ্ধতি আছে?", "প্রতিদিন অল্প অনুশীলন সত্যিই কাজে দেয়।",
    "আমি কিছুক্ষণ মন দিয়ে পড়ব।", "সবার অনুশীলন ভালো হোক!", "এই ঘরটি শান্ত এবং আরামদায়ক।", "পরে আবার দেখা হবে।"
  ],
  id: [
    "Halo, kalian sedang berlatih apa hari ini?", "Saya sedang berlatih kemampuan mendengarkan.", "Kedengarannya seperti rencana yang bagus.",
    "Hari ini saya belajar beberapa kata yang berguna.", "Ada yang punya metode belajar favorit?", "Berlatih sebentar setiap hari sangat membantu.",
    "Saya akan fokus belajar sebentar.", "Semoga latihannya lancar!", "Ruangan ini tenang dan nyaman.", "Sampai jumpa lagi."
  ],
  ko: [
    "안녕하세요, 오늘은 무엇을 연습하고 계세요?", "저는 듣기 연습을 하고 있어요.", "좋은 계획인 것 같아요.",
    "오늘 유용한 단어를 몇 개 배웠어요.", "여러분이 좋아하는 공부 방법은 무엇인가요?", "매일 조금씩 연습하면 정말 도움이 돼요.",
    "저는 잠시 집중해서 공부할게요.", "모두 연습 잘 하세요!", "이 방은 조용하고 편안하네요.", "나중에 또 만나요."
  ]
};

export function getRandomVirtualChatMessage(language: RoomLanguage, previousMessage?: string) {
  const messages = messagesByLanguage[language];
  const alternatives = previousMessage && messages.length > 1
    ? messages.filter((message) => message !== previousMessage)
    : messages;
  return alternatives[Math.floor(Math.random() * alternatives.length)]!;
}
