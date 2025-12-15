// Define the handler function
export const handler = async (event, res) => {
	try {
		// Prepare the response JSON
		const responseJson = {
			message: "Hello World",
		};

		// Print the JSON response to stdout
		console.log(JSON.stringify(responseJson));

		// Set the response headers
		res.setHeader("Content-Type", "application/json");

		// Send the response JSON
		res.end(JSON.stringify(responseJson));
	} catch (error) {
		// Handle errors
		console.error(error);
		// Send an error response if needed
		res.statusCode = 500;
		res.setHeader("Content-Type", "text/plain");
		res.end("Internal Server Error");
	}
};
