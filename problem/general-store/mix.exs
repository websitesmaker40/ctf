defmodule GeneralStore.MixProject do
  use Mix.Project

  def project do
    [
      app: :general_store,
      version: "0.1.0",
      elixir: "~> 1.14",
      start_permanent: Mix.env() == :prod,
      deps: deps()
    ]
  end

  def application do
    [
      mod: {App, []},
      extra_applications: [:logger]
    ]
  end

  defp deps do
    [
      {:joken, "~> 2.5"},
      {:jason, "~> 1.2.2"},
      {:bandit, "~> 0.5"}
    ]
  end
end
