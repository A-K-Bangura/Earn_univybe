import { landingImages, type LandingImage } from "../../assets/landing";

export type { LandingImage };

/**
 * First available landing image among `names`. Lets a section prefer its
 * bespoke (Higgsfield-generated) mascot and fall back to an existing pose
 * until that art has been added and `npm run assets:landing` has been run.
 */
export const pickImage = (...names: string[]): LandingImage | undefined => {
  for (const name of names) {
    const image = landingImages[name];
    if (image) return image;
  }
  return undefined;
};

export const hasImage = (name: string): boolean => name in landingImages;
