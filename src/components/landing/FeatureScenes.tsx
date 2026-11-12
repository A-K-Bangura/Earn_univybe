import { Settings, Users } from "lucide-react";
import { SceneItem, SceneMascot, SceneStage } from "./SceneParts";
import {
  BookmarkChip,
  CampusCard,
  CoinToken,
  CompletionCard,
  GigCard,
  IconChip,
  LessonCard,
  OpportunityCard,
  ProgressRing,
  ProjectBoard,
  ResourceCard,
} from "./SceneCards";
import { LandingImg } from "./LandingImg";
import { hasImage, pickImage } from "./landingAssets";

// One composition per feature band. Supporting assets are listed in the order
// they should enter (see useFeatureSectionAnimation); each scene keeps to a
// handful of pieces so the mascot stays the focal point.

export const ConceptScene = () => (
  <SceneStage blob="bg-white/35">
    <SceneMascot
      image={pickImage("mascot-hat")}
      alt="Vybe, the UniVybe mascot, wearing a graduation cap and backpack with arms crossed"
      heightPct={94}
    />
    <SceneItem
      className="left-[0%] top-[26%] w-[42%] -rotate-6 sm:w-[34%]"
      from={{ x: 90, y: 30, r: 14, s: 0.7 }}
    >
      <CampusCard />
    </SceneItem>
    <SceneItem
      className="right-[4%] top-[12%] w-[18%] sm:w-[16%]"
      from={{ x: -70, y: 50, r: -30, s: 0.6 }}
      float
    >
      <LandingImg image={pickImage("float-wave")} className="h-auto w-full" />
    </SceneItem>
    <SceneItem
      className="right-[1%] top-[50%] w-[11%] sm:w-[9%]"
      from={{ x: -60, y: 0, s: 0.5 }}
    >
      <LandingImg image={pickImage("float-spark")} className="h-auto w-full" />
    </SceneItem>
  </SceneStage>
);

export const LearningScene = () => (
  <SceneStage blob="bg-white/20">
    <SceneMascot
      image={pickImage("mascot-learning")}
      alt="Vybe learning on a laptop, surrounded by level, streak and trophy rewards"
      heightPct={68}
    />
    <SceneItem
      className="left-[2%] top-[2%] w-[54%] sm:w-[40%]"
      from={{ x: -20, y: 40, s: 0.9 }}
      float
      floatAmp={-5}
    >
      <LessonCard />
    </SceneItem>
    <SceneItem
      className="right-[6%] top-[4%] w-[20%] sm:w-[16%]"
      from={{ x: 50, y: 30, s: 0.6 }}
    >
      <ProgressRing />
    </SceneItem>
  </SceneStage>
);

export const PracticalScene = () => (
  <SceneStage blob="bg-white/40">
    <SceneMascot
      image={pickImage("mascot-practical", "mascot-cool")}
      alt="Vybe taking part in a hands-on practical session"
      heightPct={90}
    />
    <SceneItem
      className="right-[0%] top-[10%] hidden rotate-3 sm:block sm:w-[30%]"
      from={{ x: 50, y: 20, r: 10, s: 0.8 }}
    >
      <ProjectBoard />
    </SceneItem>
    <SceneItem
      className="left-[2%] top-[34%] w-[17%] -rotate-6 sm:w-[13%]"
      from={{ x: 60, y: 30, r: -30, s: 0.5 }}
      float
    >
      <IconChip icon={Users} tint="text-azure-500" />
    </SceneItem>
    <SceneItem
      className="right-[6%] bottom-[28%] w-[15%] sm:w-[11%]"
      from={{ x: -30, y: 30, r: -40, s: 0.5 }}
    >
      <Settings
        data-spin
        className="h-full w-full text-gray-900"
        strokeWidth={2.2}
        aria-hidden
      />
    </SceneItem>
  </SceneStage>
);

// When the bespoke mascot (which already has coins and a check badge baked
// in) is present, only a couple of extra coins are layered on top.
const COIN_SLOTS = [
  { className: "right-[10%] top-[4%] w-[12%] sm:w-[10%]", float: true },
  { className: "right-[1%] top-[30%] w-[10%] sm:w-[8%]", float: false },
  { className: "left-[42%] top-[0%] w-[9%] sm:w-[7%]", float: false },
  { className: "right-[19%] top-[46%] w-[10%] sm:w-[8%]", float: true },
];

export const CoinsScene = () => {
  const coinCount = hasImage("mascot-coins") ? 2 : COIN_SLOTS.length;
  return (
    <SceneStage blob="bg-white/25">
      <SceneMascot
        image={pickImage("mascot-coins", "mascot-shrug")}
        alt="Vybe celebrating after completing a course and earning Vybe Coins"
        heightPct={82}
      />
      <SceneItem
        className="left-[0%] top-[2%] w-[52%] -rotate-3 sm:w-[38%]"
        from={{ x: -30, y: 30, s: 0.85 }}
      >
        <CompletionCard />
      </SceneItem>
      {COIN_SLOTS.slice(0, coinCount).map((slot, i) => (
        <SceneItem
          key={slot.className}
          className={slot.className}
          from={{ y: -140 - i * 20, r: -120, s: 0.6 }}
          float={slot.float}
          floatAmp={i % 2 ? 5 : -5}
        >
          <CoinToken />
        </SceneItem>
      ))}
    </SceneStage>
  );
};

export const ResourcesScene = () => (
  <SceneStage blob="bg-white/20">
    <SceneMascot
      image={pickImage("mascot-smart")}
      alt="Vybe with glasses, holding a book beside a stack of study materials"
      heightPct={94}
    />
    <SceneItem
      className="left-[0%] top-[16%] w-[38%] -rotate-6 sm:w-[34%]"
      from={{ x: 70, y: 20, r: 12, s: 0.8 }}
    >
      <ResourceCard kind="pdf" />
    </SceneItem>
    <SceneItem
      className="right-[0%] top-[8%] w-[38%] rotate-6 sm:w-[34%]"
      from={{ x: -70, y: 20, r: -12, s: 0.8 }}
      float
      floatAmp={-5}
    >
      <ResourceCard kind="slides" />
    </SceneItem>
    <SceneItem
      className="right-[2%] bottom-[24%] w-[36%] -rotate-3 sm:w-[32%]"
      from={{ x: -40, y: 40, r: -8, s: 0.85 }}
    >
      <ResourceCard kind="notes" />
    </SceneItem>
    <SceneItem
      className="left-[6%] bottom-[34%] w-[11%] rotate-6 sm:w-[9%]"
      from={{ x: 40, y: 30, r: 20, s: 0.5 }}
      float
    >
      <BookmarkChip />
    </SceneItem>
  </SceneStage>
);

export const GigsScene = () => (
  <SceneStage blob="bg-white/25">
    <SceneMascot
      image={pickImage("mascot-gigs", "mascot-cool")}
      alt="Vybe holding a fan of Leone banknotes, pointing at them with a grin"
      heightPct={88}
    />
    <SceneItem
      className="left-[0%] top-[6%] w-[46%] -rotate-3 sm:w-[34%]"
      from={{ x: 80, y: 20, r: 10, s: 0.85 }}
    >
      <GigCard kind="design" />
    </SceneItem>
    <SceneItem
      className="right-[0%] top-[14%] w-[44%] rotate-3 sm:w-[32%]"
      from={{ x: -70, y: 30, r: -10, s: 0.8 }}
      float
      floatAmp={-5}
    >
      <GigCard kind="photography" />
    </SceneItem>
    <SceneItem
      className="left-[4%] bottom-[22%] w-[42%] -rotate-2 sm:w-[30%]"
      from={{ x: 40, y: 40, r: -8, s: 0.8 }}
    >
      <GigCard kind="tutoring" />
    </SceneItem>
  </SceneStage>
);

export const OpportunitiesScene = () => (
  <SceneStage blob="bg-white/20">
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      className="pointer-events-none absolute inset-0 z-[5] h-full w-full"
      fill="none"
    >
      <path
        data-draw
        pathLength={1}
        d="M 50 66 C 58 54, 60 44, 68 34 S 84 16, 92 10"
        stroke="white"
        strokeOpacity="0.9"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeDasharray="1"
        strokeDashoffset="0"
      />
    </svg>
    <SceneMascot
      image={pickImage("mascot-opportunities", "mascot-cool-bust")}
      alt="Vybe striding forward and pointing toward new opportunities"
      heightPct={88}
      widthPct={62}
      position="left-[6%]"
    />
    <SceneItem
      className="right-[2%] top-[62%] w-[44%] sm:right-[14%] sm:top-[56%] sm:w-[32%]"
      from={{ y: 50, s: 0.85 }}
    >
      <OpportunityCard kind="internship" />
    </SceneItem>
    <SceneItem
      className="right-[4%] top-[32%] hidden sm:block sm:w-[32%]"
      from={{ y: 50, s: 0.85 }}
    >
      <OpportunityCard kind="scholarship" />
    </SceneItem>
    <SceneItem
      className="right-[0%] top-[0%] w-[47%] sm:top-[8%] sm:w-[32%]"
      from={{ y: 50, s: 0.85 }}
    >
      <OpportunityCard kind="competition" />
    </SceneItem>
    <SceneItem
      className="left-[22%] top-[6%] w-[9%] sm:w-[7%]"
      from={{ s: 0.4 }}
    >
      <span data-glint className="block">
        <LandingImg image={pickImage("float-spark")} className="h-auto w-full" />
      </span>
    </SceneItem>
  </SceneStage>
);
