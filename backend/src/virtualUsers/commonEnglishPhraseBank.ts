import type { VirtualUserProfile } from "./virtualUserTypes.js";
import { buildCommonEnglishSituationResponse } from "./commonEnglishSituations.js";

const openers = [
  "I get that",
  "That makes sense",
  "I see your point",
  "Honestly, I can relate to that",
  "That feels pretty real",
  "I know what you mean",
  "That is a fair way to look at it",
  "I can understand that",
  "That sounds familiar",
  "I would probably feel the same",
  "I have had that thought before",
  "That is not a strange thing to say",
  "I can see why you would feel that",
  "That is a very normal reaction",
  "I am with you on that",
  "That sounds pretty human to me",
  "I can follow that",
  "That is actually a useful point",
  "I would not dismiss that",
  "That has a real feeling behind it",
  "I think I understand the mood",
  "That is a fair concern",
  "That is a solid way to put it",
  "I can hear the frustration there",
  "That is more common than people admit",
  "I would pause on that too",
  "That sounds like something worth unpacking",
  "I can see the logic in that",
  "That feels like a real-life problem",
  "I would take that seriously",
  "That is a pretty honest reaction",
  "I can tell this matters to you",
  "That is not a small thing",
  "I would be curious about that too",
  "That sounds like a very human question",
  "I can see why it stayed in your head",
  "That is a reasonable place to start",
  "I think you are noticing something useful",
  "That sounds like the kind of thing that builds up",
  "I can see both the emotion and the logic",
  "That is a good instinct",
  "I would not rush past that",
  "That feels like it needs a calmer look",
  "I can see why it feels complicated",
  "That is a practical concern",
  "I think there is something real in that",
  "That sounds like a situation with layers",
  "I would want to understand the background too",
  "That is a normal thing to wonder about",
  "I can see why the answer is not obvious"
] as const;

const concreteReactions = [
  "the small detail is probably the important part",
  "the timing changes everything",
  "it sounds simple, but it is not always easy",
  "people usually underestimate that part",
  "there is more feeling in it than it looks",
  "the context matters more than the perfect answer",
  "that kind of thing can change your whole mood",
  "it depends on what you want from it",
  "the first step matters more than the perfect plan",
  "it feels easier when you make it specific",
  "people often make it harder than it needs to be",
  "the simple version is usually the most honest one",
  "it matters more when it affects your daily life",
  "the feeling behind it tells you a lot",
  "it is easier to handle when you name it clearly",
  "one small choice can change the direction",
  "the pressure usually makes it feel bigger",
  "it can be both true and uncomfortable",
  "the answer might be less dramatic than it feels",
  "it is worth slowing down for a second",
  "the useful answer is probably the practical one",
  "you do not need a perfect plan to begin",
  "the first reaction is not always the final truth",
  "it helps to separate the fact from the feeling",
  "the right answer might be smaller than expected",
  "it becomes easier when you remove the pressure",
  "you might need clarity more than motivation",
  "the habit behind it matters more than one moment",
  "it usually gets clearer after one honest example",
  "the difficult part is probably naming the real issue",
  "a calm answer will work better than a perfect answer",
  "people often need permission to keep it simple",
  "the best move is probably the one you can repeat",
  "a little distance can make the answer less noisy",
  "the emotional part deserves attention too",
  "it may be less about skill and more about confidence",
  "small progress counts more than it feels like",
  "you can respect the feeling without obeying it",
  "the answer may change once you try it once",
  "it is easier when you stop making it a performance",
  "the real question might be what you are avoiding",
  "the useful version is the one you can actually use",
  "it probably needs patience more than intensity",
  "there is a difference between hard and impossible",
  "a clear example would make the whole thing easier",
  "it sounds like the kind of thing that improves slowly",
  "the pressure to answer fast can make it worse",
  "you might already know the first small step",
  "it is okay if the answer is a little messy"
] as const;

const followUps = [
  "What part feels hardest right now?",
  "How did that start?",
  "What would make it easier?",
  "Is that a recent feeling?",
  "What do you want to do next?",
  "Does it happen often?",
  "What is one example?",
  "What changed your mind?",
  "How do you feel about it now?",
  "What would be a good first step?",
  "What would you like to happen next?",
  "Is there a small detail I am missing?",
  "What made you think about it today?",
  "Would you handle it differently now?",
  "What part do you agree with most?",
  "What part feels a little unclear?",
  "Do you want the simple version or the honest one?",
  "What would make it feel less stressful?",
  "Is this about a person, a plan, or a feeling?",
  "What is the easiest way to explain it?",
  "What would you say if you had to keep it simple?",
  "Does that feel true for you?",
  "What would you change first?",
  "What do you already know about it?",
  "What would make this feel more manageable?",
  "What are you hoping I understand?",
  "What part should we slow down on?",
  "What would be the calmest next move?",
  "What makes this feel difficult?",
  "What would you tell a friend in this situation?",
  "What is the part you keep thinking about?",
  "What would make the answer feel useful?",
  "What part feels simple, if any?",
  "What do you want to avoid?",
  "What would be a realistic version of success?",
  "What is the smallest useful detail?",
  "What do you wish were easier?",
  "What would help you decide?",
  "What feels most true right now?",
  "What is the main feeling behind it?",
  "What would make this less confusing?",
  "What would you try if there were no pressure?",
  "What is one thing you can say for sure?",
  "What part sounds most like you?",
  "What would make this conversation helpful?",
  "What do you want me to focus on?",
  "What is the cleanest way to describe it?",
  "What would be enough for today?"
] as const;

const softeners = [
  "If you want,",
  "No pressure, but",
  "I am curious,",
  "Just to understand you better,",
  "Maybe start here:",
  "One small question:",
  "A simple way to check is this:",
  "Before we overthink it,",
  "If we keep it honest,",
  "The useful question is,"
] as const;

const opinionFrames = [
  "I lean slightly yes, but only if the situation feels right.",
  "I am not fully convinced, but I see why it matters.",
  "For me, the practical answer is usually better than the perfect one.",
  "I would keep it simple first, then adjust later.",
  "My instinct says it is worth trying once.",
  "I would be careful with it, but I would not ignore it.",
  "I like the idea, especially if it stays honest.",
  "I think the feeling behind it matters more than the label.",
  "I would not overthink it at the beginning.",
  "I can see both sides, but one small action would help."
] as const;

const englishPractice = [
  "Say one real thing first, then make it clearer.",
  "Do not chase perfect grammar too early; chase a sentence that feels alive.",
  "Short, natural sentences are better than long nervous ones.",
  "Try saying the same idea in two simple ways.",
  "A small mistake is fine if the meaning is clear.",
  "You will sound more natural if you use words you already own.",
  "Start with the feeling, then add one detail.",
  "Repeating useful phrases is not boring; it builds reflexes.",
  "The best practice is a real conversation, even a tiny one.",
  "You can keep it simple and still sound warm."
] as const;

const moods = [
  "That sounds a bit heavy. Be gentle with yourself.",
  "Some days feel slow for no dramatic reason.",
  "That kind of mood can drain your energy quietly.",
  "I hope the day gets a little softer from here.",
  "It is okay to move slowly when your head feels full.",
  "You do not have to solve everything at once.",
  "A tiny reset might help more than forcing yourself.",
  "That feeling is annoying, but it usually passes.",
  "I would start with something small and kind.",
  "You sound like you need a little breathing room."
] as const;

const goodNews = [
  "That is genuinely nice. Small good news can change the whole day.",
  "I like that. It sounds like a moment worth enjoying properly.",
  "That is the kind of thing you should not rush past.",
  "Nice, that has good energy.",
  "I am glad to hear that. It sounds earned.",
  "That would make me smile too.",
  "Good, keep that feeling for a bit.",
  "That sounds like a clean little win.",
  "I love when the day gives you something like that.",
  "That is worth celebrating, even quietly."
] as const;

const quickReplies = [
  "Yeah, that fits.",
  "Right, I can see that.",
  "Exactly, that is the point.",
  "Fair enough.",
  "That is true.",
  "I agree with that part.",
  "That feels honest.",
  "Makes sense to me.",
  "I would say the same.",
  "That sounds about right."
] as const;

function pick<T>(items: readonly T[]) {
  return items[Math.floor(Math.random() * items.length)]!;
}

function topicFrom(message: string) {
  return message
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter((word) => word.length > 2)
    .slice(-4)
    .join(" ");
}

export function estimateEnglishFallbackVariants() {
  return (openers.length * concreteReactions.length * softeners.length * followUps.length)
    + opinionFrames.length
    + englishPractice.length
    + moods.length
    + goodNews.length
    + quickReplies.length;
}

export function buildCommonEnglishFallback(message: string, profile: VirtualUserProfile) {
  const lower = message.toLocaleLowerCase();
  const topic = topicFrom(message);
  const primaryInterest = profile.interests[0] ?? "that";
  const interests = profile.interests.length ? profile.interests.join(", ") : "everyday life";
  const situationResponse = buildCommonEnglishSituationResponse(message);
  if (situationResponse) return situationResponse;

  if (/\b(?:how are you|how's it going|how are u)\b/i.test(message)) {
    return pick([
      "I am doing pretty well today. A little sleepy, but in a good mood.",
      "Pretty good, honestly. I have been in a calm, chatty mood today.",
      "Not bad at all. My brain feels awake enough for a decent conversation.",
      "I am good. Nothing dramatic, just a steady day.",
      "Better now that we are talking, actually."
    ]);
  }

  if (/\bwhat(?:'s| is) your (?:name|nickname)\b/i.test(message)) {
    return `I'm ${profile.name}. Nice to meet you.`;
  }

  if (/\b(?:do you like|are you into|favorite|favourite)\b/i.test(lower)) {
    return pick([
      `Yeah, I do like ${primaryInterest}. I enjoy it more when there is a small story behind it.`,
      `I am into ${interests}. Not obsessively, but enough to have opinions.`,
      `Depends on the day, but ${primaryInterest} is usually my kind of thing.`,
      `I like ${primaryInterest}, especially when it feels relaxed and not too serious.`,
      `${primaryInterest} is a yes for me. I like things that have a little personality.`
    ]);
  }

  if (/\b(?:learn english|practice english|speaking english|english)\b/i.test(message)) {
    return pick(englishPractice);
  }

  if (/\b(?:tired|sad|stress|stressed|bored|boring|lonely)\b/i.test(message)) {
    return pick(moods);
  }

  if (/\b(?:happy|excited|great|good news|nice)\b/i.test(message)) {
    return pick(goodNews);
  }

  if (message.includes("?")) {
    return pick([
      pick(opinionFrames),
      topic ? `My first thought about ${topic}: ${pick(concreteReactions)}.` : pick(opinionFrames),
      `${pick(openers)}. ${pick(concreteReactions)}.`
    ]);
  }

  return Math.random() < 0.65
    ? `${pick(openers)}. ${pick(concreteReactions)}. ${pick(softeners)} ${pick(followUps)}`
    : pick(quickReplies);
}
