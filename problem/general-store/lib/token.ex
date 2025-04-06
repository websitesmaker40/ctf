defmodule GeneralStore.Token do
  use Joken.Config, default_signer: nil

  add_hook Joken.Hooks.RequiredClaims, [:iss, :aud]

  @impl true
  def token_config do
    default_claims(skip: [:iss, :aud, :exp])
    |> add_claim("iss", fn -> "general-store" end, &(&1 == "charter-authority"))
    |> add_claim("aud", fn -> "charter-authority" end, &(&1 == "general-store"))
  end
end
