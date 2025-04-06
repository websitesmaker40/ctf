defmodule Router do
  use Plug.Router
  alias GeneralStore.Items

  plug Plug.Parsers, parsers: [:urlencoded], pass: ["application/x-www-form-urlencoded"]
  plug :fetch_cookies
  plug :match
  plug :dispatch

  plug Plug.Static,
    at: "/",
    from: :general_store

  defp render(conn, template, assigns \\ []) do
    path = Path.join(["templates", template])
    content = EEx.eval_file(path, assigns: assigns)
    send_resp(conn, 200, content)
  end

  def run do
    Bandit.start_link(plug: Router, port: 80)
  end

  defdelegate getFoodItems, to: Items, as: :get_food_items
  defdelegate getEquipmentItems, to: Items, as: :get_equipment_items
  defdelegate getConsumableItems, to: Items, as: :get_consumable_items

  def getPrice(item) do
    (getFoodItems() ++ getEquipmentItems() ++ getConsumableItems())[item][:price]
  end

  get "/enter" do
    jwt = conn.query_params["jwt"]

    if jwt do
      case GeneralStore.Token.verify_and_validate(jwt, SignerAgent.get()) do
        {:ok, claims} ->
          conn
          |> put_resp_cookie("auth_token", jwt, http_only: true)
          |> render("index.html", [
            claims: claims,
            jwt: jwt,
            foodItems: getFoodItems(),
            equipmentItems: getEquipmentItems(),
            consumableItems: getConsumableItems()
          ])
        {:error, _reason} ->
          send_resp(conn, 400, "Invalid JWT")
      end
    else
      send_resp(conn, 400, "Missing JWT")
    end
  end

  post "/" do
    jwt = conn.cookies["auth_token"]

    if jwt do
      case GeneralStore.Token.verify_and_validate(jwt, SignerAgent.get()) do
        {:ok, claims} ->
          claims = Map.drop(claims, ["exp", "iat", "nbf", "aud", "iss"])

          items = conn.body_params
          all_items = getFoodItems() ++ getEquipmentItems() ++ getConsumableItems()

          order = %{}

          {total_cost, order} = Enum.reduce(items, {0, order}, fn {item_name, quantity}, {acc_cost, acc_order} ->
            case Enum.find(all_items, &(&1.name == item_name)) do
              nil -> {acc_cost, Map.put(acc_order, item_name, quantity)}
              item ->
                quantity = String.to_integer(quantity)
                {acc_cost + (item.price * quantity), Map.put(acc_order, item_name, quantity)}
            end
          end)

          new_token_amount = claims["tokens"] - total_cost

          if new_token_amount >= 0 do
            new_claims = order
            |> Map.merge(claims)
            |> Map.put("tokens", new_token_amount)

            {:ok, new_jwt, _} = GeneralStore.Token.generate_and_sign(new_claims, SignerAgent.get())

            conn
            |> put_resp_header("location", "http://charterauthority." <> System.get_env("HOST") <> "/callback?service=general-store&token=" <> new_jwt)
            |> send_resp(302, "")
          else
            send_resp(conn, 400, "Insufficient tokens")
          end

        {:error, _reason} ->
          send_resp(conn, 400, "Invalid JWT")
      end
    else
      send_resp(conn, 400, "Missing JWT")
    end
  end

  match _ do
    send_resp(conn, 404, "Not found")
  end
end

defmodule SignerAgent do
  use Agent

  def start_link do
    {:ok, secret} = File.read("/run/secrets/jwt_secret")
    signer = Joken.Signer.create("HS256", secret)
    Agent.start_link(fn -> signer end, name: __MODULE__)
  end

  def get do
    Agent.get(__MODULE__, fn state -> state end)
  end
end

defmodule App do
  use Application

  def start(_type, _args) do
    SignerAgent.start_link()
    Router.run()
  end
end
