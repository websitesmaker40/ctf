FROM ruby:3.4.8-bookworm

ENV APP_ENV production
ENV RACK_ENV production
ENV SINATRA_ENV production
WORKDIR /app
COPY Gemfile Gemfile.lock ./
RUN bundle config set --local without 'development test' && bundle install
COPY . .

CMD ["bundle", "exec", "rackup", "--host", "0.0.0.0", "-p", "80"]
