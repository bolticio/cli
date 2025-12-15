import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import https from "https";
import { handleError } from "../helper/error.js";
import { logApi } from "../helper/verbose.js";

const getHttpsAgentForUrl = (baseUrl) => {
	try {
		const host = new URL(baseUrl).hostname;
		if (
			host.endsWith("fcz0.de") ||
			host.endsWith("uat.fcz0.de") ||
			host.endsWith("fyndx1.de") ||
			process.env.BOLTCI_INSECURE_TLS === "true"
		) {
			return new https.Agent({ rejectUnauthorized: false });
		}
	} catch (_) {
		// ignore URL parse errors and fall back to default agent
	}
	return undefined;
};

const listAllServerless = async (apiUrl, token, accountId, session) => {
	if (!token || !session || !accountId) {
		console.error(
			"\x1b[31mError:\x1b[0m Authentication credentials are required."
		);
		console.log("\n🔹 Please log in first using:");
		console.log("\x1b[32m$ boltic login\x1b[0m\n");
		process.exit(1); // Exit the CLI with an error code
	}
	try {
		const axiosOptions = {
			method: "get",
			url: `${apiUrl}/service/panel/serverless/v1.0/apps`,
			params: {
				page: 1,
				limit: 999,
				sortBy: "CreatedAt",
				sortOrder: "desc",
			},
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		};

		const response = await axios(axiosOptions);
		logApi(axiosOptions.method, axiosOptions.url, response.status);
		return response.data.data;
	} catch (error) {
		handleError(error);
	}
};

const pullServerless = async (apiUrl, token, accountId, session, id) => {
	if (!token || !session || !accountId) {
		console.error(
			"\x1b[31mError:\x1b[0m Authentication credentials are required."
		);
		console.log("\n🔹 Please log in first using:");
		console.log("\x1b[32m$ boltic login\x1b[0m\n");
		process.exit(1); // Exit the CLI with an error code
	}
	try {
		const response = await axios({
			method: "get",
			url: `${apiUrl}/service/panel/serverless/v1.0/apps/${id}`,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		});

		return response;
	} catch (error) {
		handleError(error);
	}
};

const publishServerless = async (apiUrl, token, session, payload) => {
	if (!token || !session) {
		console.error(
			"\x1b[31mError:\x1b[0m Authentication credentials are required."
		);
		console.log("\n🔹 Please log in first using:");
		console.log("\x1b[32m$ boltic login\x1b[0m\n");
		process.exit(1);
	}

	// Debug logging
	console.log("\x1b[36m[DEBUG] API URL:\x1b[0m", apiUrl);
	console.log(
		"\x1b[36m[DEBUG] Token (first 20 chars):\x1b[0m",
		token?.substring(0, 20) + "..."
	);
	console.log(
		"\x1b[36m[DEBUG] Session (first 20 chars):\x1b[0m",
		session?.substring(0, 20) + "..."
	);
	console.log("\x1b[36m[DEBUG] Payload Name:\x1b[0m", payload?.Name);
	console.log(
		"\x1b[36m[DEBUG] Payload Language:\x1b[0m",
		payload?.CodeOpts?.Language
	);

	try {
		const axiosOptions = {
			method: "post",
			url: `${apiUrl}/service/panel/serverless/v1.0/apps`,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
			data: payload,
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		};

		console.log("\x1b[36m[DEBUG] Request URL:\x1b[0m", axiosOptions.url);
		console.log(
			"\x1b[36m[DEBUG] Request Headers:\x1b[0m",
			JSON.stringify(axiosOptions.headers, null, 2)
		);

		const response = await axios(axiosOptions);
		logApi(axiosOptions.method, axiosOptions.url, response.status);
		console.log("\x1b[32m[DEBUG] Response Status:\x1b[0m", response.status);
		console.log(
			"\x1b[32m[DEBUG] Response Data:\x1b[0m",
			JSON.stringify(response.data, null, 2)
		);
		return response.data;
	} catch (error) {
		console.error("\x1b[31m[DEBUG] Error occurred:\x1b[0m");
		console.error("\x1b[31m[DEBUG] Error Message:\x1b[0m", error.message);
		if (error.response) {
			console.error(
				"\x1b[31m[DEBUG] Response Status:\x1b[0m",
				error.response.status
			);
			console.error(
				"\x1b[31m[DEBUG] Response Data:\x1b[0m",
				JSON.stringify(error.response.data, null, 2)
			);
			console.error(
				"\x1b[31m[DEBUG] Response Headers:\x1b[0m",
				JSON.stringify(error.response.headers, null, 2)
			);
		}
		if (error.request) {
			console.error(
				"\x1b[31m[DEBUG] Request was made but no response received\x1b[0m"
			);
		}
		handleError(error);
		return null;
	}
};

export { listAllServerless, pullServerless, publishServerless };
