export type CommonEnglishSituation = {
  id: string;
  cues: readonly string[];
  responses: readonly string[];
  questions: readonly string[];
};

const inputTemplates = [
  "{cue}",
  "i {cue}",
  "i am {cue}",
  "i feel {cue}",
  "can we talk about {cue}"
] as const;

const baseCommonEnglishSituations: readonly CommonEnglishSituation[] = [
  {
    id: "bored",
    cues: ["bored", "nothing to do", "so bored", "boring day", "feel bored", "bored today", "bored at home", "bored right now", "bored lately", "need something fun"],
    responses: ["That kind of boredom can make time feel weirdly slow.", "A boring day sometimes needs one tiny plan, not a huge change.", "I get that mood; it can make even easy things feel flat."],
    questions: ["What usually makes your day feel more alive?", "Do you want something relaxing or something active?", "What is one small thing you could do in the next ten minutes?"]
  },
  {
    id: "tired",
    cues: ["tired", "exhausted", "sleepy", "low energy", "drained", "worn out", "need rest", "too tired", "feel tired", "no energy"],
    responses: ["That sounds like your brain is asking for a softer pace.", "Low energy can make everything feel twice as heavy.", "Sometimes tired means rest, not more discipline."],
    questions: ["Did you sleep badly or was the day just too much?", "What would help you recover a little?", "Can you take a small break soon?"]
  },
  {
    id: "stress",
    cues: ["stressed", "stress", "under pressure", "too much pressure", "overwhelmed", "anxious", "worried", "nervous", "tense", "can't relax"],
    responses: ["That sounds heavy, especially if your mind keeps looping on it.", "Pressure gets louder when everything feels urgent at once.", "I would slow it down and separate what is real from what is noise."],
    questions: ["What is the biggest pressure right now?", "Is there one thing you can postpone?", "What would make this feel 10 percent easier?"]
  },
  {
    id: "happy",
    cues: ["happy", "excited", "good news", "great day", "awesome", "so glad", "feeling good", "nice day", "proud", "celebrate"],
    responses: ["That is genuinely nice; small wins deserve a little space.", "I like that energy. It sounds like something went right.", "That kind of mood can brighten the whole day."],
    questions: ["What was the best part?", "Did you expect it to happen?", "How are you going to enjoy it?"]
  },
  {
    id: "sad",
    cues: ["sad", "upset", "down", "depressed", "bad mood", "feel bad", "hurt", "heartbroken", "disappointed", "not okay"],
    responses: ["I am sorry it feels that way. That kind of mood can sit quietly but heavily.", "That sounds painful, even if it is hard to explain.", "I would not rush yourself out of that feeling too fast."],
    questions: ["Do you want to talk about what happened?", "Is it more sadness, anger, or disappointment?", "What would feel gentle right now?"]
  },
  {
    id: "english_learning",
    cues: ["learn english", "practice english", "speaking english", "improve english", "english speaking", "english grammar", "english vocabulary", "english pronunciation", "sound natural", "speak fluently"],
    responses: ["The best practice is usually simple and real, not perfect.", "Natural English comes from using clear sentences often.", "A small sentence said confidently is better than a perfect sentence you never say."],
    questions: ["Do you want to practice speaking, vocabulary, or grammar?", "What topic do you want to talk about in English?", "Do you want me to correct you gently?"]
  },
  {
    id: "work",
    cues: ["work", "job", "office", "boss", "coworker", "meeting", "deadline", "project", "salary", "career"],
    responses: ["Work can take up a lot of mental space even after the day ends.", "That sounds like a practical problem with some emotion underneath.", "Career stuff is tricky because it touches time, money, and confidence at once."],
    questions: ["Is this about people, pressure, or direction?", "What part of work is bothering you most?", "Do you want a calm answer or a practical one?"]
  },
  {
    id: "school",
    cues: ["school", "class", "teacher", "student", "exam", "homework", "study", "university", "lesson", "grade"],
    responses: ["Studying gets easier when the task feels smaller and more specific.", "School pressure can make even simple things feel personal.", "A clear study rhythm helps more than random motivation."],
    questions: ["What subject is hardest for you?", "Is the problem time, focus, or confidence?", "What do you need to finish first?"]
  },
  {
    id: "food",
    cues: ["food", "hungry", "cook", "dinner", "lunch", "breakfast", "restaurant", "coffee", "tea", "street food"],
    responses: ["Food is a very underrated conversation topic, honestly.", "That sounds like the kind of thing that depends on mood.", "A good meal can fix more of the day than people admit."],
    questions: ["What do you usually like to eat?", "Are you craving something simple or something special?", "Do you cook often?"]
  },
  {
    id: "travel",
    cues: ["travel", "trip", "vacation", "flight", "hotel", "visit", "country", "city", "beach", "mountain"],
    responses: ["Travel is fun because it changes your routine so quickly.", "A good trip is usually about small moments, not only famous places.", "Planning matters, but leaving room for surprises matters too."],
    questions: ["Where would you like to go first?", "Do you prefer cities, nature, or food trips?", "What kind of trip feels relaxing to you?"]
  },
  {
    id: "music",
    cues: ["music", "song", "playlist", "singer", "band", "concert", "guitar", "piano", "rap", "pop music"],
    responses: ["Music can change the mood of a room really fast.", "I like how songs can hold a memory better than words sometimes.", "That is a good topic; people reveal a lot through their music taste."],
    questions: ["What song have you played a lot recently?", "Do you listen for lyrics or the feeling first?", "What kind of music fits your mood today?"]
  },
  {
    id: "movies",
    cues: ["movie", "film", "series", "netflix", "watch", "cinema", "actor", "drama", "comedy", "horror"],
    responses: ["A good movie is nice because it lets you borrow another mood for a while.", "I like stories that stay in your head after they end.", "Movies are a good way to practice natural English too."],
    questions: ["What kind of movies do you usually like?", "Do you prefer something funny, serious, or strange?", "What was the last movie you watched?"]
  },
  {
    id: "games",
    cues: ["game", "gaming", "play games", "video game", "mobile game", "steam", "rank", "match", "player", "quest"],
    responses: ["Games are fun when they give you just enough challenge.", "I get why people like games; progress feels very clear there.", "Gaming can be relaxing or stressful depending on the people involved."],
    questions: ["What game are you playing lately?", "Do you play to relax or to compete?", "Are you more into story games or online matches?"]
  },
  {
    id: "relationships",
    cues: ["friend", "relationship", "girlfriend", "boyfriend", "crush", "dating", "family", "parents", "argument", "miss someone"],
    responses: ["People problems are hard because logic and emotion do not move at the same speed.", "That sounds personal, so I would be careful with quick advice.", "Relationships often need honesty, but also timing."],
    questions: ["Is this about trust, communication, or distance?", "What do you wish they understood?", "Do you want to fix it or just understand it first?"]
  },
  {
    id: "money",
    cues: ["money", "expensive", "cheap", "budget", "save money", "price", "buy", "shopping", "rent", "pay"],
    responses: ["Money choices can feel small in the moment but big over time.", "It is fair to think carefully before spending.", "A simple budget can remove a lot of stress."],
    questions: ["Is this something you need or something you just want?", "Are you trying to save or decide what to buy?", "What would make the choice feel worth it?"]
  },
  {
    id: "health",
    cues: ["health", "sick", "headache", "sleep", "exercise", "gym", "diet", "doctor", "pain", "healthy"],
    responses: ["Health stuff is worth taking seriously, especially if it keeps coming back.", "Your body usually sends signals before it gets loud.", "Small health habits are boring, but they work quietly."],
    questions: ["Has this been happening for long?", "Is it something you can rest through, or should you check with a doctor?", "What habit would be easiest to improve first?"]
  },
  {
    id: "weather",
    cues: ["weather", "rain", "sunny", "hot", "cold", "storm", "windy", "cloudy", "humid", "temperature"],
    responses: ["Weather changes the mood more than people admit.", "A hot or rainy day can make everyone a little slower.", "That kind of weather makes me want a simple day."],
    questions: ["Do you like this weather or does it annoy you?", "What is the weather like where you are?", "Does weather affect your mood much?"]
  },
  {
    id: "technology",
    cues: ["technology", "phone", "computer", "app", "website", "internet", "software", "ai", "bug", "device"],
    responses: ["Tech is great until it wastes your whole afternoon with one tiny problem.", "A small bug can feel huge when it blocks what you are trying to do.", "I like technology most when it quietly helps instead of demanding attention."],
    questions: ["Is it broken, confusing, or just annoying?", "What were you trying to do before it failed?", "Do you want a simple explanation or troubleshooting?"]
  },
  {
    id: "plans",
    cues: ["plan", "today", "tomorrow", "weekend", "schedule", "busy", "free time", "later", "tonight", "next week"],
    responses: ["A simple plan can make the day feel less blurry.", "Sometimes the best plan is just one clear next thing.", "Your schedule sounds like it needs a bit of breathing room."],
    questions: ["What is the one thing you really need to do?", "Do you want a productive day or a calm one?", "What are you looking forward to?"]
  },
  {
    id: "opinions",
    cues: ["what do you think", "do you think", "your opinion", "is it good", "is it bad", "should i", "would you", "is it worth", "is it okay", "better or worse"],
    responses: ["My honest answer is that it depends, but I would start with the practical side.", "I can see both sides, but one side probably matters more to you.", "I would not decide too fast if the feeling is still loud."],
    questions: ["What outcome do you actually want?", "What is the risk if you do nothing?", "Are you asking for logic or reassurance?"]
  },
  {
    id: "advice",
    cues: ["advice", "help me", "what should i do", "how can i", "how do i", "any tips", "recommend", "suggest", "guide me", "where to start"],
    responses: ["I would keep the first step small enough that you can actually do it.", "The best advice is usually the one you can repeat tomorrow.", "Start with the part you control; that makes the rest less noisy."],
    questions: ["What have you already tried?", "Do you want a quick tip or a step-by-step plan?", "What is blocking you right now?"]
  },
  {
    id: "introductions",
    cues: ["my name is", "i am new", "nice to meet you", "where are you from", "tell me about yourself", "who are you", "first time here", "new here", "call me", "i'm from"],
    responses: ["Nice to meet you. I like conversations that start simple and become more real.", "Glad you are here. We can keep it easy and natural.", "That is a good start; introductions do not need to be formal."],
    questions: ["What should I call you?", "What kind of topics do you like?", "Are you here to practice English or just chat?"]
  },
  {
    id: "confusion",
    cues: ["confused", "don't understand", "hard to understand", "not clear", "lost", "what does it mean", "explain", "meaning", "i don't get it", "unclear"],
    responses: ["That is okay. Confusion usually means the explanation skipped a step.", "We can make it simpler; no need to force the whole thing at once.", "If it feels unclear, the first job is to name the exact confusing part."],
    questions: ["Which word or part is confusing?", "Do you want a simple example?", "Should I explain it in easier English?"]
  },
  {
    id: "confidence",
    cues: ["confidence", "shy", "afraid", "scared", "embarrassed", "not confident", "make mistakes", "nervous to speak", "fear", "insecure"],
    responses: ["That is very normal. Confidence usually comes after doing the scary thing a few times.", "Mistakes feel bigger to you than they sound to other people.", "Being shy does not mean you cannot improve; it just means you need a gentler start."],
    questions: ["What situation makes you most nervous?", "Do you want to practice with very short answers first?", "What mistake are you most afraid of?"]
  },
  {
    id: "time",
    cues: ["time", "late", "early", "busy schedule", "no time", "waste time", "deadline soon", "take too long", "hurry", "slow"],
    responses: ["Time pressure can make even simple choices feel sharp.", "When time is tight, clarity matters more than doing everything.", "I would choose the most useful thing first and leave the rest lighter."],
    questions: ["What is the deadline?", "What can wait until later?", "What would save you the most time right now?"]
  },
  {
    id: "daily_life",
    cues: ["daily life", "routine", "morning", "night", "home", "cleaning", "chores", "habit", "every day", "normal day"],
    responses: ["Daily life is where small habits quietly shape everything.", "A normal day can still say a lot about a person.", "Routine sounds boring, but it can make life feel steadier."],
    questions: ["What is one habit you want to change?", "Do you like routine or do you prefer variety?", "What part of your day feels best?"]
  }
] as const;

type CompactSituation = readonly [id: string, cues: readonly string[], response: string, question: string];

const compactSituations: readonly CompactSituation[] = [
  ["social_anxiety", ["social anxiety", "awkward", "small talk", "meeting people", "talk to strangers", "socially awkward", "shy around people", "crowded room", "new people", "social pressure"], "Social situations can feel bigger when you are already watching yourself too closely.", "What part of talking to people feels hardest?"],
  ["homesick", ["homesick", "miss home", "far from home", "miss my family", "living away", "new city", "alone abroad", "miss my room", "miss my country", "home feeling"], "Missing home can hit quietly, especially when everything around you feels unfamiliar.", "What do you miss most about home?"],
  ["motivation", ["motivation", "no motivation", "stay motivated", "lost motivation", "motivate myself", "need motivation", "feel lazy", "lazy today", "lazy lately", "can't start"], "Motivation is unreliable, so a tiny routine often works better.", "What is the smallest useful step you could take?"],
  ["procrastination", ["procrastination", "procrastinate", "delay work", "put it off", "keep delaying", "do it later", "avoid tasks", "can't begin", "starting is hard", "leave it late"], "Starting is usually the hardest part because the task feels bigger in your head.", "Can you do just two minutes of it first?"],
  ["focus", ["focus", "can't focus", "concentrate", "distracted", "lose focus", "attention", "phone distraction", "focus problem", "mind wandering", "stay focused"], "Focus gets easier when the environment stops fighting you.", "What is distracting you the most right now?"],
  ["sleep_problem", ["can't sleep", "insomnia", "sleep problem", "wake up early", "sleep late", "bad sleep", "sleep schedule", "too awake", "night thoughts", "need sleep"], "Bad sleep can make every problem feel louder the next day.", "Is your body tired, or is your mind still busy?"],
  ["apology", ["sorry", "apologize", "say sorry", "my mistake", "i was wrong", "made a mistake", "hurt someone", "need to apologize", "apology message", "feel guilty"], "A good apology is usually simple, specific, and not too dramatic.", "Do you want it to sound casual or serious?"],
  ["gratitude", ["thankful", "grateful", "appreciate", "say thanks", "thank you message", "thanks a lot", "appreciation", "feel grateful", "kind of you", "thank someone"], "Gratitude sounds best when it names the exact thing that helped.", "Who do you want to thank?"],
  ["compliments", ["compliment", "praise", "nice outfit", "good job", "well done", "say something nice", "encourage someone", "support someone", "give compliment", "positive words"], "A good compliment feels natural when it is specific.", "What exactly did they do well?"],
  ["disagreement", ["disagree", "not agree", "different opinion", "argue politely", "debate politely", "say no", "push back", "not my view", "respectfully disagree", "different point"], "Disagreeing gently is a real skill; tone matters as much as words.", "Do you want to sound soft or direct?"],
  ["asking_repeat", ["repeat", "say again", "pardon", "come again", "i missed that", "didn't catch that", "speak again", "repeat please", "one more time", "what did you say"], "Asking someone to repeat is completely normal in conversation.", "Do you want a casual phrase for that?"],
  ["asking_example", ["example", "give example", "for example", "sample sentence", "show me", "make it clear", "can you show", "example please", "real example", "use it in a sentence"], "Examples make language feel less abstract right away.", "Do you want a simple example or a natural one?"],
  ["translation_request", ["translate", "translation", "how to say", "say this in english", "english version", "convert to english", "what is in english", "natural translation", "translate sentence", "mean in english"], "A natural translation often needs the feeling, not just the words.", "What sentence do you want to say in English?"],
  ["pronunciation_help", ["pronounce", "pronunciation", "how to pronounce", "sound out", "accent", "say this word", "word sound", "speak clearly", "pronunciation practice", "hard to pronounce"], "Pronunciation gets easier when you slow the word down into smaller sounds.", "Which word feels hardest to say?"],
  ["grammar_check", ["grammar check", "is this correct", "correct sentence", "grammar mistake", "fix my sentence", "sentence wrong", "grammar help", "right grammar", "check this", "is it natural"], "A sentence can be correct but still sound a little unnatural.", "Do you want me to fix grammar or make it sound natural?"],
  ["vocabulary_word", ["vocabulary", "new word", "word meaning", "useful word", "hard word", "remember words", "word list", "learn words", "phrase meaning", "common words"], "Vocabulary sticks better when you use the word in a real sentence.", "What word are you trying to remember?"],
  ["small_talk", ["small talk", "casual chat", "chat casually", "start conversation", "keep talking", "awkward silence", "conversation starter", "talk naturally", "friendly chat", "simple conversation"], "Small talk works best when it feels light and specific.", "Do you want a starter question for a real conversation?"],
  ["hobbies", ["hobby", "hobbies", "free time hobby", "what hobby", "new hobby", "find a hobby", "weekend hobby", "creative hobby", "relaxing hobby", "fun activity"], "A good hobby gives your brain somewhere pleasant to go.", "Do you want something social, creative, or quiet?"],
  ["sports", ["sports", "football", "basketball", "running", "swimming", "tennis", "workout sport", "watch sports", "play sport", "team sport"], "Sports are nice because they give energy a place to go.", "Do you prefer playing or watching?"],
  ["pets", ["pet", "dog", "cat", "puppy", "kitten", "animal", "take care of pet", "pet owner", "my dog", "my cat"], "Pets can make a normal day feel warmer.", "What kind of pet do you like most?"],
  ["books", ["book", "reading", "novel", "story", "author", "chapter", "read more", "book club", "favorite book", "reading habit"], "Reading is a quiet way to borrow another person's mind for a while.", "What kind of books do you usually enjoy?"],
  ["art", ["art", "drawing", "painting", "sketch", "design", "creative work", "artist", "illustration", "make art", "art style"], "Art is interesting because it can say things directly or quietly.", "Do you like making art or looking at it?"],
  ["photography", ["photo", "photography", "camera shot", "take pictures", "portrait", "landscape photo", "edit photo", "picture", "photoshoot", "visual style"], "Photos can hold a mood faster than words sometimes.", "What kind of photos do you like taking?"],
  ["cooking", ["cooking", "cook dinner", "recipe", "make food", "kitchen", "homemade", "cook at home", "simple recipe", "meal prep", "try cooking"], "Cooking feels better when the recipe is forgiving.", "Do you want something quick or something fun to make?"],
  ["shopping_clothes", ["clothes", "fashion", "outfit", "shopping clothes", "new shirt", "what to wear", "style", "dress up", "buy clothes", "look good"], "Style is mostly about feeling comfortable in what you choose.", "Do you want to look casual, neat, or confident?"],
  ["commuting", ["commute", "bus", "train", "subway", "ride to work", "go to school", "long commute", "public transport", "taxi", "motorbike ride"], "A long commute can quietly steal a lot of energy.", "Do you use that time to rest or do something useful?"],
  ["traffic", ["traffic", "traffic jam", "stuck in traffic", "road busy", "long drive", "late because traffic", "rush hour", "bad traffic", "motorbike traffic", "traffic noise"], "Traffic is annoying because you lose control of your time.", "Does it happen every day or just today?"],
  ["neighbors", ["neighbor", "noisy neighbor", "next door", "apartment noise", "people upstairs", "building problem", "neighbor issue", "loud music", "complain neighbor", "living nearby"], "Neighbor problems are tricky because you still have to live near them.", "Do you want to handle it politely or firmly?"],
  ["roommate", ["roommate", "flatmate", "shared room", "housemate", "living together", "messy roommate", "roommate problem", "share apartment", "split rent", "shared house"], "Roommate problems usually need clear rules before they become resentment.", "Is it about noise, cleaning, money, or privacy?"],
  ["customer_service", ["customer service", "complain politely", "refund", "return item", "bad service", "support ticket", "contact support", "wrong order", "problem with order", "service problem"], "A calm complaint usually works better when it is specific.", "Do you want help writing the message?"],
  ["restaurant_order", ["order food", "menu", "restaurant order", "waiter", "reservation", "table for two", "bill please", "food order", "order coffee", "eat out"], "Restaurant English is mostly short, polite phrases.", "Do you want to practice ordering naturally?"],
  ["airport", ["airport", "flight delay", "boarding pass", "passport", "check in flight", "luggage", "gate number", "security check", "connecting flight", "baggage claim"], "Airport situations are stressful because everything feels timed.", "Which part of the airport do you want to practice?"],
  ["hotel_checkin", ["hotel", "check in hotel", "reservation hotel", "hotel room", "front desk", "room key", "check out", "hotel booking", "late check in", "hotel problem"], "Hotel English is useful because it follows common patterns.", "Do you need help with check-in or a problem at the hotel?"],
  ["directions", ["directions", "where is", "how to get", "go straight", "turn left", "turn right", "near here", "map", "find place", "which way"], "Direction phrases become easier when you picture the route.", "Are you asking for directions or trying to give them?"],
  ["lost_place", ["lost", "i am lost", "can't find", "wrong way", "lost in city", "lost my way", "where am i", "find the station", "can't locate", "need directions"], "Getting lost is stressful, but the language can stay simple.", "What place are you trying to find?"],
  ["making_friends", ["make friends", "new friend", "meet friends", "friendship", "find friends", "talk to friends", "social circle", "hang out", "close friend", "friend group"], "Friendship usually starts with repeated small moments, not one perfect conversation.", "Where do you usually meet people?"],
  ["online_chat", ["online chat", "texting", "message someone", "reply message", "dm", "chat online", "seen message", "late reply", "send a text", "online friend"], "Texting is hard because tone is easier to imagine than to know.", "Do you want the reply to sound warm or casual?"],
  ["social_media", ["social media", "instagram", "tiktok", "facebook", "post online", "scrolling", "followers", "likes", "online profile", "viral"], "Social media can make normal life feel strangely competitive.", "Does it inspire you or drain you more?"],
  ["privacy", ["privacy", "personal information", "private", "share too much", "keep private", "online safety", "data privacy", "secret", "personal boundary", "trust online"], "Privacy is worth protecting before it becomes a problem.", "What information are you unsure about sharing?"],
  ["news", ["news", "current events", "headline", "world news", "local news", "breaking news", "politics", "read news", "bad news", "latest news"], "News can be useful, but too much of it can make your mind noisy.", "Do you want to understand it or just talk about how it feels?"],
  ["culture", ["culture", "different culture", "culture shock", "tradition", "custom", "local culture", "cultural difference", "manners", "respect culture", "foreign culture"], "Culture is interesting because small habits can mean big things.", "What difference surprised you most?"],
  ["holidays", ["holiday", "festival", "new year", "christmas", "vacation day", "day off", "celebration", "family holiday", "traditional holiday", "holiday plan"], "Holidays can be joyful, but they can also carry pressure.", "Do you enjoy busy celebrations or quiet ones?"],
  ["birthday", ["birthday", "birthday party", "turning older", "birthday gift", "happy birthday", "birthday plan", "birthday message", "birthday dinner", "my birthday", "friend birthday"], "Birthdays are funny because they can feel happy and reflective at the same time.", "Do you like celebrating your birthday?"],
  ["gifts", ["gift", "present", "buy a gift", "gift idea", "birthday present", "surprise gift", "cheap gift", "meaningful gift", "give a gift", "receive gift"], "A thoughtful gift usually beats an expensive one.", "Who is the gift for?"],
  ["plans_cancel", ["cancel plans", "cancel meeting", "can't come", "reschedule", "change plans", "rain check", "cancel politely", "postpone", "not available", "can't make it"], "Canceling sounds better when you are clear and respectful.", "Do you want a polite message for it?"],
  ["invitation", ["invite", "invitation", "come with me", "join us", "hang out", "go out", "party invite", "invite friend", "ask someone out", "meet up"], "A natural invitation should feel easy to say no to.", "Do you want it to sound casual or a bit warmer?"],
  ["appointment", ["appointment", "book appointment", "schedule appointment", "meeting time", "available time", "reschedule appointment", "calendar", "set a time", "confirm appointment", "appointment reminder"], "Appointment English is mostly about being clear with time.", "What time do you want to suggest?"],
  ["doctor_visit", ["doctor", "see a doctor", "medical appointment", "clinic", "symptoms", "fever", "cough", "feel sick", "doctor visit", "health check"], "Medical English should be simple and accurate.", "What symptom do you need to describe?"],
  ["pharmacy", ["pharmacy", "medicine", "prescription", "painkiller", "cold medicine", "buy medicine", "drugstore", "take pills", "side effect", "medicine advice"], "At a pharmacy, clear symptoms matter more than long explanations.", "What are you trying to ask for?"],
  ["emergency", ["emergency", "need help now", "urgent", "call police", "call ambulance", "accident", "danger", "help quickly", "serious problem", "emergency situation"], "In an emergency, simple direct English is best.", "Do you need a sentence to ask for help?"],
  ["safety", ["safety", "safe", "unsafe", "dangerous", "be careful", "protect myself", "avoid danger", "safe place", "security", "feel unsafe"], "If something feels unsafe, it is okay to choose caution first.", "What is making you feel unsafe?"],
  ["exercise_plan", ["exercise plan", "workout plan", "start gym", "fitness goal", "run more", "train", "get fit", "home workout", "exercise routine", "workout habit"], "A workout plan works better when it is easy enough to repeat.", "Do you want strength, energy, or weight control?"],
  ["weight_loss", ["lose weight", "weight loss", "diet plan", "eat healthy", "calories", "body weight", "fitness diet", "slim down", "gain weight", "healthy body"], "Body goals are easier when they are kind and realistic.", "Are you focusing on food, exercise, or routine first?"],
  ["meditation", ["meditation", "mindfulness", "calm down", "breathe", "breathing exercise", "clear my mind", "relax mind", "mental break", "quiet mind", "stress relief"], "A calm mind often starts with one slow breath, not a perfect routine.", "Do you want a tiny breathing exercise?"],
  ["productivity", ["productivity", "be productive", "productive day", "get things done", "task list", "to do list", "organize work", "finish tasks", "manage tasks", "productive routine"], "Productivity is easier when the next action is obvious.", "What is the first task on your list?"],
  ["goals", ["goal", "life goal", "set goals", "achieve goals", "big goal", "small goal", "future goal", "goal setting", "personal goal", "long term goal"], "A goal feels less scary when it turns into a repeatable habit.", "What would progress look like this week?"],
  ["habits", ["habit", "bad habit", "good habit", "build habit", "break habit", "daily habit", "new habit", "habit tracker", "routine habit", "change habit"], "Habits change more easily when the trigger is clear.", "What usually starts the habit?"],
  ["decision_making", ["decision", "decide", "choose", "choice", "can't decide", "hard choice", "make a decision", "which one", "option", "pick one"], "A hard decision usually has one hidden priority underneath it.", "What matters most: time, money, comfort, or risk?"],
  ["regret", ["regret", "i regret", "made wrong choice", "wish i did", "mistake from past", "feel regret", "bad decision", "if only", "should have", "past mistake"], "Regret is painful because it keeps replaying a version you cannot edit.", "What lesson can you keep without punishing yourself?"],
  ["apology_needed", ["need to say sorry", "should apologize", "apologize to friend", "sorry message", "make it right", "fix mistake", "own my mistake", "apology text", "say sorry politely", "apologize first"], "Owning the mistake clearly usually matters more than finding perfect words.", "What exactly do you need to apologize for?"],
  ["forgiveness", ["forgive", "forgiveness", "can't forgive", "forgive someone", "move on", "let it go", "still angry", "resentment", "hard to forgive", "accept apology"], "Forgiveness does not always mean pretending it was okay.", "Are you trying to forgive them or protect yourself?"],
  ["jealousy", ["jealous", "jealousy", "envy", "feel jealous", "compare myself", "someone better", "insecure feeling", "envy someone", "comparison", "not good enough"], "Jealousy often points to something you care about but have not named yet.", "What do you think you are comparing?"],
  ["loneliness", ["lonely", "alone", "feel alone", "no friends", "empty feeling", "lonely night", "isolated", "need company", "alone at home", "miss talking"], "Loneliness can feel loud even when nothing dramatic happened.", "Would chatting a little help right now?"],
  ["family_pressure", ["family pressure", "parents pressure", "family expectation", "strict parents", "family problem", "parent advice", "family argument", "family stress", "relatives", "family opinion"], "Family pressure is hard because love and expectation can get mixed together.", "What do they expect from you?"],
  ["job_interview", ["interview", "job interview", "interview question", "prepare interview", "answer interview", "nervous interview", "interview practice", "hiring", "tell me about yourself", "interview tips"], "Interview answers work best when they sound prepared but still human.", "Do you want to practice a common interview question?"],
  ["resume", ["resume", "cv", "cover letter", "work experience", "job application", "apply job", "resume summary", "cv writing", "career profile", "application letter"], "A resume should make your value easy to see quickly.", "What role are you applying for?"],
  ["presentation", ["presentation", "public speaking", "present", "slides", "speech", "talk in front", "audience", "stage fear", "present project", "presentation practice"], "A presentation feels better when the opening is clear and simple.", "What is the main point you need people to remember?"],
  ["email_writing", ["email", "write email", "formal email", "reply email", "email subject", "send email", "business email", "polite email", "email tone", "email draft"], "Good email writing is mostly clear purpose plus polite tone.", "Who is the email for?"],
  ["phone_call", ["phone call", "call someone", "talk on phone", "answer phone", "make a call", "phone conversation", "call in english", "calling support", "missed call", "phone anxiety"], "Phone calls are harder because you cannot rely on facial expressions.", "Do you want a script for the call?"],
  ["negotiation", ["negotiate", "negotiation", "ask discount", "salary negotiation", "deal", "make offer", "counter offer", "lower price", "bargain", "discuss terms"], "Negotiation works better when you stay calm and specific.", "What are you trying to ask for?"],
  ["startup", ["startup", "business idea", "start business", "entrepreneur", "customer", "market", "sell product", "business plan", "side hustle", "make money online"], "A business idea gets clearer when you know who it helps.", "Who is the first customer you imagine?"],
  ["learning_code", ["learn coding", "programming", "code", "javascript", "python", "bug in code", "software developer", "coding practice", "build app", "learn to code"], "Coding gets less scary when you solve one tiny problem at a time.", "What are you trying to build or fix?"],
  ["creativity", ["creative", "creativity", "creative block", "new idea", "brainstorm", "write story", "make something", "creative work", "idea stuck", "inspiration"], "Creative blocks often loosen when you make something imperfect on purpose.", "What are you trying to create?"],
  ["future_dreams", ["future", "dream", "dream job", "life plan", "where to go", "future self", "five years", "my dream", "future career", "big dream"], "Thinking about the future can feel exciting and heavy at the same time.", "What future version of yourself feels most real?"],
  ["sleep_dreams", ["dream last night", "weird dream", "bad dream", "nightmare", "dream meaning", "strange dream", "dream about", "sleep dream", "remember dream", "had a dream"], "Dreams can feel meaningful even when they are messy.", "What part of the dream stayed with you?"],
  ["weekend", ["weekend", "weekend plan", "saturday", "sunday", "free weekend", "weekend trip", "weekend mood", "lazy weekend", "busy weekend", "weekend activity"], "A good weekend needs either rest or a small thing to look forward to.", "Do you want this weekend to be calm or active?"],
  ["morning_routine", ["morning routine", "wake up", "start the day", "morning habit", "early morning", "morning coffee", "morning plan", "get up early", "bad morning", "morning energy"], "The morning can set the tone, but it does not have to be perfect.", "What is the first thing you usually do after waking up?"],
  ["night_routine", ["night routine", "before bed", "late night", "sleep routine", "night habit", "wind down", "evening routine", "go to bed", "night time", "bedtime"], "A softer night routine can make tomorrow feel less rough.", "What helps you calm down before bed?"],
  ["cleaning", ["clean room", "messy room", "cleaning", "organize room", "declutter", "dirty room", "house chores", "clean house", "tidy up", "mess everywhere"], "Cleaning feels easier when you choose one small area first.", "What is the easiest corner to start with?"],
  ["moving_house", ["move house", "new apartment", "moving out", "new place", "pack boxes", "rent apartment", "house hunting", "new home", "move to city", "moving day"], "Moving is tiring because it changes both your space and your routine.", "Are you excited, stressed, or both?"],
  ["language_exchange", ["language exchange", "practice partner", "speaking partner", "exchange languages", "find partner", "talk with native", "conversation partner", "english buddy", "study partner", "language buddy"], "A good practice partner makes mistakes feel normal.", "What kind of partner would help you most?"],
  ["chat_openers", ["how to start chat", "first message", "text opener", "say hello first", "start texting", "open conversation", "message opener", "start talking", "break the ice", "first line"], "The first message should be simple enough to answer.", "Do you want it friendly, funny, or direct?"],
  ["goodbye", ["goodbye", "bye", "see you", "talk later", "leave chat", "end conversation", "say goodbye", "good night", "catch you later", "end politely"], "A good goodbye can be warm without being too formal.", "Do you want a casual goodbye phrase?"],
  ["agreement", ["agree", "i agree", "same here", "exactly", "true", "that's right", "i think so too", "good point", "fair point", "makes sense"], "Agreement sounds more natural when you add a small reason.", "What part do you agree with most?"],
  ["surprise", ["surprised", "wow", "unexpected", "can't believe it", "shocked", "no way", "really", "amazing", "surprise news", "didn't expect"], "Surprise makes a story feel alive quickly.", "Was it a good surprise or a stressful one?"],
  ["anger", ["angry", "mad", "annoyed", "frustrated", "irritated", "pissed off", "lose temper", "so annoying", "upset with someone", "angry today"], "Anger usually means something important felt ignored or crossed.", "What exactly made you angry?"],
  ["waiting", ["waiting", "wait too long", "late reply", "waiting room", "wait for someone", "delayed", "still waiting", "be patient", "waiting time", "long wait"], "Waiting is hard because your mind keeps filling the empty space.", "What are you waiting for?"],
  ["memory", ["remember", "forget", "bad memory", "memory", "can't remember", "forgot", "remember words", "forget easily", "memory problem", "memorize"], "Memory improves when the thing is connected to a real use.", "What are you trying to remember?"],
  ["jokes", ["joke", "funny", "humor", "make a joke", "laugh", "sarcasm", "funny story", "tell joke", "sense of humor", "just kidding"], "Humor works best when it fits the moment, not when it tries too hard.", "Do you like dry humor or silly humor?"],
  ["complaint", ["complaint", "complain", "bad experience", "not satisfied", "poor service", "unhappy customer", "problem report", "file complaint", "complaint email", "angry customer"], "A clear complaint should say what happened and what you want next.", "Do you want it polite, firm, or very short?"],
  ["asking_permission", ["permission", "can i", "may i", "is it okay if", "allowed to", "ask permission", "can we", "would it be okay", "need permission", "let me"], "Permission questions sound better when they are direct and polite.", "What do you want to ask permission for?"],
  ["making_request", ["request", "can you help", "could you", "would you mind", "ask for help", "need help with", "favor", "help request", "ask politely", "request politely"], "A polite request is usually clear, short, and easy to answer.", "Who are you asking?"],
  ["giving_reason", ["because", "reason", "why i", "explain why", "my reason", "reason is", "give reason", "justify", "explanation", "why because"], "Reasons feel stronger when they are simple and honest.", "Do you want the reason to sound personal or practical?"],
  ["storytelling", ["story", "tell a story", "what happened", "then what", "after that", "funny story", "personal story", "share story", "story time", "describe experience"], "A good story needs one clear moment, not every detail.", "What was the turning point?"],
  ["describing_people", ["describe person", "personality", "kind person", "funny person", "strict person", "friendly person", "quiet person", "describe friend", "describe someone", "what are they like"], "Describing a person sounds natural when you include one behavior.", "What do they usually do that shows their personality?"],
  ["describing_places", ["describe place", "beautiful place", "busy place", "quiet place", "my hometown", "city description", "favorite place", "place to visit", "where i live", "local area"], "A place becomes easier to describe when you include sound, feeling, or routine.", "What does that place feel like?"],
  ["describing_objects", ["describe object", "my phone", "my bag", "favorite thing", "useful thing", "lost item", "object description", "something i bought", "this item", "my laptop"], "Objects are easier to describe through how you use them.", "What do you use it for most?"],
  ["preferences", ["prefer", "preference", "rather", "which do you prefer", "i like better", "favorite choice", "choose between", "more comfortable", "my type", "not my style"], "Preferences feel more natural when you add a small reason.", "What makes one option better for you?"],
  ["past_experience", ["last time", "before", "past experience", "used to", "when i was", "years ago", "previously", "old memory", "first time", "once i"], "Past experiences usually explain why something matters now.", "What did you learn from it?"],
  ["future_plan", ["will", "going to", "future plan", "plan to", "next year", "soon", "one day", "in the future", "hope to", "want to become"], "Future plans feel clearer when they include one next action.", "What is the first step toward that plan?"],
  ["making_choice", ["option a", "option b", "two options", "choose one", "which is better", "hard to choose", "best option", "compare options", "this or that", "make choice"], "Comparing options works better when you choose the deciding factor first.", "What matters most in this choice?"],
  ["asking_price", ["how much", "price", "cost", "expensive price", "cheap price", "discount price", "worth the price", "price range", "pay for it", "costs too much"], "Price questions are easier when you know the value you expect.", "What budget feels comfortable?"],
  ["making_offer", ["offer", "make offer", "offer help", "can i help", "let me help", "i can do it", "offer to pay", "offer support", "offer idea", "give option"], "An offer sounds natural when it gives the other person room to say no.", "What kind of help do you want to offer?"],
  ["accepting_invite", ["accept invite", "sounds good", "i can come", "count me in", "yes i will", "accept invitation", "i'd love to", "sure i can", "join you", "say yes"], "Accepting an invite can be simple and warm.", "Do you want the reply to sound excited or casual?"],
  ["declining_invite", ["decline invite", "can't go", "not free", "busy that day", "say no politely", "maybe next time", "can't join", "decline politely", "not available", "skip event"], "Saying no politely is easier when you keep it honest and brief.", "Do you want to suggest another time?"],
  ["checking_understanding", ["do you understand", "make sense", "is that clear", "did you get it", "understand me", "follow me", "am i clear", "you know what i mean", "does it make sense", "checking understanding"], "Checking understanding is useful when you do it gently.", "Do you want a natural phrase for that?"],
  ["repair_conversation", ["awkward conversation", "fix conversation", "conversation died", "no reply", "they stopped replying", "change topic", "keep chat alive", "dead chat", "boring chat", "restart conversation"], "A quiet conversation can be restarted with a simple, specific question.", "Do you want a new topic opener?"],
  ["expressing_feelings", ["feelings", "express feelings", "say how i feel", "hard to express", "talk about feelings", "emotional", "open up", "be honest", "share feelings", "tell feelings"], "Feelings sound clearer when you use simple words instead of perfect ones.", "What feeling are you trying to say?"],
  ["setting_boundaries", ["boundary", "set boundary", "say no", "personal space", "need space", "too much", "stop doing that", "not comfortable", "respect my boundary", "limit"], "A boundary works best when it is calm and direct.", "What do you need them to stop or understand?"],
  ["making_promise", ["promise", "i promise", "commit", "keep promise", "break promise", "make commitment", "i will try", "be reliable", "trust me", "promise someone"], "Promises should be smaller than your confidence and bigger than your excuses.", "What can you realistically promise?"],
  ["checking_in", ["check in", "how have you been", "are you okay", "checking on you", "just checking", "hope you're okay", "how's everything", "how are things", "follow up", "message again"], "A check-in feels warmer when it is simple and low pressure.", "Who do you want to check on?"]
] as const;

function makeCompactSituation([id, cues, response, question]: CompactSituation): CommonEnglishSituation {
  return {
    id,
    cues,
    responses: [
      response,
      `${response} It is usually easier when you keep the first sentence simple.`,
      `${response} A specific example would make it feel more natural.`
    ],
    questions: [
      question,
      "Do you want a casual phrase for that?",
      "Should it sound soft, direct, or friendly?"
    ]
  };
}

const extraCommonEnglishSituations = compactSituations.slice(0, 74).map(makeCompactSituation);

export const commonEnglishSituations: readonly CommonEnglishSituation[] = [
  ...baseCommonEnglishSituations,
  ...extraCommonEnglishSituations
];

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)]!;
}

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/[^a-z0-9\s'-]/g, " ").replace(/\s+/g, " ").trim();
}

export function estimateCommonEnglishSituationInputs() {
  return commonEnglishSituations.reduce((total, situation) => total + situation.cues.length * inputTemplates.length, 0);
}

export function estimateCommonEnglishSituationCount() {
  return commonEnglishSituations.length;
}

export function buildCommonEnglishSituationResponse(message: string) {
  const clean = normalize(message);
  const match = commonEnglishSituations.find((situation) => situation.cues.some((cue) => clean.includes(cue)));
  if (!match) return null;
  return `${pick(match.responses)} ${pick(match.questions)}`;
}
