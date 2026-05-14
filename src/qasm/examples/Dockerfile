FROM python:3.12-slim
RUN groupadd -r appuser && useradd -r -g appuser -u 10014 appuser
WORKDIR /app
COPY src/qasm/examples/ /app/
RUN chown -R appuser:appuser /app
ENV PYTHONUNBUFFERED=1
USER 10014
EXPOSE 8084
ENTRYPOINT ["python", "service/qasm_service.py"]
