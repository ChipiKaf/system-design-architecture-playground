import React, { useCallback, useState } from "react";
import InfoModal from "../InfoModal/InfoModal";
import type { InfoModalSection } from "../InfoModal/InfoModal";

export interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

/**
 * Manages concept-modal state for a plugin.
 *
 * @example
 * const { openConcept, ConceptModal } = useConceptModal(concepts);
 *
 * return (
 *   <>
 *     <ConceptPills pills={pills} onOpen={openConcept} />
 *     <ConceptModal />
 *   </>
 * );
 */
export function useConceptModal<K extends string>(
  concepts: Record<K, ConceptDefinition>,
) {
  const [activeConcept, setActiveConcept] = useState<K | null>(null);

  const openConcept = useCallback(
    (key: string) => setActiveConcept(key as K),
    [],
  );
  const closeConcept = useCallback(() => setActiveConcept(null), []);

  const ConceptModal: React.FC = () => {
    if (!activeConcept) return null;
    const c = concepts[activeConcept];
    return (
      <InfoModal
        isOpen
        onClose={closeConcept}
        title={c.title}
        subtitle={c.subtitle}
        accentColor={c.accentColor}
        sections={c.sections}
        aside={c.aside}
      />
    );
  };

  return { activeConcept, openConcept, closeConcept, ConceptModal } as const;
}
