# Independent repository portal qualification

## Architecture and use

The reusable editor writes repository/3 connection data. One installed ElseMesh runtime loads independent repositories through the shared validated contract, with stable world and portal IDs. Repository URLs, authored commit/digest, runtime endpoint and player/session identity remain separate. No credentials, keys or transient presence are authored world content.

The bounded demonstration uses one authenticated coordinator serving two independently stored, pinned repositories. It extends the existing federation signatures and recovered transition owner. It does not qualify distributed authority failover or coordinator restart recovery. VIEW and ENTER are distinct permissions; a repository link grants neither permission. An unacknowledged commit freezes simulation until authoritative recovery; expired or inconsistent recovery cannot resume a stale session.

Open worlds.html using the repository server configured by its operator. No repository scripts or install hooks execute when opening content. The existing first-person Player, collision/water queries, original avatar chooser and original male/female models are reused. V toggles the optional tracking camera. Personal appearance remains browser/session data. The camera deliberately reframes at world activation; it does not interpolate unrelated world coordinates.

## Reproduction

Run npm run test:portals for the bounded domain, host, transport, recovery, camera and rendering-policy unit regressions (111 passing in the final software qualification). The renderer regression command passes 28 tests plus its water GPU fixture. Run npm run build separately. GPU tests and physical client acceptance are separate evidence; unit success is not physical client proof.

The installed contract is generated from clean editor commit 6921b6879007eba489d3a98dce4c484382fbacd9. Its SHA-256 is 2b3e6a6a844e2cb7c5ce40d38cd9c3eb5820adcfb1041ac0ae57e604bf9f2b50. The editor verification passed 132 tests using npx vitest run --maxWorkers=1 --testTimeout=15000, lint, build, two mixed-version Git clone/checkpoint checks and seven portal UI checks. Default highly parallel runs exceeded the existing weather stress test timeout; no weather source change was made.

Independent world authored revisions are fc03d1efe020bf045cc41dcb09f9ba12742e45fc (warehouse) and 5d18c58fec4f7326d5716c171d01fcbc78342f67 (woodland). Later README-only commits retain the same selected authored snapshots. Updating a branch does not silently replace operator-pinned running content.

## Evidence boundaries

Native WebGPU and WebGL2 mapped-view GPU checks cover clipping and viewpoint parallax. Local integrated gameplay covers outward and return crossings, finite mapped arrival, duplicate commit, stale generation, offline and permission rejection. The two physical clients are MSI and macomarchy. Both completed outward and return transfers with their original male/female avatar models and personal red/green colours. The replacement recording uses the supported WebGL2 renderer on both clients; earlier MSI native WebGPU traversal remains separate evidence.

Video capture uses the actual game canvas with original animated avatars and electric portal rims. Canvas recording excludes DOM transition overlays, HUD and audio. Any labels added to the video describe the recorded client/world; no replacement avatars or synthesized gameplay are used.

The original portal rim shader/arcs were recovered from the existing portal implementation. The crossing particle presentation is a new runtime effect; exact restoration of an unidentified historical Star Trek transition is not claimed.

## Assets and licences

Asset attribution and provenance stay with each world and the installed model assets. These repositories grant no new rights to third-party content. The installed editor contract retains its provenance and third-party notices; its editor software licence is recorded as unspecified and is not implicitly relicensed by the game root MIT notice. The bounded world repositories remain private.

## Replacement video and performance limits

ElseMesh-two-world-portals-side-by-side.mp4 is 69 seconds, 2560 by 720, H.264 at 30 output frames/second, 2,070 decoded frames and 18,261,313 bytes. SHA-256: d2c07a1c66d985c1160a1210752eb5320a935d56cfbbc5847fac2b178bb5f284. Full decode and contact-sheet review passed. Two original 1280 by 720 views are shown without enlargement; the Mac source is downsampled from 1520 by 855. Common wall-clock bounds are 1792758194000 through 1792758263000. The Mac input sequence began later, and the actual stagger is preserved rather than aligning motions artificially.

The MSI source has a maximum decoded frame gap of 0.437 seconds. The Mac has actual transfer/loading gaps of approximately 2.0 and 1.65 seconds within the selected window; those pauses remain visible. Frame-rate normalization repeats actual held frames, with no motion interpolation. This is a truthful two-machine demonstration, not a smooth-frame-rate guarantee.

Native WebGPU preparation now gates complete main, shadow and clipped-preview pipelines before admission/activation. The final native preparation preflight produced no new world-material synchronous compilations, but approximately two-second preparation/presentation gaps remain. Pending procedural avatar stand-ins are suppressed and presence freshness respects model readiness; the integration ordering regression passes. Material-owned pipeline/layout entries are evicted on disposal, with 100-cycle unit coverage and an actual GPU check proving another candidate still renders. These checks do not establish immediate GPU memory reclamation or native continuous smoothness.

## Hosting and release boundary

Checked against current GitHub documentation on 23 October 2026: ordinary Git warns above 50 MiB and blocks files above 100 MiB. The bounded independent world repositories are approximately 3.06 MB and 0.625 MB; their largest content file is about 2 MB. Ordinary Git is appropriate for this slice. Larger future assets need a separately qualified storage strategy. Git LFS uses external pointer content, is not hydrated by the current importer, and cannot be assumed to work with GitHub Pages. Sources: [large files](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github), [Git LFS](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-git-large-file-storage).

The authorised release is a normal source push to main with [skip ci] in each release tip. No pull request, workflow dispatch or Pages deployment is part of this operation. Both repositories have Actions enabled, and the existing push workflows would otherwise run. GitHub documents that [skip ci] suppresses push/pull_request workflow runs; post-push run listings and remote commit IDs are verified separately. [Skipping workflow runs](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/skip-workflow-runs).

Local qualification and the replacement video are complete within these disclosed limits. The completion review and decision are recorded in repository-portals-plan.md. Remote publication is a separate explicitly authorised step; this document does not claim a new public deployment.
