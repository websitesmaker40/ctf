from flask import Flask, request, render_template
import jwt
import random
from math import floor

app = Flask(__name__, template_folder="templates")

with open("/run/secrets/jwt_secret", "r") as f:
	jwt_secret = f.read().strip()

with open("/run/secrets/flag", "r") as f:
	flag = f.read().strip()

def butcher_animal(animal):
	food_amount = 0
	if animal["type"] == "bison":
		food_amount = 20
	elif animal["type"] == "ox":
		food_amount = 10
	elif animal["type"] == "horse":
		food_amount = 8
	elif animal["type"] == "mule":
		food_amount = 6
	elif animal["type"] == "donkey":
		food_amount = 5
	else:
		food_amount = 3

	return food_amount, f"You butchered {animal['name']} for food (+{food_amount} units)"

@app.route("/go", methods=["GET"])
def go():
	token = request.args.get("jwt")

	if token is None:
		return render_template("error.html", message="No JWT provided"), 400

	try:
		payload = jwt.decode(token, jwt_secret, algorithms=["HS256"], issuer="charter-authority", audience="trailhead")
	except:
		return render_template("error.html", message="Invalid JWT"), 400

	distance = 0
	target_distance = 2400
	dysentery_days = 0
	day = 1
	journey_log = []

	supplies = payload["supplies"]
	food = sum(supplies["food"].get(item, 0) for item in [
		"bacon", "beans", "candy", "coffee", "cornmeal", "flour",
		"fruit", "hardtack", "lard", "molasses", "salt", "sugar"
	])

	morale_items = {
		"coffee": supplies["food"].get("coffee", 0),
		"candy": supplies["food"].get("candy", 0),
		"tobacco": supplies["consumables"].get("tobacco", 0)
	}

	while distance < target_distance:
		daily_events = []

		# Add sheriff check at the start of the journey
		if day == 1 and random.random() < 0.1:
			if payload["protected"]:
				journey_log.append(f"Day {day}: The sheriff stopped your wagon at the trailhead. He found evidence that you've been working with the bandits for 'protection'. You've been arrested for collusion with outlaws.")
				return render_template("dead.html", title="You were arrested", log=journey_log)
			else:
				daily_events.append("The sheriff stopped your wagon for inspection, but found nothing suspicious.")

		weather_modifier = random.uniform(0.6, 1.0)
		weather_conditions = ["clear", "cloudy", "rainy", "stormy"]
		weather = weather_conditions[min(floor(((1-weather_modifier) * 6)), 3)]
		daily_events.append(f"Weather: {weather}")

		if payload.get("animals"):
			dead_animals = []
			for i, animal in enumerate(payload["animals"]):
				if "conditions" in animal:
					recovered_conditions = []

					for condition in animal["conditions"]:
						if condition == "snakebite":
							if supplies["consumables"].get("medicine", 0) > 0:
								supplies["consumables"]["medicine"] -= 1
								daily_events.append(f"{animal['name']} was treated for a snakebite")
								recovered_conditions.append(condition)
							elif random.random() < 0.2:
								daily_events.append(f"{animal['name']} succumbed to a venomous snakebite")
								dead_animals.append(i)
								food_amount, butcher_message = butcher_animal(animal)
								food += food_amount
								daily_events.append(butcher_message)
								break
							else:
								if random.random() < 0.15:
									recovered_conditions.append(condition)
									daily_events.append(f"{animal['name']} has recovered from the snakebite")
								else:
									daily_events.append(f"{animal['name']} is suffering from a snakebite")
						elif condition == "broken leg":
							if random.random() < 0.05:
								recovered_conditions.append(condition)
								daily_events.append(f"{animal['name']}'s broken leg has healed")
							else:
								animal["health"] -= 0.1
								animal["speed"] = max(0.1, animal["speed"] * 0.5)
								daily_events.append(f"{animal['name']} has a broken leg (slower travel)")
						elif condition == "dysentery":
							if random.random() < 0.1:
								recovered_conditions.append(condition)
								daily_events.append(f"{animal['name']} has recovered from dysentery")
							else:
								animal["health"] -= 0.07
								daily_events.append(f"{animal['name']} has dysentery")
						elif condition == "exhaustion":
							if random.random() < 0.25:
								recovered_conditions.append(condition)
								daily_events.append(f"{animal['name']} is no longer exhausted")
							else:
								animal["health"] -= 0.03
								animal["speed"] = max(0.2, animal["speed"] * 0.7)
								daily_events.append(f"{animal['name']} is exhausted (slower travel)")
						elif condition == "fever":
							if random.random() < 0.15:
								recovered_conditions.append(condition)
								daily_events.append(f"{animal['name']}'s fever has broken")
							else:
								animal["health"] -= 0.06
								daily_events.append(f"{animal['name']} has a fever")
						elif condition == "colic":
							if random.random() < 0.2:
								recovered_conditions.append(condition)
								daily_events.append(f"{animal['name']}'s colic has subsided")
							else:
								animal["health"] -= 0.08
								daily_events.append(f"{animal['name']} has colic")
						elif condition == "infected wound":
							if random.random() < 0.12:
								recovered_conditions.append(condition)
								daily_events.append(f"{animal['name']}'s wound has healed")
							else:
								animal["health"] -= 0.09
								daily_events.append(f"{animal['name']} has an infected wound")
						elif condition == "dehydration":
							if random.random() < 0.3:
								recovered_conditions.append(condition)
								daily_events.append(f"{animal['name']} is no longer dehydrated")
							else:
								animal["health"] -= 0.07
								animal["speed"] = max(0.3, animal["speed"] * 0.8)
								daily_events.append(f"{animal['name']} is dehydrated (slower travel)")
						elif condition == "malnutrition":
							if random.random() < 0.1:
								recovered_conditions.append(condition)
								daily_events.append(f"{animal['name']} is no longer malnourished")
							else:
								animal["health"] -= 0.05
								animal["speed"] = max(0.4, animal["speed"] * 0.8)
								daily_events.append(f"{animal['name']} is malnourished (slower travel)")
						elif condition == "frostbite":
							if random.random() < 0.08:
								recovered_conditions.append(condition)
								daily_events.append(f"{animal['name']} has recovered from frostbite")
							else:
								animal["health"] -= 0.06
								daily_events.append(f"{animal['name']} has frostbite")
						elif condition == "heatstroke":
							if random.random() < 0.18:
								recovered_conditions.append(condition)
								daily_events.append(f"{animal['name']} has recovered from heatstroke")
							else:
								animal["health"] -= 0.08
								animal["speed"] = max(0.3, animal["speed"] * 0.7)
								daily_events.append(f"{animal['name']} has heatstroke (slower travel)")
						elif condition == "lameness":
							if random.random() < 0.15:
								recovered_conditions.append(condition)
								daily_events.append(f"{animal['name']} is no longer lame")
							else:
								animal["health"] -= 0.04
								animal["speed"] = max(0.5, animal["speed"] * 0.8)
								daily_events.append(f"{animal['name']} is lame (slower travel)")
						elif condition == "parasites":
							if random.random() < 0.12:
								recovered_conditions.append(condition)
								daily_events.append(f"{animal['name']} is free of parasites")
							else:
								animal["health"] -= 0.03
								daily_events.append(f"{animal['name']} has parasites")

					if i in dead_animals:
						continue

					for condition in recovered_conditions:
						animal["conditions"].remove(condition)

					if recovered_conditions:
						animal["health"] = min(1.0, animal["health"] + 0.05)

				animal["health"] = max(0.1, animal["health"] - random.random() * 0.01)

				if random.random() < 0.05:
					possible_conditions = ["snakebite", "broken leg", "dysentery", "exhaustion",
										  "fever", "colic", "infected wound", "dehydration",
										  "malnutrition", "frostbite", "heatstroke", "lameness", "parasites"]

					if weather == "rainy" or weather == "stormy":
						weather_conditions = ["fever", "infected wound"]
						condition = random.choice(weather_conditions + possible_conditions)
					elif weather_modifier < 0.7:
						temp_conditions = ["dehydration", "heatstroke", "frostbite"]
						condition = random.choice(temp_conditions + possible_conditions)
					else:
						condition = random.choice(possible_conditions)

					if "conditions" not in animal:
						animal["conditions"] = []

					if condition not in animal["conditions"]:
						animal["conditions"].append(condition)
						daily_events.append(f"{animal['name']} developed {condition}")

				if i not in dead_animals and animal["health"] < 0.2 and random.random() < 0.1:
					dead_animals.append(i)
					daily_events.append(f"{animal['name']} died")
					food_amount, butcher_message = butcher_animal(animal)
					food += food_amount
					daily_events.append(butcher_message)

			for idx in sorted(dead_animals, reverse=True):
				payload["animals"].pop(idx)

			if not payload["animals"]:
				daily_events.append("All your animals have died")
				if payload.get("wagon"):
					daily_events.append("You had to abandon your wagon")
					payload.pop("wagon")

		if payload.get("wagon") and payload.get("animals"):
			# Normal travel with wagon and animals
			base_speed = min(sum(animal["speed"] * animal["health"] for animal in payload["animals"]) / len(payload["animals"]), 18)

			wagon = payload["wagon"]
			wheel_health = (wagon["wheels"]["frontLeft"] + wagon["wheels"]["frontRight"] +
						  wagon["wheels"]["backLeft"] + wagon["wheels"]["backRight"]) / 4
			axle_health = (wagon["axles"]["front"] + wagon["axles"]["back"]) / 2
			wagon_health = min(wheel_health, axle_health, wagon["cover"])
			base_speed *= max(0.4, wagon_health)
			daily_events.append(f"Traveling by wagon (condition: {wagon_health:.2f})")

		elif payload.get("animals") and not payload.get("wagon"):
			# Riding animals without wagon
			base_speed = min(max(animal["speed"] * animal["health"] for animal in payload["animals"]) * 0.3, 6)
			daily_events.append("Traveling on horseback")
		elif payload.get("wagon"):
			# Pushing the wagon???
			base_speed = 0.1
			daily_events.append("Pushing the wagon without animals (very slow)")
		else:
			# Hoofin' it
			base_speed = 10
			daily_events.append("Traveling on foot")

		morale = 1.0
		for item, amount in morale_items.items():
			if amount > 0:
				morale += 0.1
				morale_items[item] = max(0, amount - random.random() * 0.2)
				daily_events.append(f"Used some {item} (morale boost)")

		if payload["dysentery"]:
			dysentery_days += 1
			if random.random() < (dysentery_days * 0.01):
				journey_log.append(f"Day {day}: You finally succumbed to dysentery after traveling {int(distance)} miles")
				return render_template("dead.html", title="You died", log=journey_log)
			daily_events.append("You struggled with dysentery")

		if random.random() < 0.05:  # 5% chance each day
			food_found = random.uniform(10, 50)
			food += food_found
			food_sources = ["wild berries", "a successful hunt", "abandoned supplies", "friendly travelers", "fishing"]
			food_source = random.choice(food_sources)
			daily_events.append(f"Found {food_found:.1f} units of food from {food_source}!")

		if not payload["protected"]:
			if random.random() < 0.1:
				daily_events.append("Bandits attacked!")
				if payload["supplies"]["consumables"].get("ammunition", 0) <= 0:
					journey_log.append(f"Day {day}: Bandits attacked and you had no ammunition to defend yourself after {int(distance)} miles")
					return render_template("dead.html", title="You died", log=journey_log)
				food_lost = random.uniform(1, 5)
				food = max(0, food - food_lost)
				daily_events.append(f"Lost {food_lost:.1f} units of food in the bandit attack")

		daily_food_need = 1
		if payload.get("animals"):
			daily_food_need += len(payload["animals"]) * 0.5
		food -= daily_food_need
		daily_events.append(f"Consumed {daily_food_need:.1f} units of food")

		if food <= 0:
			journey_log.append(f"Day {day}: Your party starved after traveling {int(distance)} miles")
			return render_template("dead.html", title="You died", log=journey_log)

		daily_distance = base_speed * morale * weather_modifier
		distance += daily_distance
		daily_events.append(f"Traveled {daily_distance:.1f} miles (total: {distance:.1f})")

		for category in ["equipment", "consumables"]:
			for item in payload["supplies"][category]:
				if random.random() < 0.01 and payload["supplies"][category][item] > 0:
					amount_used = random.random() * 0.2
					payload["supplies"][category][item] -= amount_used
					daily_events.append(f"Some {item} was used up ({amount_used:.2f} units)")

		journey_log.append(f"Day {day}: " + "; ".join(daily_events))
		day += 1

	journey_log.append(f"Day {day}: You successfully completed the journey of {int(distance)} miles!")
	return render_template("flag.html", flag=flag, log=journey_log)
