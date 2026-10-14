FROM postgres:16-alpine
# Schema + seed run on a fresh data volume only.
COPY db/*.sql /docker-entrypoint-initdb.d/
