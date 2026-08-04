import { env } from "../config/env.js";

const BYTES_PER_GB = 1_000_000_000;

type TurnUsageStatus = {
  configured: boolean;
  checkedAt: string | null;
  egressBytes: number | null;
  egressGb: number | null;
  limitGb: number;
  turnAllowed: boolean;
};

type GraphqlTurnUsageResponse = {
  data?: {
    viewer?: {
      accounts?: Array<{
        callsTurnUsageAdaptiveGroups?: Array<{
          sum?: {
            egressBytes?: number;
          };
        }>;
      }>;
    };
  };
  errors?: Array<{ message?: string }>;
};

let cachedStatus: { expiresAt: number; status: TurnUsageStatus } | null = null;

function getUsageLimitGb() {
  return Number.isFinite(env.cloudflareTurnUsageLimitGb) && env.cloudflareTurnUsageLimitGb > 0
    ? env.cloudflareTurnUsageLimitGb
    : 950;
}

function getCheckIntervalMs() {
  const seconds = Number.isFinite(env.cloudflareTurnUsageCheckSeconds) && env.cloudflareTurnUsageCheckSeconds > 0
    ? env.cloudflareTurnUsageCheckSeconds
    : 300;

  return seconds * 1000;
}

function getMonthRange(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = now;

  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10)
  };
}

function buildStatus(egressBytes: number | null): TurnUsageStatus {
  const limitGb = getUsageLimitGb();
  const egressGb = egressBytes === null ? null : egressBytes / BYTES_PER_GB;

  return {
    configured: Boolean(env.cloudflareAccountId && env.cloudflareAnalyticsApiToken),
    checkedAt: new Date().toISOString(),
    egressBytes,
    egressGb,
    limitGb,
    turnAllowed: egressGb === null || egressGb < limitGb
  };
}

export async function getTurnUsageStatus(): Promise<TurnUsageStatus> {
  const limitGb = getUsageLimitGb();

  if (!env.cloudflareAccountId || !env.cloudflareAnalyticsApiToken) {
    return {
      configured: false,
      checkedAt: null,
      egressBytes: null,
      egressGb: null,
      limitGb,
      turnAllowed: true
    };
  }

  const now = Date.now();
  if (cachedStatus && cachedStatus.expiresAt > now) {
    return cachedStatus.status;
  }

  const { dateFrom, dateTo } = getMonthRange();
  const query = `
    query TurnUsage($accountId: string!, $dateFrom: Date!, $dateTo: Date!, $keyId: string!) {
      viewer {
        accounts(filter: { accountTag: $accountId }) {
          callsTurnUsageAdaptiveGroups(
            limit: 1
            filter: {
              date_geq: $dateFrom
              date_leq: $dateTo
              keyId: $keyId
            }
          ) {
            sum {
              egressBytes
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch("https://api.cloudflare.com/client/v4/graphql", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.cloudflareAnalyticsApiToken}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        query,
        variables: {
          accountId: env.cloudflareAccountId,
          dateFrom,
          dateTo,
          keyId: env.cloudflareTurnKeyId
        }
      })
    });

    const body = (await response.json().catch(() => null)) as GraphqlTurnUsageResponse | null;

    if (!response.ok || body?.errors?.length) {
      console.error("Cloudflare TURN usage query failed", {
        status: response.status,
        errors: body?.errors
      });
      return cachedStatus?.status ?? buildStatus(null);
    }

    const usageGroups = body?.data?.viewer?.accounts?.[0]?.callsTurnUsageAdaptiveGroups ?? [];
    const egressBytes = usageGroups.reduce((total, group) => total + (group.sum?.egressBytes ?? 0), 0);
    const status = buildStatus(egressBytes);

    cachedStatus = {
      status,
      expiresAt: now + getCheckIntervalMs()
    };

    return status;
  } catch (error) {
    console.error("Cloudflare TURN usage request failed", error);
    return cachedStatus?.status ?? buildStatus(null);
  }
}
