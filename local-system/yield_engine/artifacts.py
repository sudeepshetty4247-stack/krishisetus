import json,joblib,hashlib,io
from pathlib import Path
from .acquisition import digest

def save_model(model,path):
    path=Path(path);joblib.dump(model,path,compress=3);metadata={'file':path.name,'sha256':digest(path),'bytes':path.stat().st_size}
    if path.stat().st_size>9_000_000:
        parts=[]
        with path.open('rb') as f:
            i=0
            while block:=f.read(9_000_000):
                part=path.with_name(path.name+f'.part-{i:02}');part.write_bytes(block);parts.append({'file':part.name,'sha256':digest(part)});i+=1
        manifest=path.with_suffix('.artifact.json');write_json(manifest,{'sha256':metadata['sha256'],'parts':parts});path.unlink()
        metadata={'file':manifest.name,'sha256':digest(manifest),'bytes':metadata['bytes']}
    return metadata
def load_model(path,checksum):
    if digest(path)!=checksum:raise ValueError('Model checksum mismatch')
    path=Path(path)
    if path.name.endswith('.artifact.json'):
        manifest=json.loads(path.read_text());blocks=[]
        for part in manifest['parts']:
            name=Path(part['file'])
            if name.name!=str(name):raise ValueError('Invalid artifact part path')
            file=path.parent/name
            if digest(file)!=part['sha256']:raise ValueError('Artifact part checksum mismatch')
            blocks.append(file.read_bytes())
        blob=b''.join(blocks)
        if hashlib.sha256(blob).hexdigest()!=manifest['sha256']:raise ValueError('Artifact checksum mismatch')
        return joblib.load(io.BytesIO(blob))
    # Only locally registered artifacts; never load user-provided pickle/joblib.
    return joblib.load(path)
def write_json(path,data):Path(path).write_text(json.dumps(data,indent=2,allow_nan=False,default=str))
