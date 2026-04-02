from license_client import activate, startup_guard


def run_business_app():
	print("Your purchased software is running...")


def main():
	print("1. Activate software")
	print("2. Start software")
	choice = input("Choose option (1/2): ").strip()

	if choice == "1":
		activation_key = input("Enter activation key: ").strip()
		try:
			state = activate(activation_key)
			print(f"Activation successful. Expires at: {state['expires_at']}")
		except Exception as exc:
			print(f"Activation failed: {exc}")
		return

	if choice == "2":
		guard = startup_guard()
		if not guard["allowed"]:
			print(f"Access blocked: {guard['reason']}")
			if guard.get("renew_url"):
				print(f"Renew here: {guard['renew_url']}")
			return

		run_business_app()
		return

	print("Invalid option")


if __name__ == "__main__":
	main()
