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
		return response?.data;
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

	try {
		const axiosOptions = {
			method: "post",
			url: `https://asia-south1.api.boltic.io/service/panel/serverless/v1.0/apps`,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
			data: payload,
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		};

		const response = await axios(axiosOptions);
		logApi(axiosOptions.method, axiosOptions.url, response.status);
		return response.data;
	} catch (error) {
		handleError(error);
		return null;
	}
};

const updateServerless = async (
	apiUrl,
	token,
	session,
	serverlessId,
	payload
) => {
	if (!token || !session) {
		console.error(
			"\x1b[31mError:\x1b[0m Authentication credentials are required."
		);
		console.log("\n🔹 Please log in first using:");
		console.log("\x1b[32m$ boltic login\x1b[0m\n");
		process.exit(1);
	}

	try {
		const axiosOptions = {
			method: "put",
			url: `https://asia-south1.api.boltic.io/service/panel/serverless/v1.0/apps/${serverlessId}`,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
			data: payload,
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		};

		const response = await axios(axiosOptions);
		logApi(axiosOptions.method, axiosOptions.url, response.status);
		return response.data;
	} catch (error) {
		handleError(error);
		return null;
	}
};

export {
	listAllServerless,
	pullServerless,
	publishServerless,
	updateServerless,
};
