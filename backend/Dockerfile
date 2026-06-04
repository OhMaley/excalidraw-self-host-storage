FROM rust:1.96.0-alpine3.23 AS builder
RUN apk add --no-cache musl-dev
WORKDIR /app

# Cache compiled dependencies before copying source.
# The dummy main.rs compiles all deps without triggering sqlx query macros.
COPY Cargo.toml Cargo.lock ./
COPY .sqlx .sqlx
RUN mkdir src && echo 'fn main() {}' > src/main.rs
ENV SQLX_OFFLINE=true
RUN cargo build --release && \
    rm -f target/release/deps/excalidraw_storage_backend*

# Build the real application (only src/ is recompiled).
COPY src src
RUN cargo build --release

FROM alpine:3.23
RUN apk add --no-cache ca-certificates && \
    adduser -D -u 1001 appuser
WORKDIR /app
COPY --from=builder --chown=appuser:appuser \
    /app/target/release/excalidraw-storage-backend .
USER appuser
EXPOSE 3000
CMD ["./excalidraw-storage-backend"]
