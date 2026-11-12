import { useState } from "react";
import { CompletionModal } from "../common/CompletionModal";

/**
 * Example component showing how to use CompletionModal
 * This can be integrated into CoursePlayer after lesson completion
 */
export const CompletionExample = () => {
  const [showModal, setShowModal] = useState(false);

  // Example completion data
  const exampleCompletion = {
    xpGained: 25,
    newTotalXP: 1250,
    streakDays: 7,
    badge: {
      id: 1,
      name: "Quick Learner",
      description: "Complete your first lesson!",
      icon_url: "/badge-quick-learner.svg",
    },
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="px-6 py-3 bg-azure-500 hover:bg-azure-600 text-white rounded-lg font-semibold transition-colors"
      >
        Show Completion Modal
      </button>

      {showModal && (
        <CompletionModal
          xpGained={exampleCompletion.xpGained}
          newTotalXP={exampleCompletion.newTotalXP}
          streakDays={exampleCompletion.streakDays}
          badge={exampleCompletion.badge}
          onContinue={() => setShowModal(false)}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};
