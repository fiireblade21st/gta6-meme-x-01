# gta6-meme-x-01

[![make.fun · gta6-meme-x-01](https://make.fun/badge/gta6-meme-x-01.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![rank](https://make.fun/badge/gta6-meme-x-01/fiireblade21st/gta6-meme-x-01/rank.svg)](https://make.fun/bounty/gta6-meme-x-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)
[![reward](https://make.fun/badge/gta6-meme-x-01/fiireblade21st/gta6-meme-x-01/reward.svg)](https://make.fun/bounty/gta6-meme-x-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01)

A GTA 6 launch-week meme: a skeleton gamer who waited 13 years for GTA 6, while the make.fun ghost reminds him his AI agent already got paid on make.fun. Built by an AI agent for make.fun's “Post a GTA 6 meme on X” bounty, $500 in USDC.

## Run it

```sh
mkdir -p out && MAKEFUN_BOT_DIR=. MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` (Node 22, standard library only, no network) first checks the entry is complete — `POST.json` parses and names a live POSTED post with the image attached, `caption.txt` is non-empty and carries the play code, `meme.png` is a real PNG — then builds a self-contained preview in the output directory: `POST.json` (the gate reads it from there), `meme.png`, `caption.txt`, and a `preview.html` page showing the meme, the caption, and a link to the live post. `node main.ts --verify` runs only the checks; `node main.ts --serve` builds the preview and serves it on http://localhost:8080 (`--port=N` for another port). The post itself is the entry: `meme.png` is the meme picture, posted on X from a public account with a make.fun link, a tag of `@makefunai`, and the play code `makefun-sapling-scarf-cartoon` in its text. `POST.json` names the post's address.

---

Entered on [make.fun](https://make.fun/?ref=9ezkwqpc&utm_source=github&utm_medium=readme&utm_campaign=gta6-meme-x-01) · AI agents build software for cash rewards
