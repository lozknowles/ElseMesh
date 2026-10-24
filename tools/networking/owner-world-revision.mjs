import { readFile, writeFile, lstat } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { signObject } from "../../network/identity.mjs";
import {
  OwnerWorldLedger,
  ownerStateDigest,
} from "../../network/owner-world-ledger.mjs";
import {
  reviewOwnerRevision,
  stageOwnerRevision,
  migrateOwnerRevision,
  activateOwnerRevision,
} from "../../network/owner-world-revision.mjs";
const check = (v, m) => {
    if (!v) throw Error(m);
  },
  json = async (p) => {
    const s = await lstat(p);
    check(
      s.isFile() && !s.isSymbolicLink() && s.size <= 8 * 1024 * 1024,
      "Invalid revision input",
    );
    try {
      return JSON.parse(await readFile(p, "utf8"));
    } catch {
      throw Error("Invalid revision JSON input");
    }
  };
export async function ownerRevisionCLI(args) {
  if (!args.length || args[0] === "--help") {
    console.log(
      "Offline owner revision: inspect, plan, sign, stage, apply, activate. See docs/owner-world-revision.md. No command starts a runtime.",
    );
    return;
  }
  const [command, ...rest] = args,
    o = {};
  for (let i = 0; i < rest.length; i += 2) {
    check(
      rest[i]?.startsWith("--") &&
        rest[i + 1] &&
        !rest[i + 1].startsWith("--") &&
        !Object.hasOwn(o, rest[i]),
      "Use unique --name value options",
    );
    o[rest[i]] = rest[i + 1];
  }
  const allowed = {
    inspect: ["--ledger"],
    plan: ["--config", "--authority", "--bundle", "--request", "--output"],
    stage: ["--config", "--authority", "--bundle"],
    sign: ["--plan", "--owner", "--output"],
    apply: [
      "--config",
      "--authority",
      "--owner",
      "--bundle",
      "--manifest",
      "--output",
    ],
    activate: ["--ledger", "--receipts"],
  };
  check(
    allowed[command] &&
      Object.keys(o).every((k) => allowed[command].includes(k)) &&
      allowed[command].every((k) => Object.hasOwn(o, k)),
    "Unknown command or missing/excess option",
  );
  let result;
  if (command === "inspect") {
    const state = await OwnerWorldLedger.inspect(o["--ledger"]);
    result = {
      binding: state.binding,
      stateDigest: ownerStateDigest(state),
      members: Object.values(state.members).map((m) => ({
        playerId: m.playerId,
        status: m.status,
        generation: m.generation,
      })),
      transfers: Object.values(state.transfers).map((t) => ({
        role: t.role,
        status: t.status,
        archived: !!t.archivedByMigration,
      })),
      revision: state.revision?.selector ?? null,
    };
  } else if (command === "activate")
    result = await activateOwnerRevision({
      ledgerPath: o["--ledger"],
      receipts: await json(o["--receipts"]),
    });
  else if (command === "sign") {
    const plan = await json(o["--plan"]);
    check(
      plan.manifest?.protocol === "elsemesh.owner-revision-manifest/1",
      "Reviewed unsigned plan required",
    );
    result = signObject(plan.manifest, await json(o["--owner"]));
  } else {
    const anchorConfig = await json(o["--config"]),
      identity = await json(o["--authority"]),
      bundle = await json(o["--bundle"]),
      common = {
        ledgerPath: anchorConfig.ledgerPath,
        anchorConfig,
        identity,
        bundle,
      };
    if (command === "plan") {
      const request = await json(o["--request"]);
      check(
        Object.keys(request).every((k) =>
          [
            "migrationID",
            "pairID",
            "roster",
            "homes",
            "adminSubjects",
          ].includes(k),
        ),
        "Unexpected revision review request field",
      );
      result = await reviewOwnerRevision({ ...common, ...request });
    } else if (command === "stage") result = await stageOwnerRevision(common);
    else
      result = await migrateOwnerRevision({
        ...common,
        ownerIdentity: await json(o["--owner"]),
        manifest: await json(o["--manifest"]),
      });
  }
  if (o["--output"]) {
    const bytes = JSON.stringify(result, null, 2) + "\n";
    try {
      await writeFile(o["--output"], bytes, { flag: "wx", mode: 0o600 });
    } catch (e) {
      if (
        e.code !== "EEXIST" ||
        command !== "apply" ||
        (await readFile(o["--output"], "utf8")) !== bytes
      )
        throw e;
    }
  } else console.log(JSON.stringify(result));
  return result;
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  ownerRevisionCLI(process.argv.slice(2)).catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  });
