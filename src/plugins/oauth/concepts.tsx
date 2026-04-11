import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "oauth"
  | "authorization-code"
  | "tokens"
  | "scopes"
  | "idp"
  | "client-secrets"
  | "myth-vs-reality";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  oauth: {
    title: "OAuth 2.0",
    subtitle: "Letting apps do things on your behalf — without your password",
    accentColor: "#818cf8",
    sections: [
      {
        title: "What is OAuth?",
        accent: "#818cf8",
        content: (
          <>
            <p>
              Imagine you want a photo-printing app to access your Google
              Photos. The old way: give the app your Google password. Yikes —
              now that app can read your emails, delete your files, anything.
            </p>
            <p>
              OAuth fixes this. Instead of sharing your password, you say:
              "Google, please give this app <strong>just</strong> access to my
              photos, nothing else." Google gives the app a{" "}
              <strong>token</strong> (a temporary pass) that only works for
              photos. Your password stays safe.
            </p>
          </>
        ),
      },
      {
        title: "The real-world analogy",
        accent: "#818cf8",
        content: (
          <p>
            Think of a hotel. You (the guest) ask the front desk (the IDP) for a
            key card. The card only opens your room and the gym — not every room
            in the building. The app is like room service: they get a
            limited-access card, not your master key.
          </p>
        ),
      },
      {
        title: "Different flavors (Grant Types)",
        accent: "#818cf8",
        content: (
          <ul>
            <li>
              <strong>Authorization Code</strong> — the most common & secure.
              What this demo walks through.
            </li>
            <li>
              <strong>Authorization Code + PKCE</strong> — same thing, but for
              apps that can't keep a secret (like phone apps)
            </li>
            <li>
              <strong>Client Credentials</strong> — for servers talking to
              servers, no human involved
            </li>
            <li>
              <strong>Refresh Token</strong> — trading in an old pass for a
              fresh one without logging in again
            </li>
          </ul>
        ),
      },
    ],
  },
  "authorization-code": {
    title: "Authorization Code Flow",
    subtitle: "The most popular way to do OAuth — and the safest",
    accentColor: "#34d399",
    sections: [
      {
        title: "The big picture (4 steps)",
        accent: "#34d399",
        content: (
          <ol>
            <li>Your app sends you to the login page (IDP)</li>
            <li>You log in and say "Yes, this app can access my stuff"</li>
            <li>
              The IDP gives the app a one-time <strong>claim ticket</strong>{" "}
              (authorization code)
            </li>
            <li>
              The app's server trades that ticket + a secret password for the
              real <strong>Access Token</strong>
            </li>
          </ol>
        ),
      },
      {
        title: "Why the extra step with the ticket?",
        accent: "#34d399",
        content: (
          <p>
            Why not just give the app the token directly? Because the redirect
            goes through your browser — and browsers leak URLs in history, logs,
            and referrer headers. The ticket is useless on its own (it expires
            in seconds and needs the app's secret to redeem). Even if someone
            steals it, they can't use it. The real token is exchanged behind the
            scenes, server-to-server.
          </p>
        ),
      },
    ],
  },
  tokens: {
    title: "Tokens",
    subtitle: "The digital passes that prove you're allowed in",
    accentColor: "#22d3ee",
    sections: [
      {
        title: "Access Token — your wristband",
        accent: "#22d3ee",
        content: (
          <p>
            Like a wristband at a music festival. It proves you paid, so
            security lets you through the gate without checking your ID every
            time. An Access Token is sent with every API call. It expires
            quickly (usually 5–60 minutes) so if someone steals it, it won't
            work for long.
          </p>
        ),
      },
      {
        title: "Refresh Token — your ticket to get a new wristband",
        accent: "#22d3ee",
        content: (
          <p>
            Wristband expired? Instead of going back to the ticket booth
            (logging in again), you show your Refresh Token and get a brand new
            wristband. Refresh Tokens last longer (hours to days) and are kept
            safely on the server — never in the browser.
          </p>
        ),
      },
      {
        title: "What's inside a token? (JWT)",
        accent: "#22d3ee",
        content: (
          <>
            <p>
              Most Access Tokens are JWTs — a string with three parts separated
              by dots:
            </p>
            <ul>
              <li>
                <strong>Header</strong> — says \"this is a JWT, signed with
                algorithm X\"
              </li>
              <li>
                <strong>Payload</strong> — the actual info: who you are, what
                you can do, when it expires
              </li>
              <li>
                <strong>Signature</strong> — a digital seal that proves nobody
                tampered with it
              </li>
            </ul>
          </>
        ),
      },
    ],
  },
  scopes: {
    title: "Scopes",
    subtitle: "What the app is allowed to do (and NOT do)",
    accentColor: "#fbbf24",
    sections: [
      {
        title: "What are scopes?",
        accent: "#fbbf24",
        content: (
          <p>
            Scopes are like permissions on a key card. "This card opens the gym
            and the pool, but NOT the spa." When your app asks to log in, it
            lists the scopes it needs. The user sees these on the consent screen
            and can approve or deny. The token only carries the approved scopes.
          </p>
        ),
      },
      {
        title: "Common examples",
        accent: "#fbbf24",
        content: (
          <ul>
            <li>
              <strong>openid</strong> — "I want to know who this person is"
            </li>
            <li>
              <strong>profile</strong> — name, picture, basics
            </li>
            <li>
              <strong>email</strong> — the user's email address
            </li>
            <li>
              <strong>api.read</strong> — read-only access to the API
            </li>
            <li>
              <strong>api.write</strong> — permission to change data
            </li>
          </ul>
        ),
      },
      {
        title: "Least privilege",
        accent: "#fbbf24",
        content: (
          <p>
            Good apps only ask for what they need. A read-only dashboard asks
            for <code>api.read</code>. An admin tool might also need{" "}
            <code>api.write</code>. Even if an app tries to request more, the
            IDP only grants scopes the app was pre-registered for. No sneaky
            over-reaching.
          </p>
        ),
      },
    ],
  },
  idp: {
    title: "Identity Provider (IDP)",
    subtitle: "The bouncer who checks your ID so the app doesn't have to",
    accentColor: "#f472b6",
    sections: [
      {
        title: "What is an IDP?",
        accent: "#f472b6",
        content: (
          <p>
            An Identity Provider is the service that actually checks your
            username and password. Think of it as the bouncer at a club — they
            verify your ID so the bartender (the app) doesn't need to. Examples
            you've used: Google's login page, Microsoft's sign-in, or your
            company's SSO screen.
          </p>
        ),
      },
      {
        title: "Why use one?",
        accent: "#f472b6",
        content: (
          <p>
            Without an IDP, every app would need its own login system, its own
            password database, its own "forgot password" flow. With an IDP, all
            of that is centralized. One login, many apps. If you leave the
            company, IT disables your IDP account and you're locked out of
            everything instantly.
          </p>
        ),
      },
      {
        title: "What does the IDP do?",
        accent: "#f472b6",
        content: (
          <ul>
            <li>Shows you the login screen</li>
            <li>Checks your password (or fingerprint, or SSO)</li>
            <li>Gives the app a claim ticket (authorization code)</li>
            <li>Trades that ticket for an Access Token</li>
            <li>Makes sure only registered apps can request tokens</li>
            <li>Can revoke tokens if something goes wrong</li>
          </ul>
        ),
      },
    ],
  },
  "client-secrets": {
    title: "App Registration & Secrets",
    subtitle: "How the IDP knows your app is legit",
    accentColor: "#fb923c",
    sections: [
      {
        title: "Why register?",
        accent: "#fb923c",
        content: (
          <p>
            Before your app can use OAuth, it introduces itself to the IDP —
            like signing up for a loyalty program. The IDP gives the app two
            things: a <strong>client_id</strong> (its public name tag) and a{" "}
            <strong>client_secret</strong> (a private password only the app's
            server knows). This way the IDP can tell the difference between your
            real app and an imposter.
          </p>
        ),
      },
      {
        title: "What's in the config?",
        accent: "#fb923c",
        content: (
          <pre
            style={{
              fontSize: "0.75rem",
              color: "#e2e8f0",
              background: "#0f172a",
              padding: "0.5rem",
              borderRadius: 6,
              overflow: "auto",
            }}
          >{`{
  "client_id": "my-dashboard-app",
  "redirect_uris": [
    "https://dashboard.company.com/callback"
  ],
  "scopes": ["openid", "profile", "api.read"],
  "token_lifetime_seconds": 900
}`}</pre>
        ),
      },
      {
        title: "Keeping secrets safe",
        accent: "#fb923c",
        content: (
          <ul>
            <li>
              The client_secret <strong>never</strong> goes to the browser — it
              stays on the server
            </li>
            <li>
              Store it in a vault (like Azure Key Vault), not in your code
            </li>
            <li>Rotate it periodically — like changing your locks</li>
            <li>
              Phone/browser apps can't keep secrets, so they use{" "}
              <strong>PKCE</strong> instead (a cleverer handshake)
            </li>
          </ul>
        ),
      },
    ],
  },
  "myth-vs-reality": {
    title: '"Did OAuth Change?"',
    subtitle: "No — we just got better at using it correctly",
    accentColor: "#f43f5e",
    sections: [
      {
        title: "The short answer",
        accent: "#f43f5e",
        content: (
          <>
            <p>
              <strong>No — OAuth itself didn't change.</strong> What changed is
              how providers (like Cognito) implement it, and how strictly we
              follow the rules.
            </p>
            <p>
              If you ever used Cognito and thought "OAuth gives me identity" —
              that's because Cognito bundles OAuth + OIDC and puts user info
              inside the tokens. But that was always the OIDC layer doing the
              identity work, not OAuth.
            </p>
          </>
        ),
      },
      {
        title: "What actually shifted",
        accent: "#f43f5e",
        content: (
          <>
            <p>
              <strong>1. Best practices got stricter.</strong> Years ago, people
              used access tokens for everything — identity AND authorization.
              Now there's a clear split: ID Token = who you are, Access Token =
              what you can do. This is a maturity shift, not a spec change.
            </p>
            <p>
              <strong>2. Cognito made it \"easy mode.\"</strong> Cognito uses
              JWTs for both tokens and includes user info (sub, email,
              cognito:groups) directly in them. Developers just decode the token
              and get everything. Works great — but it's not portable to other
              providers.
            </p>
            <p>
              <strong>3. The industry moved toward standards.</strong> Modern
              guidance says: don't rely on what's inside the access token. Use
              the ID Token or call the /userinfo endpoint. Access tokens are
              supposed to be opaque — your API shouldn't need to read them.
            </p>
          </>
        ),
      },
      {
        title: "Memory vs reality",
        accent: "#f43f5e",
        content: (
          <>
            <table
              style={{
                width: "100%",
                fontSize: "0.8rem",
                borderCollapse: "collapse",
                color: "#e2e8f0",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #334155" }}>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>
                    What you remember
                  </th>
                  <th style={{ textAlign: "left", padding: "6px 8px" }}>
                    What was actually happening
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "6px 8px" }}>
                    "OAuth gave me identity"
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    Cognito gave you an <strong>ID Token (OIDC)</strong>
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "6px 8px" }}>
                    "We decoded tokens for user info"
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    You decoded <strong>JWT ID tokens</strong> (correct!)
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "6px 8px" }}>
                    "Access token had info too"
                  </td>
                  <td style={{ padding: "6px 8px" }}>
                    Cognito included claims as a{" "}
                    <strong>non-standard convenience</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </>
        ),
      },
      {
        title: "The senior-level way to say it",
        accent: "#f43f5e",
        content: (
          <>
            <p style={{ fontStyle: "italic", color: "#fbbf24" }}>
              "OAuth itself hasn't changed — it's always been about
              authorization. What's changed is how strictly we follow the
              separation between OAuth and OpenID Connect. Providers like
              Cognito often include identity claims in tokens, which makes it
              seem like OAuth provides identity, but in reality that comes from
              the OIDC layer via ID tokens."
            </p>
            <p style={{ marginTop: 12, color: "#94a3b8", fontSize: "0.8rem" }}>
              Bonus: "Many systems still rely on JWT access tokens containing
              identity claims, but that's an implementation detail, not part of
              the OAuth spec. In a true OAuth-compliant system, the access token
              could even be opaque."
            </p>
          </>
        ),
      },
    ],
  },
};
