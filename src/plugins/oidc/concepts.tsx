import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "oidc"
  | "oauth-vs-oidc"
  | "id-token"
  | "claims"
  | "scopes"
  | "discovery";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  oidc: {
    title: "OpenID Connect (OIDC)",
    subtitle: "The standard that adds identity to OAuth 2.0",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "In plain English",
        accent: "#a78bfa",
        content: (
          <>
            <p>
              OAuth 2.0 lets an app <strong>do things</strong> on your behalf
              (read your calendar, post a tweet). But it never tells the app{" "}
              <strong>who you are</strong>. OIDC fixes that.
            </p>
            <p>
              OIDC is a thin layer on top of OAuth. Same login redirect, same
              tokens — but the Identity Provider also hands back an{" "}
              <strong>ID Token</strong> that says exactly who you are.
            </p>
          </>
        ),
      },
      {
        title: "Real-world analogy",
        accent: "#a78bfa",
        content: (
          <p>
            OAuth is like a hotel key card — it opens your room door
            (permission). OIDC is the front-desk clerk handing you the key card{" "}
            <em>and</em> saying: "Welcome, Ms. Doe, Room 405." Now the hotel
            system knows both what you can access and who you are.
          </p>
        ),
      },
    ],
  },

  "oauth-vs-oidc": {
    title: "OAuth 2.0 vs OIDC",
    subtitle: "Authorization vs Authentication",
    accentColor: "#fbbf24",
    sections: [
      {
        title: "The key difference",
        accent: "#fbbf24",
        content: (
          <>
            <p>
              <strong>OAuth 2.0</strong> = Authorization — "What can this app
              do?"
            </p>
            <p>
              <strong>OIDC</strong> = Authentication — "Who is this person?"
            </p>
            <p>
              OAuth gives you an <strong>Access Token</strong> (permission
              slip). OIDC adds an <strong>ID Token</strong> (identity card).
              Both travel together.
            </p>
          </>
        ),
      },
      {
        title: "Why not just use OAuth for identity?",
        accent: "#fbbf24",
        content: (
          <p>
            Before OIDC, apps hacked together identity by calling
            provider-specific APIs (e.g. Facebook's /me endpoint). Every
            provider did it differently. OIDC standardized this into one spec so
            any app can work with any provider.
          </p>
        ),
      },
    ],
  },

  "id-token": {
    title: "The ID Token",
    subtitle: "A signed card that proves who you are",
    accentColor: "#c084fc",
    sections: [
      {
        title: "What is it?",
        accent: "#c084fc",
        content: (
          <>
            <p>
              The ID Token is a <strong>JWT</strong> (JSON Web Token) — a string
              with three parts separated by dots:{" "}
              <code>header.payload.signature</code>.
            </p>
            <p>
              The <strong>payload</strong> contains "claims" — facts about you
              like your name, email, and a unique user ID. The{" "}
              <strong>signature</strong> proves the IDP created it and nobody
              tampered with it.
            </p>
          </>
        ),
      },
      {
        title: "Example payload",
        accent: "#c084fc",
        content: (
          <pre style={{ color: "#e2e8f0", fontSize: 12, lineHeight: 1.5 }}>{`{
  "iss": "https://accounts.google.com",
  "sub": "110248495921238986420",
  "email": "jane@example.com",
  "name": "Jane Doe",
  "iat": 1716000000,
  "exp": 1716003600
}`}</pre>
        ),
      },
    ],
  },

  claims: {
    title: "Claims",
    subtitle: "Facts about the user encoded in the token",
    accentColor: "#93c5fd",
    sections: [
      {
        title: "Standard claims",
        accent: "#93c5fd",
        content: (
          <>
            <p>
              <strong>sub</strong> — unique ID for this user (never changes)
            </p>
            <p>
              <strong>email</strong> — the user's email address
            </p>
            <p>
              <strong>name</strong> — display name
            </p>
            <p>
              <strong>iss</strong> — who issued the token (the IDP)
            </p>
            <p>
              <strong>aud</strong> — who the token is for (your app's client_id)
            </p>
            <p>
              <strong>exp</strong> — when the token expires
            </p>
          </>
        ),
      },
      {
        title: "Why claims matter",
        accent: "#93c5fd",
        content: (
          <p>
            Claims let your app personalize the experience without a database
            lookup. The IDP already verified the user — you just read the
            claims.
          </p>
        ),
      },
    ],
  },

  scopes: {
    title: "Scopes",
    subtitle: "What your app asks for",
    accentColor: "#6ee7b7",
    sections: [
      {
        title: "How scopes work",
        accent: "#6ee7b7",
        content: (
          <>
            <p>
              When your app redirects to the IDP, it includes a list of{" "}
              <strong>scopes</strong> — permissions it wants.
            </p>
            <p>
              <strong>openid</strong> — "I want OIDC" (required, triggers ID
              Token)
            </p>
            <p>
              <strong>profile</strong> — name, picture, locale
            </p>
            <p>
              <strong>email</strong> — email address + whether it's verified
            </p>
            <p>
              <strong>phone</strong> — phone number
            </p>
          </>
        ),
      },
      {
        title: "The user decides",
        accent: "#6ee7b7",
        content: (
          <p>
            The consent screen shows the user exactly what your app is
            requesting. They can approve or deny. Your app only gets the data
            the user agrees to share.
          </p>
        ),
      },
    ],
  },

  discovery: {
    title: "Discovery & JWKS",
    subtitle: "How your app finds the IDP's configuration",
    accentColor: "#fca5a5",
    sections: [
      {
        title: "Discovery endpoint",
        accent: "#fca5a5",
        content: (
          <>
            <p>
              Every OIDC provider publishes a JSON document at{" "}
              <code>/.well-known/openid-configuration</code>. It lists all the
              URLs your app needs: authorize endpoint, token endpoint, userinfo
              endpoint, and JWKS URI.
            </p>
            <p>
              Your app reads this once and knows how to talk to the IDP — no
              manual configuration needed.
            </p>
          </>
        ),
      },
      {
        title: "JWKS — the public keys",
        accent: "#fca5a5",
        content: (
          <p>
            The JWKS (JSON Web Key Set) endpoint returns the IDP's public keys.
            Your app uses these to verify the ID Token's signature — confirming
            the token really came from the IDP and wasn't forged.
          </p>
        ),
      },
    ],
  },
};
