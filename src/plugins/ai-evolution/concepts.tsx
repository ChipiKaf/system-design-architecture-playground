import React from "react";
import type { InfoModalSection } from "../../components/InfoModal/InfoModal";

export type ConceptKey =
  | "traditional-ml"
  | "data-preprocessing"
  | "prompt-engineering"
  | "foundation-models"
  | "fine-tuning"
  | "deployment";

interface ConceptDefinition {
  title: string;
  subtitle: string;
  accentColor: string;
  sections: InfoModalSection[];
  aside?: React.ReactNode;
}

export const concepts: Record<ConceptKey, ConceptDefinition> = {
  "traditional-ml": {
    title: "Traditional ML Pipeline",
    subtitle: "Feature engineering → model training → evaluation",
    accentColor: "#60a5fa",
    sections: [
      {
        title: "The classic workflow",
        accent: "#60a5fa",
        content: (
          <>
            <p>
              Traditional ML follows a linear pipeline: collect data → clean &
              pre-process → engineer features → train a model → evaluate →
              deploy. Each stage requires <strong>deep domain expertise</strong>
              .
            </p>
            <p>
              The feature engineering step is the bottleneck — data scientists
              spend 60–80% of their time crafting features that encode domain
              knowledge into numerical representations the model can learn from.
            </p>
          </>
        ),
      },
      {
        title: "Common model types",
        accent: "#60a5fa",
        content: (
          <ul>
            <li>
              <strong>Logistic Regression</strong> — binary classification,
              interpretable coefficients
            </li>
            <li>
              <strong>Random Forest</strong> — ensemble of decision trees,
              handles non-linearity
            </li>
            <li>
              <strong>XGBoost / LightGBM</strong> — gradient-boosted trees,
              Kaggle champion
            </li>
            <li>
              <strong>SVM</strong> — support vector machines, effective in
              high-dimensional spaces
            </li>
            <li>
              <strong>Neural Networks</strong> — deep learning for images,
              sequence data
            </li>
          </ul>
        ),
      },
      {
        title: "When to use traditional ML",
        accent: "#60a5fa",
        content: (
          <p>
            Structured/tabular data with well-defined features: fraud detection,
            credit scoring, recommendation engines, demand forecasting, churn
            prediction. These tasks still outperform LLMs in accuracy and cost.
          </p>
        ),
      },
    ],
  },

  "data-preprocessing": {
    title: "Data Pre-processing",
    subtitle: "Cleaning and preparing data for analysis",
    accentColor: "#a78bfa",
    sections: [
      {
        title: "Traditional ML pre-processing",
        accent: "#60a5fa",
        content: (
          <ul>
            <li>Missing value imputation (mean, median, KNN)</li>
            <li>Categorical encoding (one-hot, label, target encoding)</li>
            <li>Feature scaling (standardization, min-max normalization)</li>
            <li>Outlier detection and removal</li>
            <li>Train/test/validation splitting</li>
          </ul>
        ),
      },
      {
        title: "Generative AI pre-processing",
        accent: "#a78bfa",
        content: (
          <ul>
            <li>
              <strong>Tokenization</strong> — BPE, SentencePiece, WordPiece
            </li>
            <li>
              <strong>Data deduplication</strong> — MinHash,
              exact/near-duplicate filtering at internet scale
            </li>
            <li>
              <strong>Quality filtering</strong> — heuristic + classifier-based
              removal of low-quality text
            </li>
            <li>
              <strong>Toxic content filtering</strong> — safety classifiers, PII
              scrubbing
            </li>
            <li>
              <strong>Data mixing</strong> — balancing code, text, math,
              multilingual sources
            </li>
          </ul>
        ),
      },
      {
        title: "Key difference",
        accent: "#a78bfa",
        content: (
          <p>
            Traditional ML pre-processes <strong>structured data</strong> (rows
            & columns). Gen AI pre-processes <strong>unstructured data</strong>{" "}
            (text, code, images) at massive scale — often terabytes to
            petabytes.
          </p>
        ),
      },
    ],
  },

  "prompt-engineering": {
    title: "Prompt Engineering",
    subtitle: "Steering models via carefully crafted instructions",
    accentColor: "#c084fc",
    sections: [
      {
        title: "What is it?",
        accent: "#c084fc",
        content: (
          <>
            <p>
              Prompt engineering replaces feature engineering. Instead of
              writing code to extract features from data, you write{" "}
              <strong>natural language instructions</strong> that guide a
              foundation model to produce the desired output.
            </p>
          </>
        ),
      },
      {
        title: "Key techniques",
        accent: "#c084fc",
        content: (
          <ul>
            <li>
              <strong>Zero-shot</strong> — task description only, no examples
            </li>
            <li>
              <strong>Few-shot</strong> — include 2–5 input/output examples
            </li>
            <li>
              <strong>Chain-of-thought (CoT)</strong> — "Think step by step" for
              reasoning
            </li>
            <li>
              <strong>ReAct</strong> — reasoning + action, tool use interleaved
            </li>
            <li>
              <strong>System prompts</strong> — persona, constraints, output
              format
            </li>
          </ul>
        ),
      },
      {
        title: "Why it matters",
        accent: "#c084fc",
        content: (
          <p>
            The same model can perform classification, summarization, code
            generation, and data extraction — all determined by the prompt. This
            is the fundamental shift: from <em>one model per task</em> to{" "}
            <em>one model, many tasks</em>.
          </p>
        ),
      },
    ],
  },

  "foundation-models": {
    title: "Foundation / Fine-tuned LLMs",
    subtitle: "Pre-trained on trillions of tokens",
    accentColor: "#e879f9",
    sections: [
      {
        title: "Foundation models",
        accent: "#e879f9",
        content: (
          <>
            <p>
              Large Language Models (GPT-4, Claude, Llama, Gemini) are
              pre-trained on internet-scale text corpora using self-supervised
              learning — predicting the next token. This gives them broad
              knowledge and emergent capabilities.
            </p>
          </>
        ),
      },
      {
        title: "Key decisions",
        accent: "#e879f9",
        content: (
          <ul>
            <li>
              <strong>Model size</strong> — 7B → 70B → 400B+ parameters (cost vs
              capability)
            </li>
            <li>
              <strong>Context window</strong> — 4K → 128K → 1M+ tokens
            </li>
            <li>
              <strong>Open vs closed weights</strong> — Llama/Mistral vs
              GPT-4/Claude
            </li>
            <li>
              <strong>Latency vs quality</strong> — smaller models serve faster
            </li>
            <li>
              <strong>Cost</strong> — $0.15/M tokens (Haiku) to $15/M tokens
              (Opus)
            </li>
          </ul>
        ),
      },
      {
        title: "Multimodal evolution",
        accent: "#e879f9",
        content: (
          <p>
            Modern foundation models handle text, images, audio, and video in a
            single architecture. Vision-language models (GPT-4V, Claude 3) can
            reason about images, while others generate images (DALL-E,
            Midjourney) or code (Codex, Copilot).
          </p>
        ),
      },
    ],
  },

  "fine-tuning": {
    title: "Fine-tuning",
    subtitle: "Adapting a pre-trained model to your domain",
    accentColor: "#ef4444",
    sections: [
      {
        title: "Why fine-tune?",
        accent: "#ef4444",
        content: (
          <p>
            Foundation models are general-purpose. Fine-tuning adapts them to
            your specific domain, tone, or task — using a relatively small
            labeled dataset (hundreds to thousands of examples vs trillions for
            pre-training).
          </p>
        ),
      },
      {
        title: "Techniques",
        accent: "#ef4444",
        content: (
          <ul>
            <li>
              <strong>Full fine-tuning</strong> — update all parameters
              (expensive, needs many GPUs)
            </li>
            <li>
              <strong>LoRA</strong> — Low-Rank Adaptation: inject small
              trainable matrices, freeze the rest
            </li>
            <li>
              <strong>QLoRA</strong> — quantized LoRA, runs on consumer GPUs
            </li>
            <li>
              <strong>RLHF</strong> — Reinforcement Learning from Human Feedback
              (ChatGPT's secret sauce)
            </li>
            <li>
              <strong>DPO</strong> — Direct Preference Optimization (simpler
              alternative to RLHF)
            </li>
          </ul>
        ),
      },
      {
        title: "Fine-tuning vs RAG",
        accent: "#ef4444",
        content: (
          <p>
            Fine-tuning bakes knowledge <strong>into the model weights</strong>.
            RAG (Retrieval-Augmented Generation) keeps knowledge{" "}
            <strong>external</strong> in a vector database and retrieves it at
            query time. Use fine-tuning for style/format changes, RAG for
            up-to-date factual knowledge.
          </p>
        ),
      },
    ],
  },

  deployment: {
    title: "Deployment & Monitoring",
    subtitle: "Serving models in production and observing performance",
    accentColor: "#10b981",
    sections: [
      {
        title: "Serving infrastructure",
        accent: "#10b981",
        content: (
          <ul>
            <li>
              <strong>API gateway</strong> — rate limiting, auth, routing
              (OpenAI API, vLLM, TGI)
            </li>
            <li>
              <strong>GPU fleet</strong> — A100/H100 clusters, auto-scaling
            </li>
            <li>
              <strong>Batching</strong> — continuous batching for throughput
            </li>
            <li>
              <strong>Quantization</strong> — GPTQ, AWQ, GGUF for faster
              inference
            </li>
            <li>
              <strong>KV cache</strong> — avoid recomputing attention for long
              contexts
            </li>
          </ul>
        ),
      },
      {
        title: "Monitoring & guardrails",
        accent: "#10b981",
        content: (
          <ul>
            <li>
              <strong>Latency / TTFT</strong> — time-to-first-token, tokens per
              second
            </li>
            <li>
              <strong>Hallucination detection</strong> — factuality verification
            </li>
            <li>
              <strong>Cost tracking</strong> — token usage per endpoint / user
            </li>
            <li>
              <strong>Safety filters</strong> — input/output guardrails, PII
              detection
            </li>
            <li>
              <strong>A/B testing prompts</strong> — compare prompt variants on
              real traffic
            </li>
          </ul>
        ),
      },
      {
        title: "Traditional vs Gen AI monitoring",
        accent: "#10b981",
        content: (
          <p>
            Traditional ML monitors accuracy, precision, recall on structured
            outputs. Gen AI monitoring is harder — you're evaluating{" "}
            <strong>free-text quality</strong>, which requires LLM-as-judge
            evaluations, human ratings, and domain-specific benchmarks.
          </p>
        ),
      },
    ],
  },
};
