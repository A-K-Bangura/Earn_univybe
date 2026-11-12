interface RoadmapAmbientProps {
  accent: string;
}

/**
 * The dark, glowing backdrop of the roadmap journey. The page colour only tints
 * the glows; the background itself stays the same dark navy on every stage.
 *
 * Deliberately nothing but light: Vybe's poses and loops live beside the nodes
 * (RoadmapNodeDecor), and the header area stays clear so the path is the focus.
 */
export const RoadmapAmbient = ({ accent }: RoadmapAmbientProps) => (
  <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
    {/* Colour glows, tinted by the stage colour */}
    <div
      className="absolute -top-24 left-1/2 h-[28rem] w-[44rem] -translate-x-1/2 rounded-full opacity-30 blur-3xl"
      style={{ backgroundColor: `color-mix(in srgb, ${accent} 45%, transparent)` }}
    />
    <div
      className="absolute top-1/2 -right-40 h-96 w-96 rounded-full opacity-25 blur-3xl"
      style={{ backgroundColor: `color-mix(in srgb, ${accent} 60%, transparent)` }}
    />
    <div className="absolute bottom-0 -left-40 h-96 w-96 rounded-full bg-blue-violet-500/20 blur-3xl" />

    {/* Faint star field */}
    <div
      className="absolute inset-0 opacity-50"
      style={{
        backgroundImage:
          "radial-gradient(1.5px 1.5px at 20px 30px, rgba(255,255,255,0.55), transparent), radial-gradient(1px 1px at 90px 120px, rgba(255,255,255,0.4), transparent), radial-gradient(1.5px 1.5px at 160px 60px, rgba(255,255,255,0.5), transparent)",
        backgroundSize: "200px 160px",
      }}
    />
  </div>
);
