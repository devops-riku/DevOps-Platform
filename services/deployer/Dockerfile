FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN go build -o deployer .

FROM alpine:latest

WORKDIR /app

# Install Docker CLI and git for repo syncing
RUN apk add --no-cache docker-cli docker-compose git

COPY --from=builder /app/deployer .

# Use system env if .env is missing
CMD ["./deployer"]
