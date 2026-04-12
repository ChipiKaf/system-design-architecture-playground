import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "step-functions"
  | "standard-workflow"
  | "express-workflow"
  | "state-machine"
  | "task-state"
  | "choice-state"
  | "wait-for-callback"
  | "lambda"
  | "s3"
  | "sns"
  | "client-app"
  | "graphql-ecs"
  | "gql-mutation"
  | "claim-service"
  | "eventbridge"
  | "event-bus"
  | "rule-engine";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "step-functions": {
    title: "AWS Step Functions",
    subtitle: "Connects your services into an automatic workflow",
    accentColor: "#f97316",
    sections: [
      {
        title: "What it does — in plain English",
        accent: "#f97316",
        content: (
          <p>
            Imagine you have a checklist for processing an insurance claim:
            check the policy, calculate the payout, store the paperwork, email
            the customer. Step Functions is the manager that follows that
            checklist automatically. It runs each step in order, passes
            information between steps, and handles problems if something goes
            wrong — so your developers don't have to write "glue code" to
            connect everything together.
          </p>
        ),
      },
      {
        title: "Why insurance companies love it",
        accent: "#f97316",
        content: (
          <p>
            Insurance workflows have lots of steps that must happen in a
            specific order. Without Step Functions, you'd need custom code to
            connect every service, handle retries when things fail, and pass
            data between steps. Step Functions does all of that automatically.
            Your team writes the business logic (the "what"), and Step Functions
            handles the plumbing (the "how").
          </p>
        ),
      },
      {
        title: "Workflow types in Step Functions",
        accent: "#f97316",
        content: (
          <p>
            Step Functions has two built-in workflow types you choose from when
            creating the state machine: <strong>Standard</strong> and{" "}
            <strong>Express</strong>. These are AWS settings, not something we
            invented for this demo. Open the pills for each one to see when to
            use them.
          </p>
        ),
      },
    ],
  },
  "standard-workflow": {
    title: "Standard Workflow",
    subtitle: "The long-running, durable Step Functions mode",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What it is",
        accent: "#f59e0b",
        content: (
          <p>
            Standard is one of the two real workflow types built into AWS Step
            Functions. You pick it when you create the state machine. It is
            designed for workflows that must be durable, traceable, and able to
            run for a long time.
          </p>
        ),
      },
      {
        title: "When to use it",
        accent: "#f59e0b",
        content: (
          <p>
            Use Standard when the process can take minutes, hours, or even days.
            In insurance, that fits claims that wait for human review, extra
            documents, fraud checks, or approval steps that do not finish
            immediately.
          </p>
        ),
      },
      {
        title: "Why it fits this demo",
        accent: "#f59e0b",
        content: (
          <p>
            This claims example maps more naturally to Standard workflows,
            because real claims often pause, retry, branch, and leave behind a
            full execution history for auditing and debugging.
          </p>
        ),
      },
    ],
  },
  "express-workflow": {
    title: "Express Workflow",
    subtitle: "The fast, high-volume Step Functions mode",
    accentColor: "#22c55e",
    sections: [
      {
        title: "What it is",
        accent: "#22c55e",
        content: (
          <p>
            Express is the other built-in Step Functions workflow type. You use
            it when you need very high throughput and short execution times. It
            is optimized for speed and scale rather than long-running business
            processes.
          </p>
        ),
      },
      {
        title: "When to use it",
        accent: "#22c55e",
        content: (
          <p>
            Use Express for work that finishes quickly, often in seconds, and
            may happen thousands of times per second. In insurance, that is a
            better fit for things like real-time quote calculations, document
            preprocessing, or background event handling.
          </p>
        ),
      },
      {
        title: "Why it is not the main focus here",
        accent: "#22c55e",
        content: (
          <p>
            This visualization focuses on a claim workflow with branching and a
            clear business trail, so Standard is the easier mental model. We
            still mention Express because it is an important AWS option you will
            see when designing real Step Functions systems.
          </p>
        ),
      },
    ],
  },
  "state-machine": {
    title: "State Machine",
    subtitle: "Your workflow drawn as a flowchart",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "What it is",
        accent: "#3b82f6",
        content: (
          <p>
            A state machine is just a fancy name for a flowchart that describes
            your workflow. Each box is called a "state" — it's one step in the
            process. The arrows between boxes tell Step Functions which step
            comes next. You write this flowchart in JSON (a format called Amazon
            States Language), and Step Functions follows it exactly.
          </p>
        ),
      },
      {
        title: "Types of states you can use",
        accent: "#3b82f6",
        content: (
          <div>
            <p>
              <strong>Task</strong> — Does actual work (runs code, saves data,
              sends a message)
            </p>
            <p>
              <strong>Choice</strong> — Makes a yes/no decision (like an if/else
              in code)
            </p>
            <p>
              <strong>Wait</strong> — Pauses for a set time (useful for "try
              again in 5 minutes")
            </p>
            <p>
              <strong>Parallel</strong> — Runs multiple steps at the same time
            </p>
            <p>
              <strong>Map</strong> — Repeats a step for each item in a list
            </p>
            <p>
              <strong>Pass</strong> — Reshapes data without doing any real work
            </p>
            <p>
              <strong>Succeed / Fail</strong> — Marks the workflow as done
              (success or error)
            </p>
          </div>
        ),
      },
    ],
  },
  "task-state": {
    title: "Task State",
    subtitle: "Where the real work happens",
    accentColor: "#818cf8",
    sections: [
      {
        title: "What it does",
        accent: "#818cf8",
        content: (
          <p>
            A Task state is a step that actually does something — it calls
            another AWS service, waits for the answer, and then hands that
            answer to the next step. Think of it like an employee at a desk:
            they receive a folder, do their specific job (check the policy,
            calculate the payout, etc.), and pass the folder to the next desk.
          </p>
        ),
      },
      {
        title: "It can talk to over 200 AWS services",
        accent: "#818cf8",
        content: (
          <p>
            A Task state isn't limited to just running code. It can directly
            talk to S3 (store files), SNS (send notifications), DynamoDB
            (database), SQS (queues), and over 200 other AWS services. These
            "service integrations" mean you often don't even need to write a
            Lambda function — Step Functions can do it natively.
          </p>
        ),
      },
      {
        title: "Built-in error handling",
        accent: "#818cf8",
        content: (
          <p>
            Every Task state can have <strong>Retry</strong> rules ("if this
            fails, try again 3 times with a 5-second wait") and{" "}
            <strong>Catch</strong> rules ("if retries don't work, go to this
            error-handling step"). This is huge for insurance — if a payment
            gateway is temporarily down, the workflow retries automatically
            instead of losing the claim.
          </p>
        ),
      },
    ],
  },
  "choice-state": {
    title: "Choice State",
    subtitle: "The if/else of your workflow",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What it does",
        accent: "#f59e0b",
        content: (
          <p>
            A Choice state looks at the data from the previous step and asks a
            question: "Is this claim valid?" If yes, it goes one direction. If
            no, it goes another. It's exactly like writing{" "}
            <code>
              if (claim.isValid) {"{...}"} else {"{...}"}
            </code>{" "}
            in your code, but built into the workflow itself.
          </p>
        ),
      },
      {
        title: "How it decides",
        accent: "#f59e0b",
        content: (
          <p>
            You write rules that check values in the workflow data. For example:
            "If <code>policyStatus</code> equals <code>active</code>
            AND <code>claimAmount</code> is less than <code>coverageLimit</code>
            , follow the approved path." The first rule that matches wins.
            There's always a default path if nothing matches — like the final{" "}
            <code>else</code> in a chain.
          </p>
        ),
      },
    ],
  },
  "wait-for-callback": {
    title: "Wait for Callback (Task Token)",
    subtitle: "Pauses the workflow until an external system responds",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "What it does — in plain English",
        accent: "#f59e0b",
        content: (
          <p>
            Some steps in a workflow need a human to act — approve a claim,
            review a document, or make a judgment call. The{" "}
            <strong>waitForTaskToken</strong> integration pattern lets Step
            Functions pause and hand off a unique token. When the human (or
            external system) finishes, it calls{" "}
            <code>SendTaskSuccess(token, result)</code> and the workflow picks
            up right where it left off.
          </p>
        ),
      },
      {
        title: "How the token flows",
        accent: "#f59e0b",
        content: (
          <div>
            <p>
              <strong>1.</strong> Step Functions generates a unique{" "}
              <code>taskToken</code> and passes it to the Task state's resource
              (e.g. a Lambda, SQS, or SNS).
            </p>
            <p>
              <strong>2.</strong> That resource delivers the token to an
              external system — here, an admin dashboard that shows pending
              approvals.
            </p>
            <p>
              <strong>3.</strong> The workflow <em>pauses</em>. No compute is
              running, no cost is accruing.
            </p>
            <p>
              <strong>4.</strong> When the adjuster clicks "Approve", the
              dashboard's backend calls{" "}
              <code>SendTaskSuccess(taskToken, payload)</code>.
            </p>
            <p>
              <strong>5.</strong> Step Functions resumes the execution from the
              paused state, using the payload as the state's output.
            </p>
          </div>
        ),
      },
      {
        title: "Why Standard workflows only",
        accent: "#f59e0b",
        content: (
          <p>
            Express workflows are designed for high-throughput, short-lived
            executions (up to 5 minutes). They do not support{" "}
            <code>waitForTaskToken</code>. Standard workflows can pause for up
            to one year, which is exactly what human-in-the-loop approval needs:
            a claim might sit in a review queue for hours or days.
          </p>
        ),
      },
      {
        title: "Where the token is stored",
        accent: "#f59e0b",
        content: (
          <p>
            Typically the Task state sends the token to an SQS queue, an SNS
            topic, or a Lambda function. The receiving system stores the token
            in a database (e.g. a <code>pending_approvals</code> table in
            PostgreSQL) alongside the claim ID. The admin dashboard queries that
            table to show pending claims. When the adjuster acts, the backend
            looks up the token and calls <code>SendTaskSuccess</code> or{" "}
            <code>SendTaskFailure</code>.
          </p>
        ),
      },
      {
        title: "Error and timeout handling",
        accent: "#f59e0b",
        content: (
          <p>
            You can set a <code>HeartbeatSeconds</code> and{" "}
            <code>TimeoutSeconds</code> on the Task state. If no callback
            arrives within the timeout, Step Functions transitions to a Catch
            path — for example, escalating the claim to a supervisor or
            auto-rejecting it. This prevents claims from sitting in limbo
            forever.
          </p>
        ),
      },
    ],
  },
  lambda: {
    title: "AWS Lambda",
    subtitle: "Run code without managing servers",
    accentColor: "#f97316",
    sections: [
      {
        title: "What it does — the simple version",
        accent: "#f97316",
        content: (
          <p>
            Lambda lets you run a small piece of code (a "function") without
            setting up or managing any servers. You write your function in
            TypeScript, Python, or other languages — upload it — and AWS runs it
            whenever it's needed. You only pay for the exact time your code
            runs, down to the millisecond. No traffic? No cost.
          </p>
        ),
      },
      {
        title: "Why insurance companies pair Lambda with Step Functions",
        accent: "#f97316",
        content: (
          <p>
            Each Lambda function does ONE small job really well — "validate this
            claim", "calculate this payout", "check this policy". Step Functions
            connects all these small functions into a bigger workflow. The
            functions are written in TypeScript or Python (exactly the languages
            in the tech stack), and each one stays simple, testable, and
            focused.
          </p>
        ),
      },
      {
        title: "Lambda + PostgreSQL",
        accent: "#f97316",
        content: (
          <p>
            Lambda functions can connect to a PostgreSQL database (via RDS or
            Aurora) to read and write data. In an insurance app, the "Assess
            Claim" Lambda might query the customer's policy from PostgreSQL, run
            the calculation, and write the assessment result back — all within a
            single function invocation.
          </p>
        ),
      },
    ],
  },
  s3: {
    title: "Amazon S3",
    subtitle: "Store any file — photos, documents, PDFs",
    accentColor: "#2563eb",
    sections: [
      {
        title: "What it does",
        accent: "#2563eb",
        content: (
          <p>
            S3 (Simple Storage Service) is like a giant, unlimited hard drive in
            the cloud. You can store any type of file — photos, PDFs, videos,
            spreadsheets — and access them from anywhere. Files are organized
            into "buckets" (like folders), and each file has a unique key (like
            a file path).
          </p>
        ),
      },
      {
        title: "Why insurance companies need it",
        accent: "#2563eb",
        content: (
          <p>
            When a customer files a claim, they upload photos of the damage,
            receipts, police reports, or medical bills. All of these documents
            get stored in S3. It's extremely reliable (99.999999999% durability
            — that's 11 nines!) and cheap for storing large files. Step
            Functions can upload to S3 directly using a built-in service
            integration — no Lambda needed.
          </p>
        ),
      },
      {
        title: "How it fits in the workflow",
        accent: "#2563eb",
        content: (
          <p>
            After the claim is validated, a Task state stores the customer's
            supporting documents (photos, receipts) in an S3 bucket. Later, if
            an adjuster needs to review the claim, they can pull the files from
            S3. The React or React Native app can also let customers upload
            directly to S3 using pre-signed URLs.
          </p>
        ),
      },
    ],
  },
  sns: {
    title: "Amazon SNS",
    subtitle: "Send notifications to customers instantly",
    accentColor: "#e11d48",
    sections: [
      {
        title: "What it does",
        accent: "#e11d48",
        content: (
          <p>
            SNS (Simple Notification Service) sends messages to people or other
            services. You "publish" a message to a "topic", and everyone
            subscribed to that topic gets it instantly — via email, SMS text
            message, push notification, or even a webhook to another system.
          </p>
        ),
      },
      {
        title: "Why insurance companies use it",
        accent: "#e11d48",
        content: (
          <p>
            After a claim is approved, the customer needs to know right away —
            they're waiting! SNS sends an email and a push notification to their
            phone (through the React Native app) saying "Your claim has been
            approved. Your payout of R2,500 is being processed." Step Functions
            calls SNS directly — no Lambda function needed.
          </p>
        ),
      },
    ],
  },
  "client-app": {
    title: "React / Next.js App",
    subtitle: "The customer-facing frontend",
    accentColor: "#06b6d4",
    sections: [
      {
        title: "What it is",
        accent: "#06b6d4",
        content: (
          <p>
            This is the app customers actually see and touch — a website built
            with React and Next.js, and a mobile app built with React Native.
            Both are written in TypeScript. When a customer needs to file a
            claim, this is where they start: they open the app, fill in the
            details, upload photos, and tap "Submit Claim."
          </p>
        ),
      },
      {
        title: "How it triggers the workflow",
        accent: "#06b6d4",
        content: (
          <p>
            The app doesn't talk to Step Functions directly. Instead, it sends a
            GraphQL mutation — like{" "}
            <code>submitClaim(type: "theft", amount: 4500)</code> — to the
            backend. The backend then decides what to do with it. This
            separation is important: the frontend stays simple and focused on
            the user experience.
          </p>
        ),
      },
      {
        title: "Why React + Next.js",
        accent: "#06b6d4",
        content: (
          <p>
            React is a library for building interactive UIs. Next.js adds
            server-side rendering (faster page loads, better SEO) and built-in
            routing. TypeScript catches bugs before the code even runs. React
            Native lets the team reuse most of the same code for the iOS and
            Android apps — one team, two platforms.
          </p>
        ),
      },
    ],
  },
  "graphql-ecs": {
    title: "GraphQL API on ECS",
    subtitle: "The self-hosted backend that receives requests",
    accentColor: "#e879f9",
    sections: [
      {
        title: "What it is",
        accent: "#e879f9",
        content: (
          <p>
            The backend is a GraphQL server written in TypeScript, running
            inside Docker containers on Amazon ECS (Elastic Container Service).
            Unlike API Gateway (which is fully managed by AWS), this is a
            self-hosted server — the team controls exactly how it handles
            requests, connects to PostgreSQL, and publishes events.
          </p>
        ),
      },
      {
        title: "Why GraphQL instead of REST",
        accent: "#e879f9",
        content: (
          <p>
            With REST, the frontend might need 3 separate API calls to build one
            screen. With GraphQL, the app sends ONE request and says exactly
            what data it needs — nothing more, nothing less. This is especially
            useful for mobile apps where network speed matters. The team uses
            one GraphQL endpoint for everything.
          </p>
        ),
      },
      {
        title: "How it hands off to EventBridge",
        accent: "#e879f9",
        content: (
          <p>
            When the GraphQL resolver receives a <code>submitClaim</code>{" "}
            mutation, it validates the input, saves an initial record to
            PostgreSQL, then publishes a <code>ClaimSubmitted</code> event to
            EventBridge. The resolver returns a claim ID immediately — the
            customer doesn't wait for the entire workflow to finish.
          </p>
        ),
      },
    ],
  },
  "gql-mutation": {
    title: "GraphQL Mutation Resolver",
    subtitle: "The GraphQL function that receives the request inside ECS",
    accentColor: "#e879f9",
    sections: [
      {
        title: "What it is",
        accent: "#e879f9",
        content: (
          <p>
            A GraphQL mutation is an operation that changes data — like{" "}
            <code>submitClaim(type: "theft", amount: 4500)</code>. The schema
            defines the shape of the request and the response. When the React
            app calls this mutation, the GraphQL server matches it to a resolver
            function that runs inside the same Node.js process as the rest of
            your ECS backend.
          </p>
        ),
      },
      {
        title: "What ctx.services means",
        accent: "#e879f9",
        content: (
          <p>
            When the resolver calls{" "}
            <code>ctx.services.claimService.submitClaim(input)</code>, it is not
            calling an AWS service. <code>ctx</code> is the GraphQL request
            context, <code>services</code> is an object your backend put there,
            and <code>claimService</code> is your own class instance. This is
            just application code calling application code.
          </p>
        ),
      },
      {
        title: "Why mutations, not queries",
        accent: "#e879f9",
        content: (
          <p>
            GraphQL has two main operation types: queries (read data) and
            mutations (change data). Submitting a claim changes the world — it
            creates a new record and kicks off a workflow. By convention, that
            is always a mutation. The frontend knows: "mutations have side
            effects."
          </p>
        ),
      },
      {
        title: "What the resolver returns immediately",
        accent: "#e879f9",
        content: (
          <p>
            The resolver validates the input, saves an initial record to
            PostgreSQL, then returns a <code>claimId</code> and{" "}
            <code>status: SUBMITTED</code> right away. The customer does not
            wait for the workflow to finish. The actual processing happens
            asynchronously via EventBridge → Step Functions.
          </p>
        ),
      },
    ],
  },
  "claim-service": {
    title: "ClaimService",
    subtitle: "The business logic boundary — your application service",
    accentColor: "#d946ef",
    sections: [
      {
        title: "What it is",
        accent: "#d946ef",
        content: (
          <p>
            ClaimService is a plain TypeScript class that owns the business
            rules for claims. It validates inputs (is the amount positive? does
            the policy exist?), persists the claim record to PostgreSQL, and
            then publishes a <code>ClaimSubmitted</code> event. The GraphQL
            resolver calls ClaimService — it never talks to AWS SDKs directly.
            This class is deployed as part of the same ECS app container as the
            GraphQL server.
          </p>
        ),
      },
      {
        title: "Why separate the service from the resolver",
        accent: "#d946ef",
        content: (
          <p>
            The resolver is a thin adapter: it pulls arguments out of the
            GraphQL context and delegates to ClaimService. If the team later
            adds a REST endpoint or a CLI tool, those can call the same
            ClaimService without rewriting the business logic. This is the
            classic "ports & adapters" pattern.
          </p>
        ),
      },
      {
        title: "How it publishes the event",
        accent: "#d946ef",
        content: (
          <p>
            After saving the claim, ClaimService calls an{" "}
            <code>EventPublisher</code> (which wraps the AWS SDK{" "}
            <code>PutEventsCommand</code>). It passes the event source{" "}
            <code>"claims-api"</code>, detail-type <code>"ClaimSubmitted"</code>
            , and the claim data as the detail payload. ClaimService doesn't
            know who consumes the event — that's EventBridge's job. The actual
            network boundary only happens when the SDK sends that request out to
            AWS.
          </p>
        ),
      },
      {
        title: "Why not call Step Functions directly",
        accent: "#d946ef",
        content: (
          <p>
            ClaimService <em>could</em> call <code>StartExecution</code>
            directly, or invoke a Lambda that does it. But then the service
            starts accumulating downstream knowledge: start the workflow,
            trigger fraud checks, send analytics, maybe notify audit systems.
            With EventBridge, the service stays focused on business logic and
            publishes one fact: <code>ClaimSubmitted</code>.
          </p>
        ),
      },
    ],
  },
  eventbridge: {
    title: "Amazon EventBridge",
    subtitle: "A managed event router for decoupled fan-out",
    accentColor: "#a855f7",
    sections: [
      {
        title: "Smart router, not queue or event log",
        accent: "#a855f7",
        content: (
          <p>
            EventBridge is a managed <strong>event router</strong>. Your backend
            publishes an event, and EventBridge rules decide which target
            services should react. That is different from SQS, which is a queue
            for reliable work delivery, and different from Kafka, which is a
            persistent event log that consumers can replay later.
          </p>
        ),
      },
      {
        title: "Why this claims system uses EventBridge",
        accent: "#a855f7",
        content: (
          <p>
            This team cares more about <em>routing and fan-out</em> than about
            buffering a worker queue or storing a replayable stream. One
            <code>ClaimSubmitted</code> event may need to start Step Functions,
            trigger fraud detection, and feed analytics. EventBridge lets the
            backend publish once and stay ignorant of all those downstream
            consumers.
          </p>
        ),
      },
      {
        title: "What responsibility moved out of the service",
        accent: "#a855f7",
        content: (
          <p>
            Without EventBridge, the backend would become the orchestrator of
            reactions: call Step Functions, then fraud, then analytics, then
            whatever comes next. With EventBridge, the backend just publishes a
            domain event. The routing layer owns who reacts, and adding a new
            consumer is often a rule change rather than a backend code change.
          </p>
        ),
      },
      {
        title: "When SQS or Kafka would be better",
        accent: "#a855f7",
        content: (
          <p>
            Use <strong>SQS</strong> when you need a work queue: a consumer
            polls, processes, retries, and absorbs backpressure. Use
            <strong> Kafka</strong> when you need durable history, replay,
            ordered streams, or analytics pipelines. In many real systems,
            EventBridge sits in front of them: it routes the event, then an SQS
            queue or Kafka topic handles storage-heavy processing.
          </p>
        ),
      },
      {
        title: "How it starts the workflow",
        accent: "#a855f7",
        content: (
          <p>
            An EventBridge rule matches events where{" "}
            <code>source = \"claims-api\"</code> and{" "}
            <code>detail-type = \"ClaimSubmitted\"</code>. When matched, the
            rule calls <code>StartExecution</code> on the Step Functions state
            machine, passing the claim data as input. This is a direct
            integration — no Lambda needed in between.
          </p>
        ),
      },
    ],
  },
  "event-bus": {
    title: "Event Bus",
    subtitle: "Distributed ingestion layer inside EventBridge",
    accentColor: "#a855f7",
    sections: [
      {
        title: "What it does",
        accent: "#a855f7",
        content: (
          <p>
            The Event Bus is the front door of EventBridge. When your backend
            calls <code>putEvents()</code>, the event lands here. The bus stores
            the event briefly, assigns metadata (timestamp, region, account),
            and fans it out to the rule engine for evaluation. It is
            <strong> not a queue like SQS</strong> and{" "}
            <strong>not a replayable log like Kafka</strong> — events are
            transient unless you explicitly enable archiving.
          </p>
        ),
      },
      {
        title: "Default vs custom bus",
        accent: "#a855f7",
        content: (
          <p>
            Every AWS account has a <code>default</code> event bus that receives
            AWS service events (EC2 state changes, S3 notifications, etc.). For
            your own application events you can use the default bus or create a
            custom bus (e.g. <code>claims-bus</code>). Custom buses keep your
            application events separate from AWS noise.
          </p>
        ),
      },
      {
        title: "How it fits in your architecture",
        accent: "#a855f7",
        content: (
          <p>
            Your ECS backend publishes a <code>ClaimSubmitted</code> event to
            the bus. The bus does not know which consumer will handle it — that
            is the rule engine's job. That is exactly why EventBridge fits this
            system better than a broker-first design: the producer publishes
            once, while routing decisions stay in infrastructure. If you later
            need queue buffering or replayable streams, you can add SQS or Kafka
            as downstream targets without changing the publishing code.
          </p>
        ),
      },
    ],
  },
  "rule-engine": {
    title: "Rule Engine",
    subtitle: "Pattern-matching router inside EventBridge",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "What it does",
        accent: "#8b5cf6",
        content: (
          <p>
            For every incoming event, the rule engine evaluates it against all
            active rules in parallel. A rule is just a JSON pattern — e.g.{" "}
            <code>
              {'{"source": ["claims-api"], "detail-type": ["ClaimSubmitted"]}'}
            </code>
            . If the event matches, the rule's targets get invoked. This happens
            at millisecond latency.
          </p>
        ),
      },
      {
        title: "Fan-out is native",
        accent: "#8b5cf6",
        content: (
          <p>
            One event can match multiple rules, and each rule can have up to 5
            targets. A single <code>ClaimSubmitted</code> event could trigger
            Step Functions (processing), a Lambda (fraud detection), an SQS
            queue (analytics), and a CloudWatch log — with zero extra code.
            Adding a new consumer is just adding a new rule.
          </p>
        ),
      },
      {
        title: "Loose coupling — the core win",
        accent: "#8b5cf6",
        content: (
          <p>
            Your backend calls <code>putEvents()</code> and doesn't know who
            consumes the event. The rule engine decides. Today it routes to Step
            Functions. Tomorrow you add fraud detection — just a new rule, zero
            backend deploys. This is the architectural power of event-driven
            design.
          </p>
        ),
      },
    ],
  },
};
