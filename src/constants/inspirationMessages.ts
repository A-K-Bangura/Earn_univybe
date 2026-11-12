export type InspoType =
  | "casual_friendly"
  | "stoic_discipline"
  | "african_proverbs"
  | "krio_motivation"
  | "hype_energy"
  | "gentle_supportive"
  | "professional_academic"
  | "funny_playful"
  | "man_to_man";

export const DEFAULT_INSPO_TYPE: InspoType = "casual_friendly";

const sanitizeStudentName = (name?: string | null): string =>
  name?.trim() || "friend";

const applyStudentName = (message: string, studentName?: string | null) =>
  message.replace(/{{\s*student_name\s*}}/gi, sanitizeStudentName(studentName));

const createMessages = (): Record<InspoType, string[]> => ({
  casual_friendly: [
    "Nice one! You dey run this course ya lek breeze!",
    "Big ups! You done nail this lesson.",
    "Keep am up! Na so champions dey do.",
    "Well done! One more step closer to greatness.",
    "You are doing clean work! Keep going.",
    "Steady steady, you are growing strong.",
    "Good job, {{student_name}}! You sabi book!",
    "This lesson nor challenge you at all.",
    "You dey make this thing look easy!",
    "Another lesson done—levels dey change.",
    "You are improving fast, continue so.",
    "You are moving! Just keep the pace.",
    "Nice flow! You clearly dey enjoy the course.",
    "One done, next one we move!",
    "You are on the right track—keep shining, {{student_name}}.",
  ],
  stoic_discipline: [
    "Consistency is strength. You chose discipline today.",
    "One lesson at a time. Progress is built, not found.",
    "You did what needed to be done. Continue.",
    "Small improvements daily lead to mastery.",
    "Discipline is choosing what matters. You chose well.",
    "Your effort today becomes your skill tomorrow.",
    "Focus is a practice; you just strengthened it.",
    "Mastery requires patience. You are walking the path, {{student_name}}.",
    "Today’s work brings tomorrow’s confidence.",
    "Your actions shape your future. Keep acting with purpose.",
    "True growth is quiet. You are building it.",
    "Every lesson is a brick. You are constructing something great.",
    "You showed up. That alone sets you apart.",
    "Learning is a discipline; you honored it today.",
    "You controlled your time. That is power.",
  ],
  african_proverbs: [
    "If you want to go far, keep moving—one lesson at a time.",
    "No matter how long the journey, each step is progress.",
    "The child who reads today becomes the elder with wisdom tomorrow.",
    "Knowledge is a seed—today you planted another one.",
    "Wisdom grows slowly, like a tree. Water it daily.",
    "Success follows patience and effort.",
    "A river cuts through rock by persistence, not power.",
    "Learning is a lamp—keep the flame alive.",
    "Where there is curiosity, there will be growth.",
    "You added to your wisdom basket today.",
    "The mind expands when challenged; you accepted the challenge.",
    "One day’s learning can change a lifetime.",
    "A hardworking student never stays behind.",
    "Your effort today is the foundation for tomorrow’s story.",
    "The journey to knowledge has no shortcuts—walk it boldly, {{student_name}}.",
  ],
  krio_motivation: [
    "Yu do am! Keep push—di road go clear.",
    "Na so! Yu sabi this thing sef.",
    "Small small, yu go reach di top.",
    "Keep learning, nor lef! Na so success dey cam.",
    "Yu nar real champion—continue!",
    "Dis lesson nor to match for you!",
    "Yu brain dey hot today!",
    "You don add one more power to yu knowledge.",
    "Yu steady! Nor shake.",
    "Na so we dey climb—one by one.",
    "You dae improve everyday, trust di process.",
    "Good work! Yu for proud.",
    "E sweet ya? Continue learn!",
    "You nor cam play, {{student_name}}! You cam for win.",
    "Yu don do well—move to di next one.",
  ],
  hype_energy: [
    "Let's gooo! You smashed that lesson!",
    "Fire! You are on a roll, {{student_name}}!",
    "That's the spirit! Another victory in the bag.",
    "You are leveling up fast—keep charging!",
    "Boom! Another lesson completed!",
    "You are unstoppable today!",
    "Energy! That is what I am talking about!",
    "More wins loading! Keep pushing!",
    "Power mode activated—you are crushing it!",
    "Momentum strong! Ride it!",
    "You are doing premium work!",
    "Mad levels! You have improved again!",
    "Hey! You fit finish this course faster than you think!",
    "You are in beast mode—do not slow down.",
    "This is excellence in motion. Keep it burning, {{student_name}}!",
  ],
  gentle_supportive: [
    "You are doing great. Every step counts.",
    "Be proud of yourself—you showed up and learned today.",
    "Progress is progress, no matter how small.",
    "You are becoming better with every lesson.",
    "You handled this lesson well—keep going.",
    "It is okay to take it slow. You are still moving forward.",
    "You are learning at your own pace, and that is perfect.",
    "You are stronger than you think—keep going.",
    "You are doing your best, and it shows.",
    "You made progress today. That matters.",
    "You are improving quietly but powerfully.",
    "Believe in yourself—you are growing.",
    "Another lesson done. You deserve a moment to breathe, {{student_name}}.",
    "Step by step, you are building confidence.",
    "You are learning beautifully. Keep trusting yourself.",
  ],
  professional_academic: [
    "Excellent work. You have successfully completed this lesson.",
    "Your consistency demonstrates strong academic discipline.",
    "Well done. You are gaining solid mastery of this course.",
    "Keep engaging with the material—you are improving.",
    "Your learning performance is commendable.",
    "You have shown clear understanding of this lesson.",
    "Your study habits are producing strong results.",
    "This was a productive milestone—good job.",
    "You are progressing with confidence and clarity, {{student_name}}.",
    "Your dedication is evident in your work.",
    "A strong learning outcome—continue this trend.",
    "Your efforts reflect seriousness and commitment.",
    "You are building a strong academic foundation.",
    "This level of performance will take you far.",
    "Well-structured learning effort—keep it up.",
  ],
  funny_playful: [
    "You finished the lesson! Your brain nor to small o!",
    "Look at you, collecting knowledge lek mobile data.",
    "You dey learn pass Chinese calculator!",
    "Lesson done—time for small victory dance.",
    "You are learning so fast, the app sef dey fear.",
    "You sabi book pass di teacher sef!",
    "If learning was football, you for don score hat-trick!",
    "Your brain na 4G LTE today!",
    "You dey cruise through lessons lek poda-poda pan highway.",
    "You fit teach me sef now—na so you dey go!",
    "This intelligence fit cause blackout!",
    "You too sharp, na you pepper seller dae fear.",
    "If na competition, you for don win medal sef!",
    "Your brain hot pass pepper soup!",
    "You dey run this course lek Bolt, {{student_name}}!",
  ],
  man_to_man: [
    "Ah see you! You don finally wake your brain small!",
    "No slack man, na so you wan remain beginner?",
    "You finish am? Good. At least today you serious small.",
    "You nor bad, you just lazy sometimes. Today you prove me wrong.",
    "Better! Na this energy I wan see every day.",
    "Oya push! Greatness nor dey come to man we dae idle.",
    "You don try, but nor go think say you don reach.",
    "Keep going—na so real man dey level up.",
    "If you ge time for scroll TikTok, you ge time for learn. Good move.",
    "Today you behave lek person we wan succeed.",
    "You nor cam here for joke, so nor waste the effort.",
    "Big man nor dey fear book. You handle this one clean.",
    "Respect! You gree challenge yourself.",
    "If you continue so, e go hard for anybody lef you behind.",
    "This na the attitude we dey build empire—continue, {{student_name}}.",
  ],
});

export const INSPIRATION_MESSAGES = createMessages();

export const INSPIRATION_OPTIONS: Array<{
  value: InspoType;
  label: string;
  description: string;
}> = [
  {
    value: "casual_friendly",
    label: "Casual & Friendly",
    description: "Laid-back encouragement with playful Krio flavor.",
  },
  {
    value: "stoic_discipline",
    label: "Stoic Discipline",
    description: "Structured, focused messages that honor consistency.",
  },
  {
    value: "african_proverbs",
    label: "Inspirational African Wisdom",
    description: "Grounded proverbs and regional wisdom for steady growth.",
  },
  {
    value: "krio_motivation",
    label: "Krio Encouragement",
    description: "Warm Sierra Leonean motivation with hometown energy.",
  },
  {
    value: "hype_energy",
    label: "High-Energy / Hype",
    description: "Big hype, bold energy, and constant momentum.",
  },
  {
    value: "gentle_supportive",
    label: "Soft & Supportive",
    description: "Gentle accountability with empathetic encouragement.",
  },
  {
    value: "professional_academic",
    label: "Professional & Academic",
    description: "Formal, performance-focused recognition.",
  },
  {
    value: "funny_playful",
    label: "Humor & Lighthearted",
    description: "Playful and witty motivation to keep learning fun.",
  },
  {
    value: "man_to_man",
    label: "Man-to-Man Banter",
    description:
      "Raw, streetwise encouragement—tough love with playful banter.",
  },
];

export const isValidInspirationType = (value: unknown): value is InspoType =>
  typeof value === "string" &&
  Object.prototype.hasOwnProperty.call(INSPIRATION_MESSAGES, value);

const pickRandomMessage = (messages: string[]): string =>
  messages[Math.floor(Math.random() * messages.length)] ?? messages[0];

export const getRandomInspirationMessage = (
  type: InspoType,
  studentName?: string | null
): string => {
  const safeType = isValidInspirationType(type)
    ? type
    : DEFAULT_INSPO_TYPE;
  const messages =
    INSPIRATION_MESSAGES[safeType] ||
    INSPIRATION_MESSAGES[DEFAULT_INSPO_TYPE];
  const message = pickRandomMessage(messages);
  return applyStudentName(message, studentName);
};

export const getSampleInspirationMessage = (
  type: InspoType,
  studentName?: string | null
): string => {
  const safeType = isValidInspirationType(type)
    ? type
    : DEFAULT_INSPO_TYPE;
  const messages =
    INSPIRATION_MESSAGES[safeType] ||
    INSPIRATION_MESSAGES[DEFAULT_INSPO_TYPE];
  const message = messages[0];
  return applyStudentName(message, studentName);
};

