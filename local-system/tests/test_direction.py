import unittest
from ml_engine.direction import direction_metrics

class DirectionTests(unittest.TestCase):
    def test_continuous_scores_and_class_balance(self):
        m = direction_metrics([12, 8, 14, 6], [11, 9, 13, 12], [10]*4)
        self.assertEqual(m['n'], 4)
        self.assertEqual(m['increase'], 2)
        self.assertEqual(m['Accuracy'], .75)
        self.assertAlmostEqual(m['Precision'], 2/3)
        self.assertEqual(m['Recall'], 1)
        self.assertEqual(m['F1'], .8)
        self.assertEqual(m['ROC_AUC'], .75)

    def test_unchanged_excluded_and_zero_prediction_is_not_increase(self):
        m = direction_metrics([10, 12, 8], [10, 10, 10], [10]*3)
        self.assertEqual(m['unchanged_excluded'], 1)
        self.assertEqual(m['n'], 2)
        self.assertEqual(m['Accuracy'], .5)
        self.assertIsNone(m['Precision'])
        self.assertEqual(m['F1'], 0)
        self.assertEqual(m['ROC_AUC'], .5)

    def test_missing_and_single_class_are_honest(self):
        m = direction_metrics([12, float('nan')], [13, 9], [10, 10])
        self.assertEqual(m['missing_excluded'], 1)
        self.assertIsNone(m['ROC_AUC'])
        self.assertRaises(ValueError, direction_metrics, [1], [2, 3], [1])