import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register plugins once; import `gsap` / `ScrollTrigger` from here so the
// plugin is always registered before use.
gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
