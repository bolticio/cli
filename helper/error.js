import chalk from "chalk";

// Error types for different scenarios
const ErrorType = {
	API_ERROR: "API_ERROR",
	NETWORK_ERROR: "NETWORK_ERROR",
	AUTH_ERROR: "AUTH_ERROR",
	VALIDATION_ERROR: "VALIDATION_ERROR",
	CONFIG_ERROR: "CONFIG_ERROR",
	UNKNOWN_ERROR: "UNKNOWN_ERROR",
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

		// Authentication errors
		if (status === 401 || status === 403) {
			return {
				type: ErrorType.AUTH_ERROR,
				message:
					data.message ||
					"Authentication failed. Please login again.",
			};
		}

		// Validation errors
		if (status === 400) {
			return {
				type: ErrorType.VALIDATION_ERROR,
				message:
					data.message || "Invalid request. Please check your input.",
			};
		}

		// Server errors
		if (status >= 500) {
			return {
				type: ErrorType.API_ERROR,
				message:
					error.response?.data?.error?.message ||
					"Server error occurred. Please try again later.",
			};
		}

		// Default API error
		return {
			type: ErrorType.API_ERROR,
			message: data.message || `API Error: ${status}`,
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

	switch (formattedError.type) {
		case ErrorType.AUTH_ERROR:
			console.error(
				chalk.red("\n❌ Authentication Error:"),
				formattedError.message
			);
			break;
		case ErrorType.API_ERROR:
			console.error(chalk.red("\n❌ API Error:"), formattedError.message);
			break;
		case ErrorType.NETWORK_ERROR:
			console.error(
				chalk.red("\n❌ Network Error:"),
				formattedError.message
			);
			break;
		case ErrorType.VALIDATION_ERROR:
			console.error(
				chalk.red("\n❌ Validation Error:"),
				formattedError.message
			);
			break;
		case ErrorType.CONFIG_ERROR:
			console.error(
				chalk.red("\n❌ Configuration Error:"),
				formattedError.message
			);
			break;
		default:
			console.error(chalk.red("\n❌ Error:"), formattedError.message);
	}
	process.exit(1);
};

export { ErrorType, handleError };
