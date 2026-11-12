"""Binary increase versus decrease evaluation from out-of-sample price forecasts."""
import numpy as np
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score

def direction_metrics(actual, predicted, current):
    a, p, c = (np.asarray(v, dtype=float) for v in (actual, predicted, current))
    if a.shape != p.shape or a.shape != c.shape:
        raise ValueError('Predictions and origin prices must align')
    finite = np.isfinite(a) & np.isfinite(p) & np.isfinite(c)
    keep = finite & (a != c)
    y = (a[keep] > c[keep]).astype(int)
    scores = p[keep] - c[keep]
    labels = (scores > 0).astype(int)
    result = {'n': int(keep.sum()), 'increase': int(y.sum()), 'decrease': int(len(y)-y.sum()),
              'unchanged_excluded': int((finite & (a == c)).sum()),
              'missing_excluded': int((~finite).sum()), 'predicted_unchanged': int((scores == 0).sum()),
              'Accuracy': None, 'Precision': None, 'Recall': None, 'F1': None, 'ROC_AUC': None}
    if not len(y):
        return result
    result['Accuracy'] = float(accuracy_score(y, labels))
    if labels.sum():
        result['Precision'] = float(precision_score(y, labels, zero_division=0))
    if y.sum():
        result['Recall'] = float(recall_score(y, labels, zero_division=0))
    if y.sum() + labels.sum():
        result['F1'] = float(f1_score(y, labels, zero_division=0))
    if len(np.unique(y)) == 2:
        result['ROC_AUC'] = float(roc_auc_score(y, scores))
    return result