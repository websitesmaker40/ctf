FROM golang:1.23.4 AS build

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN go build -o /app/livery

FROM debian:bookworm-slim
WORKDIR /app
COPY --from=build /app/livery /app/livery
CMD ["/app/livery"]
