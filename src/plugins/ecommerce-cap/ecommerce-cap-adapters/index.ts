export type {
  EcommerceCapAdapter,
  StatBadgeConfig,
  SceneHelpers,
  ServiceProfile,
  ServiceColors,
} from "./types";

import type { ServiceType } from "../ecommerceCapSlice";
import type { EcommerceCapAdapter } from "./types";
import { catalogAdapter } from "./catalog";
import { inventoryAdapter } from "./inventory";
import { notificationsAdapter } from "./notifications";
import { ordersAdapter } from "./orders";
import { paymentsAdapter } from "./payments";

const ADAPTERS: Record<ServiceType, EcommerceCapAdapter> = {
  catalog: catalogAdapter,
  inventory: inventoryAdapter,
  payments: paymentsAdapter,
  orders: ordersAdapter,
  notifications: notificationsAdapter,
};

/** Look up the adapter for the given e-commerce service. */
export function getAdapter(serviceType: ServiceType): EcommerceCapAdapter {
  return ADAPTERS[serviceType];
}

/** All registered adapters (for iteration in controls, etc.). */
export const allAdapters: EcommerceCapAdapter[] = Object.values(ADAPTERS);
