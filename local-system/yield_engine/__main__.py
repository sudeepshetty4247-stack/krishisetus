import argparse
from .training import train
p=argparse.ArgumentParser();p.add_argument('--dataset',required=True);p.add_argument('--output',required=True)
a=p.parse_args();train(a.dataset,a.output)
