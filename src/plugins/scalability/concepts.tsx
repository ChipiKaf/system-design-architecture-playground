import type { ReactNode } from "react";

export type ConceptKey =
  | "scalability"
  | "single-point-of-failure"
  | "throughput"
  | "separation-of-concerns"
  | "vertical-scaling"
  | "horizontal-scaling"
  | "autoscaling-metrics"
  | "bandwidth-vs-throughput"
  | "cpu-as-signal"
  | "stateless-servers";

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
    subtitle: "Scale up",
    accentColor: "#f97316",
    sections: [
      {
        title: "What it means",
        content:
          "Vertical scaling means adding more resources (CPU, RAM, faster disk) to a single machine. It's simple but has a ceiling — there's only so big one machine can get.",
      },
      {
        title: "Limits",
        content:
          "Even the biggest machine has a maximum. Vertical scaling also doesn't address redundancy — you still have one machine that can fail.",
      },
    ],
  },
  "horizontal-scaling": {
    title: "Horizontal Scaling",
    subtitle: "Scale out",
    accentColor: "#14b8a6",
    sections: [
      {
        title: "What it means",
        content:
          "Horizontal scaling means adding more machines. Instead of one powerful server, you run many. A load balancer distributes traffic across them.",
      },
      {
        title: "Trade-offs",
        content:
          "Horizontal scaling introduces complexity: you need load balancers, session management, data consistency strategies. But it has no theoretical ceiling and provides redundancy.",
      },
    ],
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
};
