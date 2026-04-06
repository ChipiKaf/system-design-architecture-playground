export type {
  DbAdapter,
  StatBadgeConfig,
  NeedCheck,
  CheckStatus,
  SceneHelpers,
} from "./types";

import type { DbType } from "../dbTradeoffSlice";
import type { DbAdapter } from "./types";
import { relationalAdapter } from "./relational";
import { mongodbAdapter } from "./mongodb";
import { cassandraAdapter } from "./cassandra";

const ADAPTERS: Record<DbType, DbAdapter> = {
  relational: relationalAdapter,
  mongodb: mongodbAdapter,
  cassandra: cassandraAdapter,
};

/** Look up the adapter for the given database type. */
export function getAdapter(dbType: DbType): DbAdapter {
  return ADAPTERS[dbType];
}

/** All registered adapters (for iteration in controls, etc.). */
export const allAdapters: DbAdapter[] = Object.values(ADAPTERS);
