FROM python:3.12-slim
WORKDIR /app
COPY apps/intent-service/pyproject.toml ./
RUN pip install --no-cache-dir .
COPY apps/intent-service/src ./src
EXPOSE 8001
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8001"]
