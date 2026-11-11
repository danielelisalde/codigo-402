import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
const usdc = new Asset(
  "USDC",
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
);
const yo = Keypair.fromSecret(process.env.MI_SECRETA);
const amigo = process.env.AMIGO_PUBLICA;

if (!amigo) throw new Error("Falta AMIGO_PUBLICA en .env. Ejecuta npm run cuentas primero.");

try {
  const cuenta = await horizon.loadAccount(yo.publicKey());
  const tx = new TransactionBuilder(cuenta, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.payment({
        destination: amigo,
        asset: usdc,
        amount: "1",
      }),
    )
    .addMemo(Memo.text("Codigo 402 - mi primer pago"))
    .setTimeout(60)
    .build();
  tx.sign(yo);
  const result = await horizon.submitTransaction(tx);

  console.log("✅ Pago enviado: 1 USDC de prueba.");
  console.log(`Hash: ${result.hash}`);
  console.log(`Míralo: https://stellar.expert/explorer/testnet/tx/${result.hash}`);
} catch (error) {
  console.error(`No se pudo completar el pago: ${error.message}`);
  process.exitCode = 1;
}
