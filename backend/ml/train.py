"""Trains Random Forest and XGBoost regressors on ml/dataset.csv and exports them as
plain JSON trees (ml/models.json) that Node evaluates without Python. Metrics go to ml/metrics.json.

The target is the rule-based readiness score, because the database has no real placement
outcomes yet. These metrics measure agreement with that score, NOT placement accuracy.

Run from backend/: ml/.venv/Scripts/python ml/train.py
"""
import json
from pathlib import Path

import numpy as np
import xgboost as xgb
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, r2_score
from sklearn.model_selection import train_test_split

HERE = Path(__file__).parent
SEED = 42
BANDS = [(86, "Highly Placement Ready"), (71, "Placement Ready"), (51, "Developing"), (31, "Needs Improvement"), (0, "Beginner")]

names = (HERE / "dataset.csv").read_text().splitlines()[0].split(",")
data = np.loadtxt(HERE / "dataset.csv", delimiter=",", skiprows=1)
features, target = names[:-1], data[:, -1]
X_train, X_test, y_train, y_test = train_test_split(data[:, :-1], target, test_size=0.2, random_state=SEED)

rf = RandomForestRegressor(n_estimators=100, max_depth=10, min_samples_leaf=2, random_state=SEED, n_jobs=-1).fit(X_train, y_train)
xg = xgb.XGBRegressor(n_estimators=200, max_depth=4, learning_rate=0.1, subsample=0.9, colsample_bytree=0.9, random_state=SEED).fit(X_train, y_train)


def export_rf(tree):
    t = tree.tree_
    return {"f": t.feature.tolist(), "t": t.threshold.tolist(), "l": t.children_left.tolist(), "r": t.children_right.tolist(), "v": t.value[:, 0, 0].tolist()}


def export_xgb(root):
    """Flattens one nested XGBoost JSON tree into the same arrays. Leaves have f = -2, like sklearn."""
    out = {"f": [], "t": [], "l": [], "r": [], "v": []}

    def walk(node):
        i = len(out["f"])
        for key in out:
            out[key].append(-1)
        if "leaf" in node:
            out["f"][i], out["v"][i] = -2, node["leaf"]
            return i
        by_id = {c["nodeid"]: c for c in node["children"]}
        out["f"][i] = int(node["split"][1:])  # trained on arrays, so splits are named f0, f1, ...
        out["t"][i] = node["split_condition"]
        out["l"][i] = walk(by_id[node["yes"]])
        out["r"][i] = walk(by_id[node["no"]])
        return i

    walk(root)
    return out


def raw_sum(trees, row, inclusive):
    total = 0.0
    for t in trees:
        i = 0
        while t["f"][i] != -2:
            value, limit = row[t["f"][i]], t["t"][i]
            i = t["l"][i] if (value <= limit if inclusive else value < limit) else t["r"][i]
        total += t["v"][i]
    return total


rf_trees = [export_rf(e) for e in rf.estimators_]
xg_trees = [export_xgb(json.loads(d)) for d in xg.get_booster().get_dump(dump_format="json")]
# XGBoost adds a constant to the leaf sum; recover it from the model itself rather than its version-specific config.
xg_base = float(xg.predict(X_train[:1])[0]) - raw_sum(xg_trees, X_train[0], False)

samples = X_test[:25]
models = {
    "features": features,
    "randomForest": {"trees": rf_trees},
    "xgboost": {"trees": xg_trees, "base": xg_base},
    # Expected outputs: scripts/selfcheckMlModels.js proves the Node evaluator reproduces Python exactly.
    "samples": {"X": samples.tolist(), "randomForest": rf.predict(samples).tolist(), "xgboost": xg.predict(samples).tolist()},
}
(HERE / "models.json").write_text(json.dumps(models, separators=(",", ":")))


def band(score):
    return next(label for low, label in BANDS if round(float(score)) >= low)


def report(pred):
    return {
        "maePoints": round(mean_absolute_error(y_test, pred), 2),
        "r2": round(r2_score(y_test, pred), 3),
        "categoryAgreement": round(float(np.mean([band(a) == band(b) for a, b in zip(y_test, pred)])), 3),
    }


rf_pred, xg_pred = rf.predict(X_test), xg.predict(X_test)
metrics = {
    "target": "rule-based readiness score (no real placement outcomes available)",
    "rows": {"train": len(X_train), "test": len(X_test)},
    "randomForest": report(rf_pred),
    "xgboost": report(xg_pred),
    "ensemble": report((rf_pred + xg_pred) / 2),
    "importance": {
        "randomForest": dict(sorted(zip(features, rf.feature_importances_.round(3).tolist()), key=lambda kv: -kv[1])),
        "xgboost": dict(sorted(zip(features, xg.feature_importances_.round(3).tolist()), key=lambda kv: -kv[1])),
    },
}
(HERE / "metrics.json").write_text(json.dumps(metrics, indent=2))
print(json.dumps(metrics, indent=2))
