from flask import Flask, request, render_template, redirect
from jose import jwt
import os

exchange_rate = 20
domain = os.getenv("HOST")

app = Flask(__name__, template_folder="templates")

with open("/run/secrets/jwt_secret", "r") as f:
	jwt_secret = f.read().strip()

@app.route("/enter", methods=["GET"])
def enter():
	token = request.args.get("jwt")

	if token is None:
		return render_template("error.html", message="No JWT provided"), 400

	try:
		payload = jwt.decode(token, jwt_secret, algorithms=["HS256"], issuer="charter-authority", audience="bank")
	except:
		return render_template("error.html", message="Invalid JWT"), 400

	return render_template("bank.html", token=token, payload=payload, rate=exchange_rate)

@app.route("/submit", methods=["POST"])
def submit():
	token = request.form.get("token")
	amount = request.form.get("amount")

	if token is None:
		return render_template("error.html", message="No JWT provided"), 400

	if amount is None:
		return render_template("error.html", message="No amount provided"), 400

	try:
		payload = jwt.decode(token, jwt_secret, algorithms=["HS256"], issuer="charter-authority", audience="bank")
	except:
		return render_template("error.html", message="Invalid JWT"), 400

	try:
		amount = int(amount)
	except:
		return render_template("error.html", message="Invalid amount"), 400

	if amount < 0:
		return render_template("error.html", message="Amount must be positive"), 400

	if amount > payload["tokens"]:
		return render_template("error.html", message="Not enough tokens"), 400

	payload["tokens"] -= amount
	if "gold" not in payload:
		payload["gold"] = 0
	payload["gold"] += amount / exchange_rate
	payload["iss"] = "bank"
	payload["aud"] = "charter-authority"

	new_token = jwt.encode(payload, jwt_secret, algorithm="HS256")
	return redirect(f"http://charterauthority.{domain}/callback?service=bank&token={new_token}")
