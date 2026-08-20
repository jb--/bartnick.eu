#!/usr/bin/env python3
"""Flip 7 (vereinfacht): Monte-Carlo-Simulation + exakte DP-Rechnung.

Deck: 1x "0", 1x "1", 2x "2", ... 12x "12"  -> 79 Zahlenkarten.
Regeln (simplifiziert): Karten einzeln ziehen. Doppelte Zahl = Bust = 0 Punkte.
Maximal 7 Karten. Optional: 7 verschiedene Karten = +15 Bonus ("Flip 7").
"""
import json, random, statistics, sys
from functools import lru_cache

COUNTS = {0: 1, **{v: v for v in range(1, 13)}}
TOTAL = sum(COUNTS.values())          # 79
VALUES = list(range(0, 13))
MAX_CARDS = 7


# ----------------------------------------------------------------- Monte Carlo
CUM = [0] * 13  # Hilfsarray, wird pro Zug neu aufgebaut


def play_threshold(rng, threshold, flip7_bonus=0):
    """Ziehe, solange Punktzahl < threshold. Gibt (score, busted, n_cards).

    Statt das 79er-Deck zu mischen, wird jede Karte direkt aus den Restzaehlern
    gezogen (mathematisch identisch, aber deutlich schneller).
    """
    left_counts = [1, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
    left = TOTAL
    seen = [False] * 13
    n = 0
    total = 0
    ri = rng.random
    while True:
        if n == MAX_CARDS:
            return total + flip7_bonus, False, n
        if total >= threshold:
            return total, False, n
        pick = int(ri() * left)
        acc = 0
        for v in range(13):
            acc += left_counts[v]
            if pick < acc:
                break
        left_counts[v] -= 1
        left -= 1
        if seen[v]:
            return 0, True, n + 1
        seen[v] = True
        n += 1
        total += v


def monte_carlo(threshold, n, seed, flip7_bonus=0):
    rng = random.Random(seed)
    scores, busts, flip7s = [], 0, 0
    for _ in range(n):
        s, busted, cards = play_threshold(rng, threshold, flip7_bonus)
        scores.append(s)
        busts += busted
        flip7s += (not busted and cards == MAX_CARDS)
    return {
        "threshold": threshold,
        "n": n,
        "mean": sum(scores) / n,
        "median": statistics.median(scores),
        "stdev": statistics.pstdev(scores),
        "bust_rate": busts / n,
        "flip7_rate": flip7s / n,
        "p_zero": scores.count(0) / n,
    }


# --------------------------------------------------------------- exakte Rechnung
# Zustand = Menge der bereits gezogenen Werte (jeder Wert hoechstens 1x, sonst Bust).
def transitions(state):
    """(wert, wahrscheinlichkeit, bust?) fuer den naechsten Zug."""
    left = TOTAL - len(state)
    out = []
    for v in VALUES:
        c = COUNTS[v]
        if v in state:
            if c - 1 > 0:
                out.append((v, (c - 1) / left, True))
        else:
            out.append((v, c / left, False))
    return out


def exact_threshold(threshold, flip7_bonus=0):
    """Exakter Erwartungswert + Bust-/Flip7-Wahrscheinlichkeit fuer 'stop bei >= threshold'."""
    memo = {}

    def rec(state):
        key = state
        if key in memo:
            return memo[key]
        s = sum(state)
        if len(state) == MAX_CARDS:
            res = (s + flip7_bonus, 0.0, 1.0)
        elif s >= threshold:
            res = (s, 0.0, 0.0)
        else:
            ev = bust = f7 = 0.0
            for v, p, is_bust in transitions(state):
                if is_bust:
                    bust += p
                else:
                    e2, b2, f2 = rec(state | frozenset([v]))
                    ev += p * e2
                    bust += p * b2
                    f7 += p * f2
            res = (ev, bust, f7)
        memo[key] = res
        return res

    ev, bust, f7 = rec(frozenset())
    return {"threshold": threshold, "ev": ev, "bust_rate": bust, "flip7_rate": f7}


def exact_ncards(k, flip7_bonus=0):
    """Strategie: genau k Karten ziehen (oder bis Bust)."""
    memo = {}

    def rec(state):
        if state in memo:
            return memo[state]
        if len(state) >= k or len(state) == MAX_CARDS:
            res = (sum(state) + (flip7_bonus if len(state) == MAX_CARDS else 0), 0.0)
        else:
            ev = bust = 0.0
            for v, p, is_bust in transitions(state):
                if is_bust:
                    bust += p
                else:
                    e2, b2 = rec(state | frozenset([v]))
                    ev += p * e2
                    bust += p * b2
            res = (ev, bust)
        memo[state] = res
        return res

    ev, bust = rec(frozenset())
    return {"k": k, "ev": ev, "bust_rate": bust}


def exact_optimal(flip7_bonus=0):
    """Optimale Politik: in jedem Zustand EV(ziehen) vs. sofort stoppen."""
    memo = {}
    policy = {}

    def rec(state):
        if state in memo:
            return memo[state]
        s = sum(state)
        if len(state) == MAX_CARDS:
            memo[state] = (s + flip7_bonus, 0.0)
            return memo[state]
        ev = bust = 0.0
        for v, p, is_bust in transitions(state):
            if is_bust:
                bust += p
            else:
                e2, b2 = rec(state | frozenset([v]))
                ev += p * e2
                bust += p * b2
        if ev >= s:
            policy[state] = "draw"
            res = (ev, bust)
        else:
            policy[state] = "stop"
            res = (float(s), 0.0)
        memo[state] = res
        return res

    ev, bust = rec(frozenset())
    return ev, bust, policy, memo


def bust_prob_next(state):
    left = TOTAL - len(state)
    return sum(COUNTS[v] - 1 for v in state) / left


def exact_bustrule(q, flip7_bonus=0):
    """Strategie: ziehen, solange P(Bust bei naechster Karte) <= q."""
    memo = {}

    def rec(state):
        if state in memo:
            return memo[state]
        s = sum(state)
        if len(state) == MAX_CARDS:
            res = (s + flip7_bonus, 0.0)
        elif bust_prob_next(state) > q:
            res = (float(s), 0.0)
        else:
            ev = bust = 0.0
            for v, p, is_bust in transitions(state):
                if is_bust:
                    bust += p
                else:
                    e2, b2 = rec(state | frozenset([v]))
                    ev += p * e2
                    bust += p * b2
            res = (ev, bust)
        memo[state] = res
        return res

    ev, bust = rec(frozenset())
    return {"q": q, "ev": ev, "bust_rate": bust}


# ------------------------------------------------------- Rauschen bei N Runden
def noisy_tournament(thresholds, n_rounds, n_experiments, seed, flip7_bonus=0):
    """Wie oft gewinnt welcher Threshold, wenn man je n_rounds Runden simuliert?"""
    rng = random.Random(seed)
    wins = {t: 0 for t in thresholds}
    for _ in range(n_experiments):
        best_t, best_m = None, -1.0
        for t in thresholds:
            tot = 0
            for _ in range(n_rounds):
                s, _, _ = play_threshold(rng, t, flip7_bonus)
                tot += s
            m = tot / n_rounds
            if m > best_m:
                best_m, best_t = m, t
        wins[best_t] += 1
    return {t: wins[t] / n_experiments for t in thresholds}


def main():
    out = {}
    THRESHOLDS = list(range(1, 61))

    for label, bonus in (("plain", 0), ("bonus15", 15)):
        rows = []
        for t in THRESHOLDS:
            ex = exact_threshold(t, bonus)
            mc = monte_carlo(t, 120_000, seed=1000 + t, flip7_bonus=bonus)
            rows.append({
                "t": t,
                "ev": round(ex["ev"], 4),
                "bust": round(ex["bust_rate"], 5),
                "flip7": round(ex["flip7_rate"], 5),
                "mc_mean": round(mc["mean"], 3),
                "mc_median": mc["median"],
                "mc_stdev": round(mc["stdev"], 3),
                "mc_pzero": round(mc["p_zero"], 4),
            })
        best = max(rows, key=lambda r: r["ev"])
        ev_opt, bust_opt, policy, _ = exact_optimal(bonus)
        out[label] = {
            "thresholds": rows,
            "best_threshold": best["t"],
            "best_ev": round(best["ev"], 4),
            "optimal_ev": round(ev_opt, 4),
            "optimal_bust": round(bust_opt, 5),
            "ncards": [{"k": k, **{kk: round(vv, 4) for kk, vv in exact_ncards(k, bonus).items() if kk != "k"}}
                       for k in range(0, 8)],
            "bustrule": [{"q": round(q, 3), **{kk: round(vv, 4) for kk, vv in exact_bustrule(q, bonus).items() if kk != "q"}}
                         for q in [i / 40 for i in range(0, 25)]],
        }
        # kleine Threshold-MC mit nur 1000 Runden (wie vom Nutzer gefragt)
        out[label]["mc1000"] = [
            {"t": t, "mean": round(monte_carlo(t, 1000, seed=7 * t + 3, flip7_bonus=bonus)["mean"], 2)}
            for t in THRESHOLDS
        ]

    # Rauschexperiment nur fuer die Basisvariante
    cand = list(range(14, 32, 2))
    out["noise"] = {
        "candidates": cand,
        "n1000": noisy_tournament(cand, 1_000, 300, seed=42),
        "n100": noisy_tournament(cand, 100, 300, seed=43),
        "n20000": noisy_tournament(cand, 20_000, 40, seed=44),
    }

    # Optimalpolitik: welche Stop-Grenze impliziert sie pro Kartenzahl?
    ev_opt, bust_opt, policy, memo = exact_optimal(0)
    per_n = {}
    for state, act in policy.items():
        n = len(state)
        per_n.setdefault(n, {"draw": [], "stop": []})[act].append(sum(state))
    out["policy"] = {
        str(n): {
            "max_draw_sum": max(d["draw"]) if d["draw"] else None,
            "min_stop_sum": min(d["stop"]) if d["stop"] else None,
        } for n, d in sorted(per_n.items())
    }
    out["deck"] = {"total": TOTAL, "counts": COUNTS}
    json.dump(out, open(sys.argv[1] if len(sys.argv) > 1 else "flip7_results.json", "w"), indent=1)
    print("best plain:", out["plain"]["best_threshold"], out["plain"]["best_ev"],
          "opt:", out["plain"]["optimal_ev"])
    print("best bonus:", out["bonus15"]["best_threshold"], out["bonus15"]["best_ev"],
          "opt:", out["bonus15"]["optimal_ev"])


if __name__ == "__main__" and not (len(sys.argv) > 2 and sys.argv[2] == "extras"):
    main()


# --------------------------------------------------------- Zusatzauswertungen
def exact_distribution(threshold, flip7_bonus=0):
    """Exakte Verteilung der Endpunktzahl fuer eine Threshold-Strategie."""
    dist = {}
    memo = {}

    def rec(state, prob):
        s = sum(state)
        if len(state) == MAX_CARDS:
            dist[s + flip7_bonus] = dist.get(s + flip7_bonus, 0.0) + prob
            return
        if s >= threshold:
            dist[s] = dist.get(s, 0.0) + prob
            return
        for v, p, is_bust in transitions(state):
            if is_bust:
                dist[0] = dist.get(0, 0.0) + prob * p
            else:
                rec(state | frozenset([v]), prob * p)

    rec(frozenset(), 1.0)
    return dist


def extras(path):
    data = json.load(open(path))
    rows = {r["t"]: r for r in data["plain"]["thresholds"]}
    best = data["plain"]["best_threshold"]

    # exakte Verteilungen fuer ausgewaehlte Thresholds
    data["distributions"] = {}
    for t in (12, 18, 23, 30):
        d = exact_distribution(t)
        data["distributions"][str(t)] = sorted(
            [[k, round(v, 6)] for k, v in d.items() if v > 1e-6])

    # Stichprobenumfang, um Nachbar-Thresholds sauber zu trennen
    import math
    need = []
    for t in range(18, 30):
        if t == best:
            continue
        delta = rows[best]["ev"] - rows[t]["ev"]
        var = rows[best]["mc_stdev"] ** 2 + rows[t]["mc_stdev"] ** 2
        n = math.ceil(var * (1.96 / delta) ** 2) if delta > 0 else None
        need.append({"t": t, "delta": round(delta, 4), "n_needed": n})
    data["sample_size"] = {"best": best, "rows": need}

    # Bust-Wahrscheinlichkeit der naechsten Karte, typische Haende
    hands = [[], [12], [12, 11], [12, 11, 10], [12, 11, 10, 9],
             [0, 1], [0, 1, 2], [0, 1, 2, 3], [5, 6, 7], [1, 2, 3, 4]]
    data["bust_next"] = [
        {"hand": h, "sum": sum(h), "p": round(bust_prob_next(frozenset(h)), 4)} for h in hands]
    json.dump(data, open(path, "w"), indent=1)
    print("extras written")


if __name__ == "__main__" and len(sys.argv) > 2 and sys.argv[2] == "extras":
    extras(sys.argv[1])
