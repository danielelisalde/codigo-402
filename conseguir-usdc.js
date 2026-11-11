import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
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
const cantidad = "5";

try {
  const rutas = await horizon.strictReceivePaths([Asset.native()], usdc, cantidad).call();
  if (!rutas.records.length) {
    throw new Error(
      "No hay ruta XLM→USDC disponible ahora. Intenta de nuevo más tarde o usa un dispensador de Stellar Testnet indicado por el instructor.",
    );
  }

  const mejor = [...rutas.records].sort(
    (a, b) => Number(a.source_amount) - Number(b.source_amount),
  )[0];
  const maxXlm = (Number(mejor.source_amount) * 1.05).toFixed(7);
  console.log(`Cuesta aproximadamente ${mejor.source_amount} XLM recibir ${cantidad} USDC.`);

  const cuenta = await horizon.loadAccount(yo.publicKey());
  const tx = new TransactionBuilder(cuenta, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      Operation.pathPaymentStrictReceive({
        sendAsset: Asset.native(),
        sendMax: maxXlm,
        destination: yo.publicKey(),
        destAsset: usdc,
        destAmount: cantidad,
        path: mejor.path.map((asset) =>
          asset.asset_type === "native"
            ? Asset.native()
            : new Asset(asset.asset_code, asset.asset_issuer),
        ),
      }),
    )
    .setTimeout(60)
    .build();
  tx.sign(yo);
  const result = await horizon.submitTransaction(tx);
  console.log(`✅ Ya tienes ${cantidad} USDC de prueba.`);
  console.log(`Intercambio: https://stellar.expert/explorer/testnet/tx/${result.hash}`);
} catch (error) {
  console.error(`No se pudieron conseguir USDC: ${error.message}`);
  process.exitCode = 1;
}
