import { AsyncLocalStorage } from "node:async_hooks";

import type { AccountType } from "@trendywheels/types";

export interface ActorContext {
  userId: string;
  accountType: AccountType;
  actingAsId?: string;
  ipAddress?: string;
  userAgent?: string;
  route?: string;
  method?: string;
}

const storage = new AsyncLocalStorage<ActorContext>();

export function runWithActor<T>(ctx: ActorContext, fn: () => T): T {
  return storage.run(ctx, fn);
}

export function currentActor(): ActorContext | undefined {
  return storage.getStore();
}
