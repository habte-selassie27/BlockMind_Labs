FROM python:3.12-slim
WORKDIR /app
COPY apps/memory-service/pyproject.toml ./
RUN pip install --no-cache-dir .
COPY apps/memory-service/src ./src
EXPOSE 8005
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8005"]
