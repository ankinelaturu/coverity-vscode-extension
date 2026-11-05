# my-repo — extension test workspace

| Item | Path |
|------|------|
| Sample firmware | [`interstellar/`](./interstellar/) |
| Synthetic Coverity text report | [`deploy/coverity/coverity-report.txt`](./deploy/coverity/coverity-report.txt) |

Open **this folder** (`my-repo`) as the workspace. Report location lines are **relative to this project root** (e.g. `interstellar/src/main.c`), not relative to the report file under `deploy/coverity/`.

One finding uses an **absolute path** outside this workspace:

`/Users/ankinelaturu/c-keil-root/interstellar/src/thruster_control.c`

See `~/c-keil-root/README.md` for the external tree.

See [interstellar/README.md](./interstellar/README.md) for source layout and optional compile command.
