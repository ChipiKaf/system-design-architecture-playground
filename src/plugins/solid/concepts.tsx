import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "solid-overview"
  | "srp"
  | "ocp"
  | "lsp"
  | "isp"
  | "dip";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "solid-overview": {
    title: "SOLID Principles",
    subtitle: "Five design principles for maintainable OOP",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What are the SOLID principles?",
        accent: "#60a5fa",
        content: (
          <p>
            SOLID is a mnemonic for five object-oriented design principles that
            help developers create systems that are easy to maintain, extend,
            and refactor. Each letter stands for one principle: SRP, OCP, LSP,
            ISP, DIP.
          </p>
        ),
      },
    ],
  },
  srp: {
    title: "Single Responsibility (SRP)",
    subtitle: "One class, one reason to change",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "The principle",
        accent: "#3b82f6",
        content: (
          <p>
            A class should have only one reason to change. If a class handles
            authentication, email sending, and database persistence, a change in
            any one of those areas forces a recompile and retest of the whole
            class.
          </p>
        ),
      },
      {
        title: "Fix",
        accent: "#22c55e",
        content: (
          <p>
            Extract each responsibility into its own class — AuthService,
            EmailService, UserRepo — so changes are isolated.
          </p>
        ),
      },
    ],
  },
  ocp: {
    title: "Open / Closed (OCP)",
    subtitle: "Open for extension, closed for modification",
    accentColor: "#22c55e",
    sections: [
      {
        title: "The principle",
        accent: "#22c55e",
        content: (
          <p>
            You should be able to add new behavior without changing existing
            code. A giant switch/case that grows with every new variant is a
            classic violation.
          </p>
        ),
      },
      {
        title: "Fix",
        accent: "#22c55e",
        content: (
          <p>
            Introduce an abstraction (interface or abstract class). New behavior
            is a new implementation — the core stays closed.
          </p>
        ),
      },
    ],
  },
  lsp: {
    title: "Liskov Substitution (LSP)",
    subtitle: "Subtypes must be drop-in replacements",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "The principle",
        accent: "#a78bfa",
        content: (
          <p>
            If S is a subtype of T, objects of type T may be replaced with
            objects of type S without breaking the program. The classic
            Rectangle ← Square problem violates this.
          </p>
        ),
      },
      {
        title: "Fix",
        accent: "#22c55e",
        content: (
          <p>
            Use a common abstraction (Shape) whose contract all subtypes honour.
            Avoid inheritance that overrides preconditions or postconditions.
          </p>
        ),
      },
    ],
  },
  isp: {
    title: "Interface Segregation (ISP)",
    subtitle: "Don't force clients to depend on unused methods",
    accentColor: "#eab308",
    sections: [
      {
        title: "The principle",
        accent: "#eab308",
        content: (
          <p>
            A fat interface forces implementors to stub methods they don't need.
            A Robot shouldn't have to stub eat() just because IWorker demands
            it.
          </p>
        ),
      },
      {
        title: "Fix",
        accent: "#22c55e",
        content: (
          <p>
            Split the fat interface into focused ones — IWorkable and IFeedable.
            Each client implements only what it actually uses.
          </p>
        ),
      },
    ],
  },
  dip: {
    title: "Dependency Inversion (DIP)",
    subtitle: "Depend on abstractions, not concretions",
    accentColor: "#f43f5e",
    sections: [
      {
        title: "The principle",
        accent: "#f43f5e",
        content: (
          <p>
            High-level modules should not import low-level modules directly. If
            OrderService imports MySQLDatabase, swapping to MongoDB means
            rewriting business logic.
          </p>
        ),
      },
      {
        title: "Fix",
        accent: "#22c55e",
        content: (
          <p>
            Introduce an IRepository abstraction. OrderService depends on the
            contract; concrete implementations are injected at runtime.
          </p>
        ),
      },
    ],
  },
};
