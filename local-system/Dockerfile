FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
ENV KRISHISETU_DATA_DIR=/data
EXPOSE 8000
CMD ["uvicorn", "fastapi_service:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1", "--timeout-keep-alive", "5", "--no-access-log"]