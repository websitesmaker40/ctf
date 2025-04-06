require "sinatra"
require "erb"
require "jwt"
require "csv"

$jwt_secret = File.read("/run/secrets/jwt_secret").strip

def parse_jwt(jwt)
	if jwt.nil?
		return nil
	end
	data, _info = JWT.decode jwt, $jwt_secret, true, { algorithm: "HS256", iss: "charter-authority", aud: "wagon-repair" }
	data.delete("iss")
	data.delete("aud")
	data.delete("exp")
	return data
end

NEW_PRICES = CSV.read("new_prices.csv", headers: true).each_with_object({}) do |row, hash|
	hash[row["item"]] = row["price"]
end

REPAIR_PRICES = CSV.read("repair_prices.csv", headers: true).each_with_object({}) do |row, hash|
	hash[row["item"]] = row["price"]
end

get "/enter" do
	begin
		if params[:jwt].nil?
			return [400, "Missing JWT"]
		end

		payload = parse_jwt(params[:jwt])
		erb :index, locals: {
			token: params[:jwt],
			payload: payload,
			new_prices: NEW_PRICES,
			repair_prices: REPAIR_PRICES
		}
	rescue JWT::DecodeError => e
		puts e
		[400, "Invalid JWT"]
	rescue => e
		puts e
		[500, "Internal Server Error"]
	end
end

post "/submit" do
	begin
		payload = parse_jwt(params[:jwt])

		tokens = payload["tokens"].to_f
		total_cost = 0

		if params[:spares]
			params[:spares].each do |item_type, count|
				price = NEW_PRICES[item_type].to_f
				total_cost += count.to_f * price
				payload[item_type] = count
			end
		end

		if params[:wheels]
			params[:wheels].each do |wheel, action|
				next if action.empty?
				current_value = payload["wagon"]["wheels"][wheel].to_f

				if action == "repair"
					total_cost += REPAIR_PRICES["wheels"].to_f
					payload["wagon"]["wheels"][wheel] = current_value + ((1 - current_value) / 2)
				elsif action == "replace"
					total_cost += NEW_PRICES["wheels"].to_f
					payload["wagon"]["wheels"][wheel] = 1.0
				end
			end
		end

		if params[:axles]
			params[:axles].each do |axle, action|
				next if action.empty?
				current_value = payload["wagon"]["axles"][axle].to_f

				if action == "repair"
					total_cost += REPAIR_PRICES["axles"].to_f
					payload["wagon"]["axles"][axle] = current_value + ((1 - current_value) / 2)
				elsif action == "replace"
					total_cost += NEW_PRICES["axles"].to_f
					payload["wagon"]["axles"][axle] = 1.0
				end
			end
		end

		unless params[:cover].to_s.empty?
			current_value = payload["wagon"]["cover"].to_f
			if params[:cover] == "repair"
				total_cost += REPAIR_PRICES["covers"].to_f
				payload["wagon"]["cover"] = current_value + ((1 - current_value) / 2)
			elsif params[:cover] == "replace"
				total_cost += NEW_PRICES["covers"].to_f
				payload["wagon"]["cover"] = 1.0
			end
		end

		if total_cost > tokens
			return [400, "Insufficient tokens. Required: #{total_cost}, Available: #{tokens}"]
		end

		payload["tokens"] = tokens - total_cost

		payload[:iss] = "wagon-repair"
		payload[:aud] = "charter-authority"
		new_jwt = JWT.encode(payload, $jwt_secret, "HS256")

		redirect_url = "http://charterauthority.#{ENV['HOST']}/callback?service=wagon-repair&token=#{new_jwt}"
		[302, { "Location" => redirect_url }, ""]

	rescue JWT::DecodeError => e
		puts e
		[400, "Invalid JWT"]
	rescue => e
		puts e
		[500, "Internal Server Error"]
	end
end
