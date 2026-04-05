import type { ReactNode } from "react";

export type ConceptKey =
  | "scalability"
  | "single-point-of-failure"
  | "throughput"
  | "separation-of-concerns"
  | "vertical-scaling"
  | "horizontal-scaling"
  | "scaling-strategy"
  | "autoscaling-metrics"
  | "bandwidth-vs-throughput"
  | "cpu-as-signal"
  | "stateless-servers"
  | "vcpu"
  | "ram-and-concurrency";

interface ConceptDef {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: { title: string; content: string | ReactNode }[];
  aside?: string;
}

export const concepts: Record<ConceptKey, ConceptDef> = {
  scalability: {
    title: "Scalability",
    subtitle: "Handling growth",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "What it means",
        content:
          "Scalability is a system's ability to handle increased load — more users, more requests, more data — without degrading performance.",
      },
      {
        title: "Why it matters",
        content:
          "If your system can't scale, growth kills it. Pages slow down, requests time out, and users leave. Designing for scalability from the start is cheaper than retrofitting later.",
      },
    ],
  },
  "single-point-of-failure": {
    title: "Single Point of Failure",
    subtitle: "SPOF",
    accentColor: "#ef4444",
    sections: [
      {
        title: "What it is",
        content:
          "A single point of failure (SPOF) is any component whose failure brings down the entire system. If one server handles everything, that server is a SPOF.",
      },
      {
        title: "How to eliminate SPOFs",
        content:
          "Add redundancy: multiple servers behind a load balancer, database replicas, multi-AZ deployments. If any one component can fail without taking the system down, it's no longer a SPOF.",
      },
    ],
  },
  throughput: {
    title: "Throughput",
    subtitle: "Requests per second",
    accentColor: "#22c55e",
    sections: [
      {
        title: "What it measures",
        content:
          "Throughput is the number of requests a system can handle per unit of time. Higher throughput means the system can serve more users concurrently.",
      },
      {
        title: "Bottlenecks",
        content:
          "Throughput is limited by the slowest component — CPU, memory, disk I/O, network, or database queries. Identifying the bottleneck is the first step to improving throughput.",
      },
    ],
  },
  "separation-of-concerns": {
    title: "Separation of Concerns",
    subtitle: "Decouple components",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "What it means",
        content:
          "Separation of concerns means splitting a system into distinct components, each responsible for one thing. The HTTP server handles requests; the database handles storage.",
      },
      {
        title: "Scaling benefit",
        content:
          "When components are separate, you can scale them independently. Need more request handling? Add HTTP servers. Database is the bottleneck? Add read replicas or shard.",
      },
    ],
  },
  "vertical-scaling": {
    title: "Vertical Scaling",
    subtitle: "Scale up — make one machine more powerful",
    accentColor: "#f97316",
    sections: [
      {
        title: "What it means",
        content:
          "Vertical scaling means making one machine more powerful — more CPU, more RAM, faster disk. Example: upgrading from t3.medium → m5.4xlarge. It increases the capacity of ONE bottleneck.",
      },
      {
        title: "Mental model",
        content:
          '"Make one worker stronger." Instead of hiring more people, you give your single worker better tools and more energy.',
      },
      {
        title: "When to use: early stage / simple systems",
        content:
          "One server, low traffic, minimal complexity. Just increase the instance size — it's the fastest path to more capacity with zero architectural changes.",
      },
      {
        title: "When to use: not easily distributable systems",
        content:
          "Monoliths with shared memory, legacy systems, tightly coupled state, single-thread bottlenecks. It's easier to scale up than rewrite the architecture.",
      },
      {
        title: "When to use: databases",
        content:
          "Databases are stateful and hard to distribute. You'll often vertically scale the DB first — before introducing replicas or sharding. This is one of the most common real-world uses of vertical scaling.",
      },
      {
        title: "When to use: quick performance boost",
        content:
          "Traffic spike? Performance issue? Vertical scaling is the fastest fix — resize the instance and you're done. No load balancer, no session management, no architectural changes.",
      },
      {
        title: "Limits",
        content:
          "Even the biggest machine has a maximum. Vertical scaling doesn't address redundancy — you still have one machine that can fail (single point of failure). Eventually you hit a ceiling where bigger machines become prohibitively expensive or simply don't exist.",
      },
    ],
    aside:
      "Choose vertical if: small system, early stage, stateful app, quick fix needed.",
  },
  "horizontal-scaling": {
    title: "Horizontal Scaling",
    subtitle: "Scale out — add more machines",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "What it means",
        content:
          "Horizontal scaling means adding more machines. 1 server → 2 → 10 → 100, usually behind a load balancer. It distributes load across MULTIPLE units.",
      },
      {
        title: "Mental model",
        content:
          '"Hire more workers." Instead of making one person stronger, you bring in more people to share the work.',
      },
      {
        title: "When to use: high traffic systems",
        content:
          "APIs, websites, microservices — one machine won't be enough. Horizontal scaling lets you add capacity linearly as traffic grows.",
      },
      {
        title: "When to use: stateless services",
        content:
          "If your servers are stateless (no local session data, no in-memory state), you can add more easily. Any server can handle any request. This is why stateless design matters so much.",
      },
      {
        title: "When to use: high availability / fault tolerance",
        content:
          "With multiple servers, one dies → system still works. Horizontal scaling gives you redundancy for free. No single point of failure.",
      },
      {
        title: "When to use: vertical limits reached",
        content:
          "Eventually you can't get bigger machines, or they become too expensive. The only option left is to scale out. This is the ceiling that vertical scaling hits.",
      },
      {
        title: "Trade-offs",
        content:
          "Horizontal scaling introduces complexity: load balancers, session management, data consistency strategies, distributed state. But it has no theoretical ceiling and provides redundancy.",
      },
      {
        title: "Critical limitation",
        content:
          "Horizontal scaling only works if your bottleneck is actually scalable. Example: 5 app servers + 1 database. If the DB is maxed, adding more app servers does NOTHING. This is why caching helps, DB scaling matters, and architecture matters.",
      },
    ],
    aside:
      "Choose horizontal if: high traffic, stateless services, need reliability, need elasticity (autoscaling).",
  },
  "scaling-strategy": {
    title: "Vertical vs Horizontal",
    subtitle: "The core tradeoff in system design",
    accentColor: "#e879f9",
    sections: [
      {
        title: "The core difference",
        content: (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(148,163,184,0.3)" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0.4rem 0.6rem",
                    color: "#f97316",
                  }}
                >
                  Vertical (scale up)
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0.4rem 0.6rem",
                    color: "#14b8a6",
                  }}
                >
                  Horizontal (scale out)
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Bigger machine", "More machines"],
                ["Simpler", "More complex"],
                ["Limited ceiling", "Almost unlimited"],
                ["Single point of failure", "More resilient"],
              ].map(([v, h], i) => (
                <tr
                  key={i}
                  style={{ borderBottom: "1px solid rgba(148,163,184,0.12)" }}
                >
                  <td style={{ padding: "0.35rem 0.6rem" }}>{v}</td>
                  <td style={{ padding: "0.35rem 0.6rem" }}>{h}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      },
      {
        title: "The real-world pattern",
        content:
          "Most systems do BOTH. Typical evolution: (1) Start with 1 small server. (2) Vertically scale it when it's not enough. (3) Add a load balancer + multiple servers (horizontal). (4) Scale the DB, add caching, etc. Real-world systems combine both strategies depending on constraints at each layer.",
      },
      {
        title: "Key insight: bottlenecks tie it together",
        content:
          "Throughput is limited by the bottleneck. Vertical scaling increases the capacity of ONE bottleneck. Horizontal scaling distributes load across MULTIPLE units. But horizontal only works if the bottleneck is actually scalable — 5 app servers + 1 maxed DB means adding more app servers does nothing.",
      },
      {
        title: "The sandbox shows this",
        content:
          "Try this scenario: (1) Add servers → throughput increases. (2) DB becomes the bottleneck. (3) Add cache → throughput increases again. This perfectly demonstrates how scaling, caching, and bottlenecks interact.",
      },
      {
        title: "Quick decision guide",
        content: (
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <div
                style={{
                  fontWeight: 700,
                  color: "#f97316",
                  marginBottom: "0.3rem",
                }}
              >
                Choose vertical if:
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                <li>Small system</li>
                <li>Early stage</li>
                <li>Stateful app</li>
                <li>Quick fix needed</li>
              </ul>
            </div>
            <div style={{ flex: 1, minWidth: "140px" }}>
              <div
                style={{
                  fontWeight: 700,
                  color: "#14b8a6",
                  marginBottom: "0.3rem",
                }}
              >
                Choose horizontal if:
              </div>
              <ul style={{ margin: 0, paddingLeft: "1.2rem", lineHeight: 1.7 }}>
                <li>High traffic</li>
                <li>Stateless services</li>
                <li>Need reliability</li>
                <li>Need elasticity</li>
              </ul>
            </div>
          </div>
        ),
      },
      {
        title: "Final takeaway",
        content:
          "Vertical scaling = simpler, but limited. Horizontal scaling = scalable, but requires good architecture. Real systems use both, depending on which layer is the current bottleneck.",
      },
    ],
    aside:
      "Vertical = make one worker stronger. Horizontal = hire more workers.",
  },
  "autoscaling-metrics": {
    title: "Autoscaling Metrics",
    subtitle: "What to scale on — and why",
    accentColor: "#f59e0b",
    sections: [
      {
        title: "Why CPU is the default",
        content:
          "For most apps (APIs, backends, microservices), every request needs parsing, logic, and serialization — that's CPU work. As traffic rises, CPU rises linearly until it saturates around 70–90%. That makes CPU a reliable scaling signal.",
      },
      {
        title: "Why not network?",
        content:
          "Network is often NOT the first thing to saturate. A typical instance has 5–10 Gbps capacity but your app may only push a few hundred Mbps. CPU gets maxed long before the network does.",
      },
      {
        title: "When CPU is wrong",
        content:
          "For file servers, video streaming, reverse proxies, and data pipelines, CPU might sit at 20% while network is at 95%. CPU-based autoscaling will never trigger — you need to scale on network throughput or IOPS instead.",
      },
      {
        title: "Match metric to workload",
        content:
          "API / backend → CPU. Streaming / CDN → network throughput. DB-heavy → IOPS or connections. Queue workers → queue length. The right metric is whichever reflects user pain earliest.",
      },
      {
        title: "Advanced: multi-metric scaling",
        content:
          "Good production systems don't rely on one metric. They combine CPU AND request rate AND latency. This gives much smarter scaling decisions and avoids false negatives from any single metric.",
      },
    ],
  },
  "bandwidth-vs-throughput": {
    title: "Bandwidth vs Throughput",
    subtitle: "Capacity vs actual flow",
    accentColor: "#06b6d4",
    sections: [
      {
        title: "Bandwidth = theoretical capacity",
        content:
          "Bandwidth is how big the pipe is — the maximum possible data rate. An EC2 instance with 10 Gbps bandwidth can theoretically move 10 gigabits per second.",
      },
      {
        title: "Throughput = actual achieved rate",
        content:
          "Throughput is how much data is actually flowing. If you're only sending 2 Gbps on a 10 Gbps link, your throughput is 2 Gbps. The pipe is mostly empty.",
      },
      {
        title: "The highway analogy",
        content:
          "Bandwidth is the highway size (4 lanes). Throughput is actual cars on the road. You can have a big highway with few cars (high bandwidth, low throughput).",
      },
      {
        title: "Why throughput < bandwidth",
        content:
          "You almost never hit max bandwidth because of CPU limits, disk speed, network latency, TCP overhead, and application inefficiencies. These bottlenecks cap throughput well below the theoretical maximum.",
      },
    ],
  },
  "cpu-as-signal": {
    title: "CPU as a Scaling Signal",
    subtitle: "Protecting latency and user experience",
    accentColor: "#ec4899",
    sections: [
      {
        title: "The deeper insight",
        content:
          "Autoscaling is not about resources — it's about protecting latency and user experience. CPU just happens to correlate well with that for most applications.",
      },
      {
        title: "Start with CPU",
        content:
          "CPU is the easiest metric to scale on and works for most apps. Set a target like 70% average CPU utilization in your Auto Scaling Group and let it react.",
      },
      {
        title: "Validate with CloudWatch",
        content:
          "Check CPUUtilization, NetworkIn/NetworkOut, and Latency (via ALB). If CPU spikes but latency stays flat, CPU might not be your real bottleneck. If latency spikes before CPU does, something else is saturating first.",
      },
      {
        title: "The key question",
        content:
          "Ask: 'What breaks first when load increases?' That thing — CPU, network, disk, connections — is your scaling metric. CPU is the default answer, but every architecture deserves verification.",
      },
      {
        title: "Mental model",
        content:
          "Bandwidth = capacity. Throughput = usage. CPU = work being done. Autoscaling watches whichever hits its limit first and impacts users fastest.",
      },
    ],
  },
  "stateless-servers": {
    title: "Stateless Servers",
    subtitle: "Keep compute disposable, keep state shared and durable",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "Why stateless?",
        content:
          "When you scale horizontally, requests can land on any server. If one server has important in-memory state and another doesn't, behavior becomes inconsistent — a user appears logged out because their session lives on Server A but the request hit Server B.",
      },
      {
        title: "What lives outside the servers",
        content:
          "Database for persistent application data. Redis or similar for cache and shared sessions. Object storage (S3) for files. Message queues for async work. The HTTP servers themselves should own no important long-lived state.",
      },
      {
        title: "Functionally stateless",
        content:
          "Servers don't need to be perfectly stateless, but functionally stateless for request handling: any server can handle any request, no request depends on local memory from a previous request, and replacing one server doesn't break users. Auth via JWT or shared session store, files in S3, app data in DB.",
      },
      {
        title: "Can you scale with stateful servers?",
        content:
          "Yes, but it gets harder. You can use sticky sessions (LB keeps sending the same user to the same server), session replication, or shared filesystems. But these add complexity — if the instance dies, state is lost; load distribution becomes uneven; scaling is less clean. It's usually a compromise, not the ideal.",
      },
      {
        title: "The cashier analogy",
        content:
          "Horizontal scaling is like adding more cashiers. It only works well if prices, inventory, and customer records are in a shared system. If each cashier keeps their own private notebook, things break fast.",
      },
      {
        title: "Bottom line",
        content:
          "Shared state should live outside the HTTP servers. HTTP servers should generally be stateless. Not because it's a law, but because it makes load balancing, failover, and autoscaling actually work. Rule: keep compute disposable, keep state shared and durable.",
      },
    ],
  },
  vcpu: {
    title: "vCPU",
    subtitle: "Virtual CPU — parallel processing power",
    accentColor: "#38bdf8",
    sections: [
      {
        title: "What is a vCPU?",
        content:
          "vCPU stands for virtual CPU. It represents one hardware thread on a real CPU core. Think of it as: how many parallel pieces of work this machine can handle at once. 2 vCPU ≈ 2 threads running simultaneously.",
      },
      {
        title: "What it affects",
        content:
          "vCPU controls how many requests can be processed at the same time, how fast computation happens, and how quickly your server gets saturated. More vCPU → more requests processed concurrently → higher throughput.",
      },
      {
        title: "Kitchen analogy",
        content:
          "Think of vCPU as the number of chefs in a kitchen. 2 chefs can prepare 2 dishes at once. 8 chefs can handle 8 at once. Doubling the chefs roughly doubles your throughput — until something else becomes the bottleneck.",
      },
      {
        title: "When CPU saturates",
        content:
          "When CPU hits 95–99%, it means requests are arriving faster than your vCPUs can process them. A queue builds up, latency increases, and eventually requests start getting dropped. This is the signal to either scale up (more vCPU) or scale out (more servers).",
      },
      {
        title: "vCPU in the sandbox",
        content:
          "Each server profile in the sandbox has a baselineRps that scales with vCPU count. Scaling up from t3.medium (2 vCPU) to m6i.xlarge (4 vCPU) roughly doubles the rps capacity the server can handle before saturating.",
      },
      {
        title: "Important caveat",
        content:
          "More vCPU does NOT always mean linear throughput gains. The DB may bottleneck. The network may saturate. The app may not parallelise efficiently. vCPU is one input into capacity — not the only one.",
      },
    ],
    aside: "vCPU = number of chefs. RAM = size of the kitchen.",
  },
  "ram-and-concurrency": {
    title: "RAM & Concurrency",
    subtitle: "Memory — how much you can hold at once",
    accentColor: "#4ade80",
    sections: [
      {
        title: "What is RAM (GiB)?",
        content:
          "GiB stands for gibibytes — essentially the same as gigabytes of memory. RAM is what your server uses to hold active requests, cache data in memory, run the application, buffer responses, and store temporary objects.",
      },
      {
        title: "CPU vs RAM — the core distinction",
        content:
          "CPU = how fast you process. RAM = how much you can hold at once. A server with lots of vCPU but little RAM will process quickly but struggle with many concurrent requests. A server with lots of RAM but few vCPU will hold many connections but process them slowly.",
      },
      {
        title: "How RAM affects concurrency",
        content:
          "If your app uses 200 MB per request: 8 GiB RAM → ~40 concurrent requests max. 16 GiB RAM → ~80 concurrent. Running out of RAM causes the OS to swap to disk, which is catastrophically slow — latency spikes from milliseconds to seconds.",
      },
      {
        title: "Kitchen analogy",
        content:
          "RAM is the size of the kitchen. vCPU is the number of chefs. 2 chefs in a tiny kitchen get crowded fast. Many chefs in a big kitchen work smoothly. Many chefs in a small kitchen = chaos. You need both to scale.",
      },
      {
        title: "RAM in the sandbox",
        content:
          "The sandbox uses RAM indirectly through the server profile. Bigger instances have more GiB, which supports higher concurrency without memory-pressure latency spikes. The response time model reflects this — higher-tier instances maintain lower latency under the same load.",
      },
      {
        title: "Vertical scaling ties it together",
        content: (
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.88rem",
            }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid rgba(148,163,184,0.3)" }}>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0.3rem 0.5rem",
                    color: "#94a3b8",
                  }}
                >
                  Instance
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0.3rem 0.5rem",
                    color: "#38bdf8",
                  }}
                >
                  vCPU
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0.3rem 0.5rem",
                    color: "#4ade80",
                  }}
                >
                  RAM
                </th>
                <th
                  style={{
                    textAlign: "left",
                    padding: "0.3rem 0.5rem",
                    color: "#f97316",
                  }}
                >
                  ~RPS
                </th>
              </tr>
            </thead>
            <tbody>
              {[
                ["t3.small", "2", "2 GiB", "40"],
                ["t3.medium", "2", "4 GiB", "60"],
                ["t3.large", "2", "8 GiB", "90"],
                ["m6i.large", "2", "8 GiB", "120"],
                ["m6i.xlarge", "4", "16 GiB", "200"],
                ["m6i.2xlarge", "8", "32 GiB", "350"],
              ].map(([inst, cpu, ram, rps], i) => (
                <tr
                  key={i}
                  style={{ borderBottom: "1px solid rgba(148,163,184,0.08)" }}
                >
                  <td
                    style={{
                      padding: "0.28rem 0.5rem",
                      fontFamily: "monospace",
                      color: "#f97316",
                      fontSize: "0.82rem",
                    }}
                  >
                    {inst}
                  </td>
                  <td style={{ padding: "0.28rem 0.5rem" }}>{cpu}</td>
                  <td style={{ padding: "0.28rem 0.5rem" }}>{ram}</td>
                  <td style={{ padding: "0.28rem 0.5rem", color: "#86efac" }}>
                    ~{rps}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ),
      },
    ],
    aside: "RAM = size of the kitchen. vCPU = number of chefs.",
  },
};
