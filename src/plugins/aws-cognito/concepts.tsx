import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "cognito"
  | "oauth-oidc"
  | "user-pools"
  | "tokens"
  | "api-gateway"
  | "authorizer"
  | "lambda";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  cognito: {
    title: "AWS Cognito",
    subtitle: "Amazon's built-in login system for your apps",
    accentColor: "#ff9900",
    sections: [
      {
        title: "What is Cognito?",
        accent: "#ff9900",
        content: (
          <>
            <p>
              Imagine you're building an app and you need a login page. You
              could build one yourself — store passwords in a database, handle
              "forgot password" emails, verify email addresses, deal with
              security attacks… or you could let Amazon handle all of that.
            </p>
            <p>
              That's Cognito. It's a <strong>ready-made login system</strong>{" "}
              that AWS runs for you. It stores your users, checks their
              passwords, sends verification emails, and hands out tokens — all
              managed by Amazon's infrastructure.
            </p>
          </>
        ),
      },
      {
        title: "Two parts",
        accent: "#ff9900",
        content: (
          <ul>
            <li>
              <strong>User Pools</strong> — the guest book. Stores users and
              handles login. This is what we focus on in this demo.
            </li>
            <li>
              <strong>Identity Pools</strong> — gives temporary AWS keys so
              users can directly access AWS services (like uploading to S3).
              Different use case, not covered here.
            </li>
          </ul>
        ),
      },
      {
        title: "Why not just use Auth0 or Firebase Auth?",
        accent: "#ff9900",
        content: (
          <p>
            You absolutely could! Cognito's advantage is that it's deeply
            integrated with other AWS services — API Gateway checks tokens
            automatically, Lambda gets user info for free, and you never leave
            the AWS ecosystem. Plus, the first 50,000 users per month are free.
          </p>
        ),
      },
    ],
  },
  "oauth-oidc": {
    title: "OAuth 2.0 & OIDC",
    subtitle: "The standards Cognito uses under the hood",
    accentColor: "#818cf8",
    sections: [
      {
        title: "The elevator pitch",
        accent: "#818cf8",
        content: (
          <>
            <p>
              <strong>OAuth 2.0</strong> = "What can this app do?" — It hands
              out Access Tokens (permission slips).
            </p>
            <p>
              <strong>OIDC</strong> = "Who is this person?" — It adds an ID
              Token (an identity card) on top of OAuth.
            </p>
            <p>
              Cognito speaks both of these standards. That means any app that
              knows how to do OAuth/OIDC (basically all of them) can plug into
              Cognito without special code.
            </p>
          </>
        ),
      },
      {
        title: "How Cognito uses OAuth",
        accent: "#818cf8",
        content: (
          <ul>
            <li>
              <strong>Authorization Code flow</strong> — the most common. User
              logs in, gets redirected back with tokens. Used by web apps.
            </li>
            <li>
              <strong>Code + PKCE</strong> — same thing, but for phone apps and
              single-page apps that can't keep a secret password.
            </li>
            <li>
              <strong>Client Credentials</strong> — no human involved. Used when
              one server needs to talk to another server.
            </li>
          </ul>
        ),
      },
    ],
  },
  "user-pools": {
    title: "User Pools",
    subtitle: "The guest book where your users are stored",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "What is a User Pool?",
        accent: "#60a5fa",
        content: (
          <p>
            A User Pool is just a <strong>list of users</strong> that Cognito
            manages. Each user has a profile (email, name, etc.) and a password
            that Cognito stores securely. When someone signs up or logs in,
            they're interacting with the User Pool.
          </p>
        ),
      },
      {
        title: "App Clients",
        accent: "#60a5fa",
        content: (
          <p>
            Each app that uses your User Pool gets an "App Client" — basically a
            name tag. If you have a web app, a mobile app, and an admin tool,
            each one gets its own App Client. This way Cognito knows which app
            is asking and can apply different rules to each.
          </p>
        ),
      },
      {
        title: "Cool features",
        accent: "#60a5fa",
        content: (
          <ul>
            <li>Built-in email/SMS verification</li>
            <li>"Sign in with Google/Facebook/Apple" — just flip a switch</li>
            <li>User groups (e.g., "admins" vs "regular users")</li>
            <li>Customizable password rules (length, special chars, etc.)</li>
            <li>
              Lambda triggers — run custom code when someone signs up, confirms,
              or logs in
            </li>
          </ul>
        ),
      },
    ],
  },
  tokens: {
    title: "Cognito Tokens",
    subtitle: "The three passes you get after logging in",
    accentColor: "#22d3ee",
    sections: [
      {
        title: "Three tokens, three jobs",
        accent: "#22d3ee",
        content: (
          <ul>
            <li>
              <strong>ID Token</strong> — your identity card. Says who you are:
              name, email, user ID. Use this to personalize the app ("Welcome,
              Jane!").
            </li>
            <li>
              <strong>Access Token</strong> — your employee badge. Says what
              you're allowed to do. This is what you send to the API.
            </li>
            <li>
              <strong>Refresh Token</strong> — your badge renewal form. When the
              Access Token expires (usually in an hour), you trade the Refresh
              Token for a fresh one — no need to log in again.
            </li>
          </ul>
        ),
      },
      {
        title: "How are they checked?",
        accent: "#22d3ee",
        content: (
          <p>
            Tokens are JWTs — digitally signed strings. Anyone can read them,
            but nobody can fake them. When your API gets a token, it checks the
            signature against Cognito's public keys to make sure it's genuine.
            API Gateway does this automatically.
          </p>
        ),
      },
    ],
  },
  "api-gateway": {
    title: "API Gateway",
    subtitle: "The front door to your API",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "What is it?",
        accent: "#a78bfa",
        content: (
          <p>
            API Gateway is like a <strong>reception desk</strong> for your API.
            Every request goes through it first. It checks who you are, makes
            sure you're allowed in, and then routes your request to the right
            backend service. If you're not authorized, it says "no" before your
            code even runs.
          </p>
        ),
      },
      {
        title: "Works great with Cognito",
        accent: "#a78bfa",
        content: (
          <p>
            You tell API Gateway: "Use Cognito to check tokens." After that,
            every request is automatically validated — no code to write. Valid
            token? Your Lambda runs. Invalid or missing token? 401 Unauthorized.
            It's that simple.
          </p>
        ),
      },
    ],
  },
  authorizer: {
    title: "Cognito Authorizer",
    subtitle: "The bouncer that checks your badge at the API door",
    accentColor: "#fb923c",
    sections: [
      {
        title: "How it works",
        accent: "#fb923c",
        content: (
          <ol>
            <li>A request arrives at API Gateway with a token in the header</li>
            <li>The Cognito Authorizer grabs the token</li>
            <li>
              It checks: Is this token real? Has it expired? Is it from MY User
              Pool?
            </li>
            <li>If yes → the request goes through to Lambda</li>
            <li>If no → 401 "You're not getting in." Lambda never runs.</li>
          </ol>
        ),
      },
      {
        title: "Why not just check tokens in your code?",
        accent: "#fb923c",
        content: (
          <p>
            You could, but why? The Cognito Authorizer does it automatically
            with zero code. It's faster (happens at the edge), cheaper (Lambda
            doesn't run for bad requests), and more secure (one less thing you
            can mess up). Use it when your tokens come from Cognito. If you need
            custom logic (e.g., checking a database), use a Lambda Authorizer
            instead.
          </p>
        ),
      },
    ],
  },
  lambda: {
    title: "AWS Lambda",
    subtitle: "Your backend code that runs only when needed",
    accentColor: "#fb923c",
    sections: [
      {
        title: "What is Lambda?",
        accent: "#fb923c",
        content: (
          <p>
            Lambda is <strong>serverless computing</strong> — you write a
            function, upload it to AWS, and it runs whenever it's triggered. No
            servers to manage, no scaling to think about. In this flow, API
            Gateway triggers your Lambda when a valid request comes through.
          </p>
        ),
      },
      {
        title: "Lambda + Cognito",
        accent: "#fb923c",
        content: (
          <ul>
            <li>
              API Gateway passes the user's decoded token info to Lambda — you
              can read their user ID, email, and groups without any extra work
            </li>
            <li>
              You can use groups for authorization: "Only users in the 'admins'
              group can delete records"
            </li>
            <li>
              Cognito can also trigger Lambda at sign-up and login time — e.g.,
              auto-create a user profile in DynamoDB when someone signs up
            </li>
          </ul>
        ),
      },
    ],
  },
};
