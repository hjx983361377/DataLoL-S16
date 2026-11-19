"""Shared paths for the S16 data pipeline.

Layout (repo root = two levels above this file):

    data/games.json     parsed per-game records (what the site reads)
    data/series.json    series / schedule index
    data/summary.json   aggregate counters
    data/raw/*.html     immutable HTML snapshots (git-ignored, ~87 MB)
"""
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
DATA = os.path.join(ROOT, "data")
RAW = os.path.join(DATA, "raw")

GAMES = os.path.join(DATA, "games.json")
SERIES = os.path.join(DATA, "series.json")
SUMMARY = os.path.join(DATA, "summary.json")


def ensure_dirs():
    os.makedirs(RAW, exist_ok=True)
