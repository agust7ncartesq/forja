# syntax=docker/dockerfile:1
# Forja servida con nginx sin privilegios (usuario 101, puerto 8080).
# Una sola etapa: la app es estática y no tiene paso de compilación.
# nginx 1.30.x es la rama estable; fijada por digest para builds reproducibles.
FROM nginxinc/nginx-unprivileged:1.30.6-alpine@sha256:f5116ed4606f3eb015dd4a8e28cb9b351476dc0ad4bc6e9f93b19cec130cdf03

LABEL org.opencontainers.image.title="forja" \
      org.opencontainers.image.description="Forja: entrenador personal (PWA estática)" \
      org.opencontainers.image.source="https://github.com/agust7ncartesq/forja"

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY deploy/security-headers.conf /etc/nginx/snippets/security-headers.conf

# Solo los archivos públicos de la app.
COPY index.html engine.js coach.js sw.js manifest.webmanifest icon.svg /usr/share/nginx/html/
COPY assets /usr/share/nginx/html/assets
COPY vendor /usr/share/nginx/html/vendor

USER 101
EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD ["wget", "-q", "--spider", "http://127.0.0.1:8080/"]
