import json,joblib,hashlib
from pathlib import Path
from .acquisition import digest

def save_model(model,path):
    path=Path(path);joblib.dump(model,path,compress=3);return {'file':path.name,'sha256':digest(path),'bytes':path.stat().st_size}
def load_model(path,checksum):
    if digest(path)!=checksum:raise ValueError('Model checksum mismatch')
    # Only locally registered artifacts; never load user-provided pickle/joblib.
    return joblib.load(path)
def write_json(path,data):Path(path).write_text(json.dumps(data,indent=2,allow_nan=False,default=str))
