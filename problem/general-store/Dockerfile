FROM elixir:1.18.0 AS build

WORKDIR /app
COPY mix.exs mix.lock ./
RUN mix deps.get
COPY . .
RUN MIX_ENV=prod mix release
CMD ["_build/prod/rel/general_store/bin/general_store", "start"]
