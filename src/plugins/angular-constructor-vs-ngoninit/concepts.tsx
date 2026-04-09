import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey = "overview";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  overview: {
    title: "AngularConstructorVsNgoninit",
    subtitle: "A brief explanation of this concept",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What it does",
        accent: "#60a5fa",
        content: (
          <p>
            Explain the core concept here. Keep it concise — one or two
            paragraphs is usually enough.
          </p>
        ),
      },
    ],
  },
};
