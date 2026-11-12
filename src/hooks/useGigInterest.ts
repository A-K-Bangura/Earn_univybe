import { useMutation, useQueryClient } from "@tanstack/react-query";
import { expressGigInterest } from "../services/gigs";
import type { Gig, GigContactMethod, GigInterestResult } from "../types/gig";

/**
 * Records interest in a gig and opens the creator's contact link. Mirrors
 * `useResourceAccess`'s shape: a popup-safe tab is opened synchronously
 * before the mutation's `await`, and the server's refreshed `gig` replaces
 * (not just invalidates) the one cache entry we know, per the design guide's
 * "never cache/log/persist the contact response" — the hook deliberately
 * does not expose the mutation's `data` for later reads, only the one-shot
 * return value of `contact()`.
 *
 * Auth-gating is the caller's job (guests never see a working contact
 * button — see the button-state matrix in GigDetail.tsx).
 */
export function useGigInterest() {
  const queryClient = useQueryClient();

  const contactMutation = useMutation({
    mutationFn: ({ gigId, method }: { gigId: string | number; method?: GigContactMethod }) =>
      expressGigInterest(gigId, method),
  });

  const contact = async (
    gig: Gig,
    method: GigContactMethod | undefined
  ): Promise<GigInterestResult | undefined> => {
    const pendingTab = window.open("", "_blank"); // popup-safe: before the await, in the click handler
    try {
      const result = await contactMutation.mutateAsync({ gigId: gig.id, method });
      const url = method === "email" ? result.contact.email?.url : result.contact.whatsapp?.url;

      if (pendingTab) {
        pendingTab.opener = null;
        if (url) pendingTab.location.href = url;
        else pendingTab.close();
      } else if (url) {
        window.location.href = url;
      }

      queryClient.setQueryData(["gigs", "detail", gig.id, true], result.gig);
      queryClient.invalidateQueries({ queryKey: ["gigs", "list"] });

      return result; // caller reads this once, synchronously — never stash it in state
    } catch (error) {
      pendingTab?.close();
      throw error;
    }
  };

  return { contact, isContacting: contactMutation.isPending };
}
