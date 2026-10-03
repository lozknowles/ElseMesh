# Portable source and publication checks

The public source must build and run without the maintainer's private network.
Operators configure their own service endpoints, public origin and filesystem
paths. Use neutral example hostnames and reserved documentation addresses in
committed examples. Keep safe loopback defaults and loopback-only security
checks: local development and same-machine reverse proxies do not require a
particular physical machine or private network.

The existing room server accepts its listener host/port, public HTTPS origin and
optional private speech configuration through environment variables. See
[deployment templates](../deploy/README.md). These templates describe the
experimental room server; they do not establish a completed public ThruHold
gateway, discovery or relay deployment.

## Generic and operator-specific checks

Run `npm run test:publication` to exercise the privacy checker and inspect the
publication working tree. The checker scans its own source, filenames and
supported text files for generic private-network/home-path patterns, credential
shapes, private file classes and project-specific asset/title restrictions.
It reports its scope and deliberately excluded directories.

Generic rules cannot identify every arbitrary private device name. Before
publishing a maintainer's checkout, create a UTF-8 text file **outside the
repository and web-served directories**, with one private literal per line.
Include the operator's private hostnames, domains, addresses and machine-specific
path prefixes. Blank lines and lines starting with `#` are ignored. Do not commit
the file, put real values in examples, or publish hashes of short private names.

Set `ELSEMESH_PUBLICATION_PRIVATE_TERMS_FILE` to that file's absolute path, then
run `npm run test:publication` again. In PowerShell, for example:

```powershell
$env:ELSEMESH_PUBLICATION_PRIVATE_TERMS_FILE = '/path/to/private/terms.txt'
npm run test:publication
```

The path is a placeholder; use a path appropriate to your operating system.
The checker reports that the operator-specific scan ran without printing the
configured values or location. A supplied empty, unavailable or in-repository
file fails the check. If no file is supplied, generic checks can still pass,
but output explicitly says that the operator-specific scan did not run.
Local environment files are ignored by Git; keep only neutral example files
in the repository. Ignoring a file does not remove it if already tracked.

## Evidence boundaries

The normal source check excludes Git metadata/history, dependencies, generated
`dist` output and designated runtime artifacts. It is a bounded pattern scan,
not a secret-detection guarantee or binary-metadata audit. Asset hash checks
verify the listed vehicle files; they do not establish that all assets are free
of metadata or private strings.

For a release, build from a clean checkout without private-network access and
check the generated publication tree separately. Test the deployment using the
operator's configuration. Retain source revision, commands, pass/fail results
and the surfaces actually inspected; do not equate localhost tests with
internet reachability.

Review previous commits and other published surfaces separately. Removing a
reference from the current tree does not remove it from Git history, old
branches, releases or cached pages. Any history rewrite needs a coordinated
plan; this source check does not rewrite history or change running services.
