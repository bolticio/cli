import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import https from "https";
import { handleError } from "../helper/error.js";
import { logApi, logApiRequest, logApiResponse } from "../helper/verbose.js";

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

// When session is absent the token is a PAT → use x-boltic-token header.
// When session is present the token is a bearer token → use Authorization + Cookie.
const buildAuthHeaders = (token, session) => {
	if (session) {
		const headers = {};
		if (token) headers.Authorization = `Bearer ${token}`;
		headers.Cookie = session;
		return headers;
	}
	return token ? { "x-boltic-token": token } : {};
};

// Returns true when the user has sufficient credentials for any auth method.
// Pass accountId when the endpoint requires it; omit (undefined) when it doesn't.
// Passing null means "required but missing" → returns false.
const isAuthenticated = (token, session, accountId) => {
	if (accountId !== undefined) {
		// PAT auth: token + accountId (no session needed)
		// Bearer auth: token + session + accountId
		return !!(token && accountId);
	}
	// For endpoints that don't need accountId: PAT needs just token, bearer needs token+session
	return !!token;
};

const listAllServerless = async (
	apiUrl,
	token,
	accountId,
	session,
	query = null
) => {
	if (!isAuthenticated(token, session, accountId)) {
		console.error(
			"\x1b[31mError:\x1b[0m Authentication credentials are required."
		);
		console.log("\n🔹 Please log in first using:");
		console.log("\x1b[32m$ boltic login\x1b[0m\n");
		process.exit(1); // Exit the CLI with an error code
	}
	try {
		const params = {
			page: 1,
			limit: 999,
			sortBy: "CreatedAt",
			sortOrder: "desc",
		};

		// Add query parameter if provided
		if (query) {
			params.q = query;
		}

		const axiosOptions = {
			method: "get",
			url: `${apiUrl}/service/panel/serverless/v1.0/apps`,
			params,
			headers: {
				"Content-Type": "application/json",
				...buildAuthHeaders(token, session),
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		};

		logApiRequest(
			axiosOptions.method,
			`${axiosOptions.url}?${new URLSearchParams(params).toString()}`
		);
		const response = await axios(axiosOptions);
		logApiResponse(response.status, response.data);
		return response.data.data;
	} catch (error) {
		handleError(error);
	}
};

const pullServerless = async (apiUrl, token, accountId, session, id) => {
	if (!isAuthenticated(token, session, accountId)) {
		console.error(
			"\x1b[31mError:\x1b[0m Authentication credentials are required."
		);
		console.log("\n🔹 Please log in first using:");
		console.log("\x1b[32m$ boltic login\x1b[0m\n");
		process.exit(1); // Exit the CLI with an error code
	}
	try {
		const url = `${apiUrl}/service/panel/serverless/v1.0/apps/${id}`;
		logApiRequest("get", url);
		const response = await axios({
			method: "get",
			url,
			headers: {
				"Content-Type": "application/json",
				...buildAuthHeaders(token, session),
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		});
		logApiResponse(response.status, response?.data);
		return response?.data;
	} catch (error) {
		handleError(error);
	}
};

const publishServerless = async (apiUrl, token, session, payload) => {
	if (!isAuthenticated(token, session)) {
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
			url: `${apiUrl}/service/panel/serverless/v1.0/apps`,
			headers: {
				"Content-Type": "application/json",
				...buildAuthHeaders(token, session),
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
	if (!isAuthenticated(token, session)) {
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
			url: `${apiUrl}/service/panel/serverless/v1.0/apps/${serverlessId}`,
			headers: {
				"Content-Type": "application/json",
				...buildAuthHeaders(token, session),
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

const getServerlessBuilds = async (
	apiUrl,
	token,
	accountId,
	session,
	serverlessId,
	options = {}
) => {
	if (!isAuthenticated(token, session, accountId)) {
		console.error(
			"\x1b[31mError:\x1b[0m Authentication credentials are required."
		);
		console.log("\n🔹 Please log in first using:");
		console.log("\x1b[32m$ boltic login\x1b[0m\n");
		process.exit(1);
	}
	try {
		const axiosOptions = {
			method: "get",
			url: `${apiUrl}/service/panel/serverless/v1.0/apps/${serverlessId}/builds`,
			params: {
				page: options.page || 1,
				limit: options.limit || 20,
				sortBy: "CreatedAt",
				sortOrder: "desc",
			},
			headers: {
				"Content-Type": "application/json",
				...buildAuthHeaders(token, session),
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		};

		const response = await axios(axiosOptions);
		logApi(axiosOptions.method, axiosOptions.url, response.status);
		return response.data;
	} catch (error) {
		handleError(error);
	}
};

const getServerlessLogs = async (
	apiUrl,
	token,
	accountId,
	session,
	serverlessId,
	options = {}
) => {
	if (!isAuthenticated(token, session, accountId)) {
		console.error(
			"\x1b[31mError:\x1b[0m Authentication credentials are required."
		);
		console.log("\n🔹 Please log in first using:");
		console.log("\x1b[32m$ boltic login\x1b[0m\n");
		process.exit(1);
	}
	try {
		// Calculate timestamp range (default: last 24 hours)
		const now = Math.floor(Date.now() / 1000);
		const defaultStart = now - 24 * 60 * 60; // 24 hours ago

		const params = {
			page: options.page || 1,
			limit: options.limit || 50,
			sortBy: "Timestamp",
			sortOrder: options.sortOrder || "DESC",
			timestampStart: options.timestampStart || defaultStart,
			timestampEnd: options.timestampEnd || now,
			metric_interval: 60,
		};

		const axiosOptions = {
			method: "get",
			url: `${apiUrl}/service/panel/serverless/v1.0/apps/${serverlessId}/logs`,
			params,
			headers: {
				"Content-Type": "application/json",
				...buildAuthHeaders(token, session),
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		};

		const response = await axios(axiosOptions);
		logApi(axiosOptions.method, axiosOptions.url, response.status);
		return response.data;
	} catch (error) {
		handleError(error);
	}
};

const getBuildLogs = async (
	apiUrl,
	token,
	accountId,
	session,
	serverlessId,
	buildId
) => {
	if (!isAuthenticated(token, session, accountId)) {
		console.error(
			"\x1b[31mError:\x1b[0m Authentication credentials are required."
		);
		console.log("\n🔹 Please log in first using:");
		console.log("\x1b[32m$ boltic login\x1b[0m\n");
		process.exit(1);
	}
	try {
		const axiosOptions = {
			method: "get",
			url: `${apiUrl}/service/panel/serverless/v1.0/apps/${serverlessId}/builds/${buildId}/logs`,
			params: {
				limit: -1,
				tail: false,
				sortOrder: "asc",
				sortBy: "Timestamp",
			},
			headers: {
				"Content-Type": "application/json",
				...buildAuthHeaders(token, session),
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		};

		const response = await axios(axiosOptions);
		logApi(axiosOptions.method, axiosOptions.url, response.status);
		return response.data;
	} catch (error) {
		handleError(error);
	}
};

export {
	listAllServerless,
	pullServerless,
	publishServerless,
	updateServerless,
	getServerlessBuilds,
	getServerlessLogs,
	getBuildLogs,
};
