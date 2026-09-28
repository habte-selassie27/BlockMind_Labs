FROM python:3.12-slim
WORKDIR /app
COPY apps/analytics-service/pyproject.toml ./
COPY apps/analytics-service/src ./src
RUN pip install --no-cache-dir .
EXPOSE 8006
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8006"]
