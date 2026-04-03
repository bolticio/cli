import chalk from "chalk";

// Error types for different scenarios
const ErrorType = {
	API_ERROR: "API_ERROR",
	NETWORK_ERROR: "NETWORK_ERROR",
	AUTH_ERROR: "AUTH_ERROR",
	VALIDATION_ERROR: "VALIDATION_ERROR",
	NOT_FOUND_ERROR: "NOT_FOUND_ERROR",
	CONFIG_ERROR: "CONFIG_ERROR",
	UNKNOWN_ERROR: "UNKNOWN_ERROR",
};

/**
 * Extract the most meaningful error message from an API response body.
 * Checks every known backend format before giving up.
 */
const extractApiMessage = (data) => {
	if (!data) return null;
	if (typeof data === "string") return data;

	// Backend standard: { error: { message } }
	if (data.error?.message) return data.error.message;

	// Flat: { message }
	if (typeof data.message === "string") return data.message;

	// Validation array in meta: { error: { meta: { errors: [...] } } }
	if (data.error?.meta?.errors?.length) {
		return data.error.meta.errors
			.map((e) =>
				typeof e === "string" ? e : e.message || JSON.stringify(e)
			)
			.join("; ");
	}

	// Top-level errors array: { errors: [...] }
	if (Array.isArray(data.errors) && data.errors.length) {
		return data.errors
			.map((e) =>
				typeof e === "string" ? e : e.message || JSON.stringify(e)
			)
			.join("; ");
	}

	// Fallback: { detail } (some frameworks)
	if (typeof data.detail === "string") return data.detail;

	return null;
};

// Format error message based on error type and response
const formatErrorMessage = (error) => {
	if (!error)
		return {
			type: ErrorType.UNKNOWN_ERROR,
			message: "An unknown error occurred",
		};

	// Handle API response errors
	if (error.response) {
		const { status, data } = error.response;
		const apiMessage = extractApiMessage(data);

		// Authentication errors
		if (status === 401 || status === 403) {
			return {
				type: ErrorType.AUTH_ERROR,
				message:
					apiMessage || "Authentication failed. Please login again.",
			};
		}

		// Validation errors
		if (status === 400) {
			return {
				type: ErrorType.VALIDATION_ERROR,
				message:
					apiMessage || "Invalid request. Please check your input.",
			};
		}

		// Not found errors
		if (status === 404) {
			return {
				type: ErrorType.NOT_FOUND_ERROR,
				message: apiMessage || "The requested resource was not found.",
			};
		}

		// Conflict errors
		if (status === 409) {
			return {
				type: ErrorType.API_ERROR,
				message:
					apiMessage ||
					"A conflict occurred with the current state of the resource.",
			};
		}

		// Server errors
		if (status >= 500) {
			return {
				type: ErrorType.API_ERROR,
				message:
					apiMessage ||
					"Server error occurred. Please try again later.",
			};
		}

		// Default API error
		return {
			type: ErrorType.API_ERROR,
			message: apiMessage || `API Error: ${status}`,
		};
	}

	// Network errors
	if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
		return {
			type: ErrorType.NETWORK_ERROR,
			message:
				"Unable to connect to the server. Please check your internet connection.",
		};
	}

	// Timeout errors
	if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
		return {
			type: ErrorType.NETWORK_ERROR,
			message: "Request timed out. Please try again.",
		};
	}

	// Configuration errors
	if (error.code === "ENOENT") {
		return {
			type: ErrorType.CONFIG_ERROR,
			message: "Configuration file not found. Please run setup again.",
		};
	}

	// Default unknown error
	return {
		type: ErrorType.UNKNOWN_ERROR,
		message: error.message || "An unexpected error occurred",
	};
};

// Display formatted error message to user
const handleError = (error) => {
	const formattedError = formatErrorMessage(error);

	const labels = {
		[ErrorType.AUTH_ERROR]: "Authentication Error",
		[ErrorType.API_ERROR]: "API Error",
		[ErrorType.NETWORK_ERROR]: "Network Error",
		[ErrorType.VALIDATION_ERROR]: "Validation Error",
		[ErrorType.NOT_FOUND_ERROR]: "Not Found",
		[ErrorType.CONFIG_ERROR]: "Configuration Error",
		[ErrorType.UNKNOWN_ERROR]: "Error",
	};

	const label = labels[formattedError.type] || "Error";
	console.error(chalk.red(`\n❌ ${label}:`), formattedError.message);

	// Always show API response details for debugging when there is a response
	if (error?.response) {
		const { status, data, config } = error.response;
		console.error(
			chalk.gray(
				`\n  ${config?.method?.toUpperCase() || "?"} ${config?.url || "?"} → ${status}`
			)
		);
		if (data) {
			console.error(chalk.gray(`  Response: ${JSON.stringify(data)}`));
		}
	}

	process.exit(1);
};

export { ErrorType, handleError };
