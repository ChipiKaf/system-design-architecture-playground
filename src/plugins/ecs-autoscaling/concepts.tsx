import type { ReactNode } from "react";

export type ConceptKey =
  | "ecs"
  | "ecr"
  | "alb"
  | "cloudwatch"
  | "scaling-policy"
  | "docker"
  | "database"
  | "cicd";

interface ConceptDef {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: { title: string; content: string | ReactNode }[];
  aside?: string;
}

export const concepts: Record<ConceptKey, ConceptDef> = {
  ecs: {
    title: "Amazon ECS",
    subtitle: "Elastic Container Service",
    accentColor: "#f97316",
    sections: [
      {
        title: "What it does",
        content: "ECS runs Docker containers as tasks inside a cluster. You define a task definition (image, CPU, memory) and a service keeps the desired number of tasks running.",
      },
      {
        title: "ECS vs EKS",
        content: "ECS is AWS-native and simpler. EKS runs Kubernetes, which is more portable but more complex to operate. Both can autoscale, pull from ECR, and sit behind an ALB.",
      },
      {
        title: "Fargate vs EC2 launch type",
        content: "With Fargate, AWS manages the servers. With EC2 launch type, you manage the instances yourself. Fargate is simpler but can be more expensive at scale.",
      },
    ],
  },
  ecr: {
    title: "Amazon ECR",
    subtitle: "Elastic Container Registry",
    accentColor: "#f97316",
    sections: [
      {
        title: "What it does",
        content: "ECR stores your Docker images. When ECS scales out, new tasks pull the image from ECR. It works like Docker Hub but private and integrated with IAM.",
      },
      {
        title: "Push flow",
        content: "Your CI/CD pipeline builds the Docker image, tags it, and pushes it to ECR. ECS task definitions reference the ECR image URI.",
      },
    ],
  },
  alb: {
    title: "Application Load Balancer",
    subtitle: "Layer 7 load balancing",
    accentColor: "#3b82f6",
    sections: [
      {
        title: "What it does",
        content: "The ALB accepts all incoming HTTP/WebSocket traffic and distributes it across healthy ECS tasks. It does health checks and only routes to tasks that pass.",
      },
      {
        title: "Target groups",
        content: "ECS tasks register as targets. When a new task starts, ECS automatically registers it with the ALB target group. When a task drains, it de-registers.",
      },
      {
        title: "Why not a Network Load Balancer?",
        content: "NLB is Layer 4 (TCP) and better for raw throughput. ALB is Layer 7 (HTTP) and supports path-based routing, WebSocket upgrades, and sticky sessions.",
      },
    ],
  },
  cloudwatch: {
    title: "CloudWatch Alarms",
    subtitle: "Metric-based triggers",
    accentColor: "#e11d48",
    sections: [
      {
        title: "What it does",
        content: "CloudWatch collects CPU, memory, and request metrics from ECS. When avg CPU crosses a threshold (e.g. 70%) for a sustained period, an alarm fires.",
      },
      {
        title: "Alarm states",
        content: "OK means the metric is below the threshold. ALARM means it has breached. INSUFFICIENT_DATA means not enough data points yet. Only ALARM triggers scaling.",
      },
      {
        title: "Evaluation period",
        content: "You set how many data points must breach consecutively. For example, 3 out of 5 one-minute checks above 70% CPU triggers the alarm.",
      },
    ],
  },
  "scaling-policy": {
    title: "Auto Scaling Policy",
    subtitle: "Target tracking & step scaling",
    accentColor: "#8b5cf6",
    sections: [
      {
        title: "Target tracking",
        content: "You set a target (e.g. 70% avg CPU). AWS automatically adjusts the desired task count to keep the metric near that target. This is the simplest and most common approach.",
      },
      {
        title: "Step scaling",
        content: "More granular: you define steps like 'if CPU > 70% add 1, if > 85% add 2'. Gives finer control but is more complex to tune.",
      },
      {
        title: "Scale-in cooldown",
        content: "After scaling out, there is a cooldown period (default 300s) before scaling back in. This prevents flapping: rapidly adding and removing tasks.",
      },
    ],
  },
  docker: {
    title: "Docker & Containers",
    subtitle: "Packaging and isolation",
    accentColor: "#0ea5e9",
    sections: [
      {
        title: "Why containers?",
        content: "A Docker image bundles your Node.js app, dependencies, and config into one portable unit. Every task runs the exact same environment, eliminating 'works on my machine' problems.",
      },
      {
        title: "Image layers",
        content: "Docker images are layered. When ECR pulls an image, only changed layers download. This makes scaling out fast because most layers are already cached.",
      },
    ],
  },
  database: {
    title: "Database Choice",
    subtitle: "PostgreSQL vs MongoDB",
    accentColor: "#16a34a",
    sections: [
      {
        title: "PostgreSQL",
        content: "Relational, ACID-compliant, strong consistency. Great for structured data, joins, and transactions. Used at Nevolane for user data and room state.",
      },
      {
        title: "MongoDB",
        content: "Document-oriented, eventually consistent by default. Flexible schema, good for unstructured data and horizontal scaling. Used in MEAN stacks.",
      },
      {
        title: "How it affects scaling",
        content: "Database choice does not change ECS autoscaling directly, but it affects response time under load. PostgreSQL with connection pooling (PgBouncer) handles high concurrency well. MongoDB can shard horizontally but adds operational complexity.",
      },
    ],
  },
  cicd: {
    title: "CI/CD Pipeline",
    subtitle: "Build, test, deploy",
    accentColor: "#a855f7",
    sections: [
      {
        title: "AWS CodePipeline + CodeBuild",
        content: "CodeBuild compiles and tests your code, builds the Docker image, and pushes to ECR. CodePipeline orchestrates the stages: Source, Build, Deploy. CDK defines the pipeline as code.",
      },
      {
        title: "Jenkins",
        content: "Self-hosted CI/CD server. Highly configurable with plugins. Jenkinsfile defines the pipeline. You manage the Jenkins server yourself (often on EC2).",
      },
      {
        title: "How it connects to scaling",
        content: "CI/CD does not trigger autoscaling. It pushes new images to ECR. ECS rolling updates then replace old tasks with new ones using the latest image. Autoscaling can happen independently during a deploy.",
      },
    ],
  },
};
