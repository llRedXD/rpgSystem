import { writeFile } from "node:fs/promises";
import path from "node:path";
import { createVaultData, normalizePath, parseVault } from "./vault-core.mjs";

const root = process.cwd();
const outputPath = path.join(root, "src", "data", "vault-data.json");

async function main() {
  const { entities, warnings } = await parseVault(root);
  const vaultData = createVaultData(entities, warnings);

  await writeFile(outputPath, `${JSON.stringify(vaultData, null, 2)}\n`, "utf8");

  console.log(`Importados ${entities.length} registros para ${normalizePath(path.relative(root, outputPath))}`);
  if (warnings.length > 0) {
    console.log(`${warnings.length} aviso(s) gerado(s).`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
