"""Independent evaluation of the shipped model setup. Does not modify models.json.
Same data, hyperparameters and 80/20 split as train.py, plus overfitting, duplicate-leakage and baseline checks.
Writes ml/evaluation.json. Run from backend/: ml/.venv/Scripts/python ml/evaluate.py
"""
import json
from pathlib import Path

import numpy as np
import xgboost as xgb
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor
from sklearn.linear_model import LinearRegression
from sklearn.metrics import accuracy_score, f1_score, mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import GroupKFold, KFold, train_test_split

HERE = Path(__file__).parent
SEED = 42
LABELS = ["Beginner", "Needs Improvement", "Developing", "Placement Ready", "Highly Placement Ready"]

names = (HERE / "dataset.csv").read_text().splitlines()[0].split(",")
data = np.loadtxt(HERE / "dataset.csv", delimiter=",", skiprows=1)
X, y = data[:, :-1], data[:, -1]


def rf():
    return RandomForestRegressor(n_estimators=100, max_depth=10, min_samples_leaf=2, random_state=SEED, n_jobs=-1)


def xg():
    return xgb.XGBRegressor(n_estimators=200, max_depth=4, learning_rate=0.1, subsample=0.9, colsample_bytree=0.9, random_state=SEED)


def band(score):
    s = round(float(score))
    return LABELS[0 if s <= 30 else 1 if s <= 50 else 2 if s <= 70 else 3 if s <= 85 else 4]


def scores(truth, pred):
    mse = mean_squared_error(truth, pred)
    a, b = [band(v) for v in truth], [band(v) for v in pred]
    return {
        "MAE": round(mean_absolute_error(truth, pred), 3), "MSE": round(mse, 3), "RMSE": round(float(np.sqrt(mse)), 3), "R2": round(r2_score(truth, pred), 4),
        "categoryAccuracy": round(accuracy_score(a, b), 4), "categoryMacroF1": round(f1_score(a, b, average="macro", zero_division=0), 4),
    }


def cv(make, splitter, groups=None):
    fold = [scores(y[te], make().fit(X[tr], y[tr]).predict(X[te])) for tr, te in splitter.split(X, y, groups)]
    return {k: {"mean": round(float(np.mean([f[k] for f in fold])), 4), "std": round(float(np.std([f[k] for f in fold])), 4)} for k in fold[0]}


X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.2, random_state=SEED)
models = {"randomForest": rf, "xgboost": xg}
holdout = {}
train_scores = {}
preds = {}
for name, make in models.items():
    m = make().fit(X_tr, y_tr)
    preds[name] = m.predict(X_te)
    holdout[name] = scores(y_te, preds[name])
    train_scores[name] = scores(y_tr, m.predict(X_tr))
holdout["ensemble"] = scores(y_te, (preds["randomForest"] + preds["xgboost"]) / 2)
holdout["baselineMean"] = scores(y_te, DummyRegressor().fit(X_tr, y_tr).predict(X_te))
holdout["baselineLinear"] = scores(y_te, LinearRegression().fit(X_tr, y_tr).predict(X_te))

# Identical feature rows must not sit on both sides of a split, so group by row content.
_, group_ids = np.unique(X, axis=0, return_inverse=True)
group_ids = group_ids.ravel()
train_rows = {tuple(r) for r in X_tr}
unique_y_per_row = {}
for row, target in zip(map(tuple, X), y):
    unique_y_per_row.setdefault(row, set()).add(target)

report = {
    "dataset": {
        "file": "ml/dataset.csv", "rows": len(X), "features": names[:-1], "target": names[-1],
        "missingValues": int(np.isnan(data).sum()),
        "duplicateFeatureRows": int(len(X) - len(np.unique(X, axis=0))),
        "testRowsAlsoInTrain": int(sum(tuple(r) in train_rows for r in X_te)),
        "featureRowsWithConflictingTargets": sum(len(v) > 1 for v in unique_y_per_row.values()),
        "targetMean": round(float(y.mean()), 2), "targetStd": round(float(y.std()), 2), "targetMin": float(y.min()), "targetMax": float(y.max()),
        "categoryCounts": {label: sum(band(v) == label for v in y) for label in LABELS},
        "testCategoryCounts": {label: sum(band(v) == label for v in y_te) for label in LABELS},
    },
    "split": {"train": len(X_tr), "test": len(X_te), "randomState": SEED},
    "holdout": holdout,
    "train": train_scores,
    "fiveFoldCV": {n: cv(m, KFold(5, shuffle=True, random_state=SEED)) for n, m in models.items()},
    "fiveFoldGroupedCV_noDuplicateLeakage": {n: cv(m, GroupKFold(5), group_ids) for n, m in models.items()},
}
(HERE / "evaluation.json").write_text(json.dumps(report, indent=2))
print(json.dumps(report, indent=1))
