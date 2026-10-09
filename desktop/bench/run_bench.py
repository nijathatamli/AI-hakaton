"""The #1 project's receipt printer: 6 bugs x 3 players, re-checkable from session.json.

Benchmark: every planted bug x every player. Writes results.csv and RESULTS.md next to this file.

    python bench/run_bench.py            # full matrix, about 20 minutes
    python bench/run_bench.py --quick    # one run per bug with the explore player

Each run is one minute of real play against the Godot test game. Detection is judged by
matching incident kinds to the bug we planted, so a human can re-check every row from session.json.
"""
import csv, json, os, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EXE = ROOT / "target" / "release" / ("playerone.exe" if os.name == "nt" else "playerone")
OUT = ROOT / "runs" / "bench"
MINUTES = float(os.environ.get("BENCH_MINUTES", "1"))

BUGS = ["hud", "softlock", "error", "crash", "freeze", "none"]
PLAYERS = ["random", "explore", "ollama:qwen2.5vl:3b"]

# what counts as catching each bug
def caught(bug, incidents):
    kinds = [i["kind"] for i in incidents]
    text = " ".join((i["detail"] + " " + " ".join(i["console"])).lower() for i in incidents)
    if bug == "hud":
        return any(k == "player_flag" and any(w in i["detail"].lower() for w in ("coin", "counter", "hud", "score")) for k, i in zip(kinds, incidents))
    if bug == "softlock":
        return "softlock" in kinds
    if bug == "error":
        return "console_error" in kinds and ("open" in text or "null" in text or "nil" in text)
    if bug == "crash":
        return "crash" in kinds
    if bug == "freeze":
        return "hang" in kinds
    return False

def false_alarms(bug, incidents):
    n = 0
    for i in incidents:
        if bug == "none":
            n += 1
        elif not caught(bug, [i]) and not (bug == "crash" and i["kind"] == "console_error" and "spike" in i["detail"]):
            n += 1
    return n

def run(bug, player):
    name = f"{bug}-{player.split(':')[0]}"
    out = OUT / name
    launch = "godot --path testgame -- --bugs=" + ("" if bug == "none" else bug)
    cmd = [str(EXE), "run", "--launch", launch, "--window", "Cavern", "--engine", "godot",
           "--minutes", str(MINUTES), "--player", player, "--keys", "left,right,space",
           "--goal", "walk right through the level, collect coins, get past every obstacle and watch the coin counter",
           "--out", str(out)]
    t = time.time()
    subprocess.run(cmd, cwd=ROOT, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, timeout=MINUTES * 60 + 120)
    s = json.loads((out / "session.json").read_text(encoding="utf-8"))
    inc = s["incidents"]
    hit = caught(bug, inc) if bug != "none" else None
    first = next((i["t_ms"] for i in inc if caught(bug, [i])), None)
    m = s["meter"]
    sizes = sum(p.stat().st_size for p in out.glob("incident-*.*"))
    return {
        "bug": bug, "player": player, "caught": "" if hit is None else ("yes" if hit else "no"),
        "seconds_to_catch": "" if first is None else round(first / 1000, 1),
        "false_alarms": false_alarms(bug, inc), "incidents": len(inc), "player_steps": m["player_steps"],
        "player_tokens": m["player_tokens"]["input"] + m["player_tokens"]["output"],
        "naive_bigmodel_tokens": m["naive_director_tokens"], "evidence_kb": round(sizes / 1024, 1),
        "wall_s": round(time.time() - t, 1),
    }

def main():
    quick = "--quick" in sys.argv
    players = ["explore"] if quick else PLAYERS
    # --only freeze,crash reruns just those bugs and keeps the other rows from results.csv
    only = next((a.split("=", 1)[1].split(",") for a in sys.argv if a.startswith("--only=")), None)
    OUT.mkdir(parents=True, exist_ok=True)
    rows = []
    csv_path = ROOT / "bench" / "results.csv"
    if only and csv_path.exists():
        rows = [r for r in csv.DictReader(open(csv_path)) if r["bug"] not in only]
    for bug in BUGS:
        if only and bug not in only:
            continue
        for p in players:
            print(f"running {bug} with {p} ...", flush=True)
            try:
                r = run(bug, p)
            except Exception as e:
                r = {"bug": bug, "player": p, "caught": f"error: {e}"}
            print("  ", r, flush=True)
            rows.append(r)
            fields = ["bug", "player", "caught", "seconds_to_catch", "false_alarms", "incidents", "player_steps",
                      "player_tokens", "naive_bigmodel_tokens", "evidence_kb", "wall_s"]
            with open(csv_path, "w", newline="") as f:
                w = csv.DictWriter(f, fieldnames=fields)
                w.writeheader()
                w.writerows([{k: x.get(k, "") for k in fields} for x in rows])
    write_md(rows, players)

def write_md(rows, players):
    lines = ["# Benchmark results", "", f"Each run: {MINUTES:g} minute of real play against `testgame` with one planted bug. "
             "`none` is a clean build, so anything reported there is a false alarm.", "",
             "| Bug | " + " | ".join(players) + " |", "|---|" + "---|" * len(players)]
    for bug in BUGS:
        cells = []
        for p in players:
            r = next((x for x in rows if x["bug"] == bug and x["player"] == p), {})
            if bug == "none":
                cells.append(f"{r.get('false_alarms', '?')} false alarms")
            else:
                c = r.get("caught", "?")
                cells.append(f"{c} ({r['seconds_to_catch']}s)" if c == "yes" else str(c))
        lines.append(f"| {bug} | " + " | ".join(cells) + " |")
    lines += ["", "| Player | Bugs caught (of 5) | False alarms | Player tokens per run | Big-model tokens if it played itself |", "|---|---|---|---|---|"]
    for p in players:
        rs = [x for x in rows if x["player"] == p and str(x.get("player_steps", "")) != ""]
        got = sum(1 for x in rs if x["caught"] == "yes")
        fa = sum(int(x["false_alarms"]) for x in rs)
        pt = round(sum(int(x["player_tokens"]) for x in rs) / max(len(rs), 1))
        nt = round(sum(int(x["naive_bigmodel_tokens"]) for x in rs) / max(len(rs), 1))
        lines.append(f"| {p} | {got} | {fa} | {pt} | {nt} |")
    (ROOT / "bench" / "RESULTS.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print("\n".join(lines))

if __name__ == "__main__":
    main()
