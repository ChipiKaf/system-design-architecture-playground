import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { LabState } from "../../lib/lab-engine";

/* ── Variant identifiers ─────────────────────────────── */

export type VariantKey =
  | "crud-basic"
  | "nested-resources"
  | "api-versioning"
  | "hateoas";

/* ── Per-variant profile ─────────────────────────────── */

export interface VariantProfile {
  key: VariantKey;
  label: string;
  color: string;
  description: string;
  maturityLevel: number;
  strengths: string[];
  weaknesses: string[];
}

export const VARIANT_PROFILES: Record<VariantKey, VariantProfile> = {
  "crud-basic": {
    key: "crud-basic",
    label: "CRUD Resources",
    color: "#3b82f6",
    description:
      "Design REST APIs around resources with nouns (not verbs) in URIs. Use HTTP methods (GET, POST, PUT, DELETE) to perform operations. Richardson Maturity Level 2.",
    maturityLevel: 2,
    strengths: [
      "Simple & intuitive resource-based URLs",
      "Leverages standard HTTP methods & status codes",
      "Easy caching via URL-based GET requests",
      "Well-understood by any developer",
    ],
    weaknesses: [
      "Over-fetching or under-fetching common",
      "No built-in discoverability",
      "Chatty for complex aggregations",
      "Versioning must be handled separately",
    ],
  },
  "nested-resources": {
    key: "nested-resources",
    label: "Nested Resources",
    color: "#f59e0b",
    description:
      "Model relationships between microservices using nested URI paths (collection/item/collection). Keep URIs no more complex than collection/item/collection.",
    maturityLevel: 2,
    strengths: [
      "Expresses parent-child relationships naturally",
      "Clear ownership: /customers/1/orders",
      "Works well for simple 1:N relationships",
      "Resource hierarchy is self-documenting",
    ],
    weaknesses: [
      "Deep nesting gets unwieldy (>2 levels)",
      "Cross-service joins require multiple calls",
      "Tight coupling between parent/child resources",
      "Complex queries need flattened alternatives",
    ],
  },
  "api-versioning": {
    key: "api-versioning",
    label: "API Versioning",
    color: "#8b5cf6",
    description:
      "Manage API evolution with versioning strategies: URI versioning (/v1/products), header versioning (X-API-Version), or query parameter versioning (?version=2).",
    maturityLevel: 2,
    strengths: [
      "Allows API evolution without breaking clients",
      "Multiple versions can coexist",
      "Clear contract per version",
      "Gradual client migration path",
    ],
    weaknesses: [
      "Maintaining multiple versions is costly",
      "URI versioning pollutes the resource namespace",
      "Header versioning is less discoverable",
      "Version proliferation if unmanaged",
    ],
  },
  hateoas: {
    key: "hateoas",
    label: "HATEOAS (Level 3)",
    color: "#22c55e",
    description:
      "Hypermedia As The Engine Of Application State — Richardson Level 3. Responses include _links to related actions, making the API fully self-discoverable.",
    maturityLevel: 3,
    strengths: [
      "Self-discoverable API — follow links",
      "Loose coupling: clients don't hardcode URLs",
      "Server controls available transitions",
      "Full REST maturity (Level 3)",
    ],
    weaknesses: [
      "More verbose responses (link overhead)",
      "Few clients actually leverage hypermedia",
      "Complex to implement properly",
      "Rare in practice — over-engineering risk",
    ],
  },
};

export const VARIANT_KEYS = Object.keys(VARIANT_PROFILES) as VariantKey[];

/* ── State shape ─────────────────────────────────────── */

export interface RestApiState extends LabState {
  variant: VariantKey;

  /* derived metrics */
  httpMethod: string;
  statusCode: number;
  payloadFormat: string;
  maturityLevel: number;
  cacheability: string;
  idempotent: boolean;
}

/* ── Metrics model ───────────────────────────────────── */

export function computeMetrics(state: RestApiState) {
  const profile = VARIANT_PROFILES[state.variant];
  state.maturityLevel = profile.maturityLevel;
  state.payloadFormat = "JSON";

  switch (state.variant) {
    case "crud-basic":
      state.httpMethod = "GET / POST / PUT / DELETE";
      state.statusCode = 200;
      state.cacheability = "GET cacheable";
      state.idempotent = true;
      break;
    case "nested-resources":
      state.httpMethod = "GET (nested)";
      state.statusCode = 200;
      state.cacheability = "GET cacheable";
      state.idempotent = true;
      break;
    case "api-versioning":
      state.httpMethod = "GET /v1 vs /v2";
      state.statusCode = 200;
      state.cacheability = "Per-version";
      state.idempotent = true;
      break;
    case "hateoas":
      state.httpMethod = "GET + follow _links";
      state.statusCode = 200;
      state.cacheability = "Link-driven";
      state.idempotent = true;
      break;
  }
}

export const initialState: RestApiState = {
  variant: "crud-basic",
  httpMethod: "GET / POST / PUT / DELETE",
  statusCode: 200,
  payloadFormat: "JSON",
  maturityLevel: 2,
  cacheability: "GET cacheable",
  idempotent: true,

  hotZones: [],
  explanation:
    "Explore RESTful API design for microservices. Choose a design pattern and step through to see how Client, API Gateway, and Services interact using REST principles.",
  phase: "overview",
};

computeMetrics(initialState);

/* ── Slice ───────────────────────────────────────────── */

const restApiSlice = createSlice({
  name: "restApi",
  initialState,
  reducers: {
    reset: () => {
      const s = { ...initialState };
      computeMetrics(s);
      return s;
    },
    softResetRun: (state) => {
      state.hotZones = [];
      state.explanation = VARIANT_PROFILES[state.variant].description;
      state.phase = "overview";
      computeMetrics(state);
    },
    patchState(state, action: PayloadAction<Partial<RestApiState>>) {
      Object.assign(state, action.payload);
    },
    recalcMetrics(state) {
      computeMetrics(state);
    },
    setVariant(state, action: PayloadAction<VariantKey>) {
      state.variant = action.payload;
      state.hotZones = [];
      state.explanation = VARIANT_PROFILES[action.payload].description;
      state.phase = "overview";
      computeMetrics(state);
    },
  },
});

export const { reset, softResetRun, patchState, recalcMetrics, setVariant } =
  restApiSlice.actions;
export default restApiSlice.reducer;
