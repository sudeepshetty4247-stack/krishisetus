import os
from pathlib import Path
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / '.env')
DATA_DIR = Path(os.environ.get('KRISHISETU_DATA_DIR', str(ROOT / 'runtime'))).resolve()
RESOURCE = '9ef84268-d588-465a-a308-a864a43d0070'
DATA_GOV_URL = f'https://api.data.gov.in/resource/{RESOURCE}'
TIMEOUT = int(os.environ.get('REQUEST_TIMEOUT_SECONDS', '30'))
PAUSE = max(1.0, float(os.environ.get('REQUEST_PAUSE_SECONDS', '2')))
PAGE_SIZE = min(1000, max(1, int(os.environ.get('BATCH_PAGE_SIZE', '100'))))
MAX_PAGES = min(100, max(1, int(os.environ.get('MAX_PAGES_PER_RUN', '10'))))