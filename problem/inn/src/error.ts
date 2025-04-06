export class SafeError extends Error {
	public readonly status: number;

	constructor(status: number, message: string) {
		super(message);
		this.status = status;
		this.name = "SafeError";
	}
}
