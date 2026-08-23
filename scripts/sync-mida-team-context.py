from __future__ import annotations

import ast
import base64
import csv
import hashlib
import io
import json
import lzma
import os
import pickle
import urllib.request
from pathlib import Path

import pandas as pd

MIDA_OWNER = "tbm5923-bot"
MIDA_REPO = "32-Man-FFL-Dashboard"
MIDA_REF = "streamlit-deploy-v1"
RAW = f"https://raw.githubusercontent.com/{MIDA_OWNER}/{MIDA_REPO}/{MIDA_REF}"
API_BRANCH = f"https://api.github.com/repos/{MIDA_OWNER}/{MIDA_REPO}/branches/{MIDA_REF}"
OUTPUT = Path(os.environ.get("MIDA_OUTPUT", "mida-team-context.csv"))
REQUIRED_COLUMNS = [
    "projected_rank",
    "team",
    "conference",
    "division",
    "expected_points",
    "expected_wins",
    "playoff_prob",
    "championship_prob",
]


def fetch_text(url: str, timeout: int = 60) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Fleeced-MIDA-Context-Sync/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        if getattr(r, "status", 200) != 200:
            raise RuntimeError(f"GET {url} returned {getattr(r, 'status', 'unknown')}")
        return r.read().decode("utf-8")


def assignment_value(source: str, name: str):
    tree = ast.parse(source)
    for node in tree.body:
        if isinstance(node, ast.Assign):
            for target in node.targets:
                if isinstance(target, ast.Name) and target.id == name:
                    return ast.literal_eval(node.value)
    raise RuntimeError(f"MIDA data.py no longer defines {name}")


def branch_metadata() -> tuple[str, str]:
    payload = json.loads(fetch_text(API_BRANCH))
    sha = str(payload.get("commit", {}).get("sha") or "")
    date = str(payload.get("commit", {}).get("commit", {}).get("committer", {}).get("date") or "")
    if not sha or not date:
        raise RuntimeError("Unable to resolve MIDA deployment branch metadata")
    return sha, date


def decode_snapshot() -> tuple[dict, dict]:
    data_py = fetch_text(f"{RAW}/dashboard/data.py")
    names = assignment_value(data_py, "WEB_SNAPSHOT_FILES")
    expected_len = int(assignment_value(data_py, "WEB_SNAPSHOT_B85_LENGTH"))
    expected_sha = str(assignment_value(data_py, "WEB_SNAPSHOT_SHA256"))
    if not isinstance(names, list) or not names:
        raise RuntimeError("MIDA WEB_SNAPSHOT_FILES is empty or invalid")

    chunks = [fetch_text(f"{RAW}/outputs/{name}").strip() for name in names]
    encoded = "".join(chunks)
    if len(encoded) != expected_len:
        raise RuntimeError(f"MIDA snapshot length mismatch: {len(encoded)} != {expected_len}")
    digest = hashlib.sha256(encoded.encode("ascii")).hexdigest()
    if digest != expected_sha:
        raise RuntimeError(f"MIDA snapshot checksum mismatch: {digest} != {expected_sha}")

    payload = lzma.decompress(base64.b85decode(encoded.encode("ascii")))
    snapshot = pickle.loads(payload)
    if not isinstance(snapshot, dict) or not isinstance(snapshot.get("data"), dict):
        raise RuntimeError("MIDA snapshot top-level structure is invalid")

    data = snapshot["data"]
    scales = snapshot.get("scales", {})
    for table, column_scales in scales.items():
        frame = data.get(table)
        if not isinstance(frame, pd.DataFrame) or not isinstance(column_scales, dict):
            continue
        for column, scale in column_scales.items():
            if column in frame.columns:
                frame[column] = frame[column].astype("float64") / float(scale)
    return data, snapshot.get("meta", {}) if isinstance(snapshot.get("meta", {}), dict) else {}


def infer_selected_week(meta: dict) -> int | None:
    for key in ["selected_week", "through_week", "completed_week", "week", "current_week"]:
        value = meta.get(key)
        try:
            n = int(value)
        except (TypeError, ValueError):
            continue
        if 0 <= n <= 18:
            return n
    return None


def normalize(df: pd.DataFrame, source_date: str, selected_week: int | None) -> str:
    if not isinstance(df, pd.DataFrame):
        raise RuntimeError("MIDA standings table is not a DataFrame")
    if len(df) != 32:
        raise RuntimeError(f"MIDA standings row count changed: {len(df)} != 32")
    missing = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing:
        raise RuntimeError(f"MIDA standings schema changed; missing columns: {', '.join(missing)}")

    work = df[REQUIRED_COLUMNS].copy()
    work["projected_rank"] = pd.to_numeric(work["projected_rank"], errors="raise").astype(int)
    if sorted(work["projected_rank"].tolist()) != list(range(1, 33)):
        raise RuntimeError("MIDA projected_rank must contain each rank 1..32 exactly once")

    for col in ["expected_points", "expected_wins", "playoff_prob", "championship_prob"]:
        work[col] = pd.to_numeric(work[col], errors="raise")
    for col in ["team", "conference", "division"]:
        work[col] = work[col].astype(str).str.strip()
        if (work[col] == "").any():
            raise RuntimeError(f"MIDA standings contains blank {col} values")

    if not work["conference"].isin(["AFC", "NFC"]).all():
        raise RuntimeError("MIDA conference values changed unexpectedly")
    if not work["playoff_prob"].between(0, 1).all() or not work["championship_prob"].between(0, 1).all():
        raise RuntimeError("MIDA probability columns must remain decimal probabilities in [0,1]")

    work = work.sort_values("projected_rank").reset_index(drop=True)
    out = pd.DataFrame({
        "Team": work["team"],
        "Rank": work["projected_rank"],
        "Conf": work["conference"],
        "Division": work["division"],
        "Exp Points": work["expected_points"],
        "Exp Wins": work["expected_wins"],
        "Playoff %": work["playoff_prob"] * 100.0,
        "Title %": work["championship_prob"] * 100.0,
    })

    buf = io.StringIO()
    buf.write(f"Data as of {source_date}\n")
    if selected_week is not None:
        buf.write(f"Selected week,{selected_week}\n")
    out.to_csv(buf, index=False, float_format="%.4f", quoting=csv.QUOTE_MINIMAL)
    return buf.getvalue()


def main() -> int:
    sha, commit_date = branch_metadata()
    data, meta = decode_snapshot()
    standings = data.get("standings")
    selected_week = infer_selected_week(meta)
    text = normalize(standings, commit_date, selected_week)
    OUTPUT.write_text(text, encoding="utf-8")
    print(json.dumps({
        "ok": True,
        "mida_ref": MIDA_REF,
        "mida_commit": sha,
        "mida_commit_date": commit_date,
        "selected_week": selected_week,
        "rows": 32,
        "output": str(OUTPUT),
    }, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
