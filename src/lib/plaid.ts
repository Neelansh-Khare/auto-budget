import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";
import { encrypt } from "./encryption";
import { prisma } from "./prisma";
import { DateTime } from "luxon";

function getPlaidClient() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV || "sandbox";
  if (!clientId || !secret) {
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET are required");
  }
  const config = new Configuration({
    basePath: PlaidEnvironments[env as keyof typeof PlaidEnvironments],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });
  return new PlaidApi(config);
}

export async function createLinkToken(userId: string) {
  const plaid = getPlaidClient();
  const resp = await plaid.linkTokenCreate({
    client_name: "AutoBudgeter",
    language: "en",
    country_codes: [CountryCode.Us],
    user: { client_user_id: userId },
    products: [Products.Transactions],
  });
  return resp.data.link_token;
}

export async function exchangePublicToken(publicToken: string) {
  const plaid = getPlaidClient();
  const resp = await plaid.itemPublicTokenExchange({ public_token: publicToken });
  return resp.data.access_token;
}

export async function syncFromPlaid({
  accessToken,
  since,
}: {
  accessToken: string;
  since?: Date;
}) {
  const plaid = getPlaidClient();
  const accountsResp = await plaid.accountsBalanceGet({ access_token: accessToken });
  const accounts = accountsResp.data.accounts;

  const startDate = since
    ? DateTime.fromJSDate(since).toISODate()
    : DateTime.now().minus({ days: 90 }).toISODate();
  const endDate = DateTime.now().toISODate();
  const txResp = await plaid.transactionsGet({
    access_token: accessToken,
    start_date: startDate!,
    end_date: endDate!,
  });

  return {
    accounts,
    transactions: txResp.data.transactions,
  };
}

export async function storeAccessToken(userId: string, token: string, institutionName: string) {
  const encrypted = encrypt(token);
  await prisma.settings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  await prisma.auditLog.create({
    data: {
      eventType: "plaid_token_stored",
      payload: { userId, institutionName },
    },
  });
  return encrypted;
}

