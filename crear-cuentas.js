import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";
import { chmodSync, existsSync, writeFileSync } from "node:fs";

const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
const usdc = new Asset(
  "USDC",
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
);

const yo = process.env.MI_SECRETA
  ? Keypair.fromSecret(process.env.MI_SECRETA)
  : Keypair.random();
const amigo = process.env.AMIGO_SECRETA
  ? Keypair.fromSecret(process.env.AMIGO_SECRETA)
  : Keypair.random();

if (!process.env.MI_SECRETA || !process.env.AMIGO_SECRETA) {
  const env = [
    `MI_PUBLICA=${yo.publicKey()}`,
    `MI_SECRETA=${yo.secret()}`,
    `AMIGO_PUBLICA=${amigo.publicKey()}`,
    `AMIGO_SECRETA=${amigo.secret()}`,
    "",
  ].join("\n");
  writeFileSync(".env", env, { mode: 0o600 });
  chmodSync(".env", 0o600);
}

async function fondearSiHaceFalta(keypair, nombre) {
  try {
    await horizon.loadAccount(keypair.publicKey());
  } catch (error) {
    if (error?.response?.status !== 404) throw error;
    const response = await fetch(
      `https://friendbot.stellar.org?addr=${encodeURIComponent(keypair.publicKey())}`,
    );
    if (!response.ok) {
      throw new Error(`Friendbot falló para ${nombre}: ${response.status}`);
    }
  }
}

async function crearTrustline(keypair, nombre) {
  const cuenta = await horizon.loadAccount(keypair.publicKey());
  const tieneTrustline = cuenta.balances.some(
    (balance) => balance.asset_code === "USDC" && balance.asset_issuer === usdc.issuer,
  );
  if (tieneTrustline) {
    console.log(`✅ ${nombre}: trustline USDC ya existe.`);
    return;
  }

  const tx = new TransactionBuilder(cuenta, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: usdc }))
    .setTimeout(60)
    .build();
  tx.sign(keypair);
  const result = await horizon.submitTransaction(tx);
  console.log(`✅ ${nombre}: ${keypair.publicKey()}`);
  console.log(`Trustline USDC: https://stellar.expert/explorer/testnet/tx/${result.hash}`);
}

try {
  for (const [keypair, nombre] of [[yo, "Tu cuenta"], [amigo, "Cuenta de tu amigo"]]) {
    await fondearSiHaceFalta(keypair, nombre);
    await crearTrustline(keypair, nombre);
  }
  console.log("\nListo. Las llaves quedaron en .env (no se sube a GitHub).");
  console.log(`Mira tu cuenta: https://stellar.expert/explorer/testnet/account/${yo.publicKey()}`);
} catch (error) {
  console.error(`No se pudieron preparar las cuentas: ${error.message}`);
  process.exitCode = 1;
}
