import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import https from "https";
import { handleError } from "../helper/error.js";
import { getSecret } from "../helper/secure-storage.js";
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
	} catch {
		// ignore URL parse errors and fall back to default agent
	}
	return undefined;
};

const buildAuthHeaders = async (token, session) => {
	const pat = await getSecret("pat");

	// If PAT exists, prefer PAT-based auth and do not send bearer/session
	if (pat && pat.trim()) {
		return {
			"x-boltic-token": pat.trim(),
		};
	}

	// Fallback to existing Bearer + Cookie auth
	const headers = {};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}
	if (session) {
		headers.Cookie = session;
	}
	return headers;
};

const ensureAuthenticatedOrExit = async (accountId, token, session) => {
	const pat = await getSecret("pat");
	const hasPatAuth = pat && pat.trim() && accountId;
	const hasSessionAuth = token && session && accountId;

	if (!hasPatAuth && !hasSessionAuth) {
		console.error(
			"\x1b[31mError:\x1b[0m Authentication credentials are required."
		);
		console.log("\n🔹 Please log in first using:");
		console.log("\x1b[32m$ boltic login\x1b[0m\n");
		process.exit(1); // Exit the CLI with an error code
	}
};

const getIntegrationGroups = async (apiUrl, accountId, token, session) => {
	try {
		await ensureAuthenticatedOrExit(accountId, token, session);
		const authHeaders = await buildAuthHeaders(token, session);
		const axiosOptions = {
			method: "get",
			url: `${apiUrl}/service/panel/automation/v1.0/${accountId}/integration-groups`,
			params: {
				page: 1,
				per_page: 999,
			},
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
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

const listAllIntegrations = async (apiUrl, token, accountId, session) => {
	try {
		await ensureAuthenticatedOrExit(accountId, token, session);
		const authHeaders = await buildAuthHeaders(token, session);
		const axiosOptions = {
			method: "get",
			url: `${apiUrl}/service/panel/automation/v1.0/${accountId}/integrations`,
			params: {
				page: 1,
				per_page: 999,
			},
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
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

const saveIntegration = async (
	apiUrl,
	token,
	accountId,
	session,
	integration
) => {
	try {
		await ensureAuthenticatedOrExit(accountId, token, session);
		const authHeaders = await buildAuthHeaders(token, session);
		const response = await axios({
			method: "post",
			url: `${apiUrl}/service/panel/automation/v1.0/${accountId}/integrations`,
			data: integration,
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		});
		return response.data.data;
	} catch (error) {
		handleError(error);
	}
};

const editIntegration = async (apiUrl, token, accountId, session, payload) => {
	const { id } = payload;
	const url = `${apiUrl}/service/panel/automation/v1.0/${accountId}/integrations/${id}/edit`;
	try {
		await ensureAuthenticatedOrExit(accountId, token, session);
		const authHeaders = await buildAuthHeaders(token, session);
		logApiRequest("post", url, payload);
		const response = await axios({
			method: "post",
			url,
			data: payload,
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		});
		logApiResponse(response.status, response.data);
		return response.data.data;
	} catch (error) {
		logApiResponse(error.response?.status, error.response?.data);
		handleError(error);
	}
};

const updateIntegration = async (
	apiUrl,
	token,
	accountId,
	session,
	integration
) => {
	try {
		await ensureAuthenticatedOrExit(accountId, token, session);
		const authHeaders = await buildAuthHeaders(token, session);
		const { id, ...rest } = integration;
		const response = await axios({
			method: "patch",
			url: `${apiUrl}/service/panel/automation/v1.0/${accountId}/integrations/${id}`,
			data: rest,
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		});
		return response.data.data;
	} catch (error) {
		handleError(error);
	}
};

const getIntegrationById = async (
	apiUrl,
	token,
	accountId,
	session,
	integrationId
) => {
	try {
		await ensureAuthenticatedOrExit(accountId, token, session);
		const authHeaders = await buildAuthHeaders(token, session);
		const response = await axios({
			method: "get",
			url: `${apiUrl}/service/panel/automation/v1.0/${accountId}/integrations/${integrationId}`,
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		});
		return response.data.data;
	} catch (error) {
		handleError(error);
	}
};

const getAuthenticationByIntegrationId = async (
	apiUrl,
	token,
	accountId,
	session,
	integrationId
) => {
	try {
		await ensureAuthenticatedOrExit(accountId, token, session);
		const authHeaders = await buildAuthHeaders(token, session);
		const response = await axios({
			method: "get",
			url: `${apiUrl}/service/panel/automation/v1.0/${accountId}integrations/${integrationId}/authentication`,
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		});
		return response.data.data;
	} catch (error) {
		handleError(error);
	}
};

const getWebhooksByIntegrationId = async (
	apiUrl,
	token,
	accountId,
	session,
	integrationId
) => {
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
			url: `${apiUrl}/service/panel/automation/v1.0/${accountId}integrations/${integrationId}/webhooks`,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		});
		return response.data.data;
	} catch (error) {
		handleError(error);
	}
};

const getConfigurationByIntegrationId = async (
	apiUrl,
	token,
	session,
	accountId,
	integrationId
) => {
	try {
		await ensureAuthenticatedOrExit(accountId, token, session);
		const authHeaders = await buildAuthHeaders(token, session);
		const response = await axios({
			method: "get",
			url: `${apiUrl}/service/panel/automation/v1.0/${accountId}integrations/${integrationId}/configuration`,
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		});
		return response.data.data;
	} catch (error) {
		handleError(error);
	}
};

const syncIntegration = async (
	apiUrl,
	token,
	accountId,
	session,
	integration
) => {
	try {
		await ensureAuthenticatedOrExit(accountId, token, session);
		const authHeaders = await buildAuthHeaders(token, session);
		const response = await axios({
			method: "post",
			url: `${apiUrl}/service/panel/automation/v1.0/${accountId}/integrations/${integration.integration_id}/deploy`,
			data: integration,
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		});
		return response.data.data;
	} catch (error) {
		handleError(error);
	}
};

const sendIntegrationForReview = async (
	apiUrl,
	token,
	accountId,
	session,
	integration
) => {
	try {
		await ensureAuthenticatedOrExit(accountId, token, session);
		const response = await axios({
			method: "post",
			url: `${apiUrl}/service/panel/automation/v1.0/${accountId}/integration-reviews`,
			data: integration,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		});
		return response.data.data;
	} catch (error) {
		handleError(error);
	}
};

const purgeCache = async (apiUrl, token, accountId, session, integration) => {
	const { integration_id } = integration;
	try {
		await ensureAuthenticatedOrExit(accountId, token, session);
		const authHeaders = await buildAuthHeaders(token, session);
		const response = await axios({
			method: "post",
			url: `${apiUrl}/service/panel/automation/v1.0/${accountId}/integrations/${integration_id}/cache`,
			data: {},
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		});
		return response.data;
	} catch (error) {
		handleError(error);
	}
};

const pullIntegration = async (apiUrl, token, accountId, session, id) => {
	try {
		await ensureAuthenticatedOrExit(accountId, token, session);
		const authHeaders = await buildAuthHeaders(token, session);
		const response = await axios({
			method: "get",
			url: `${apiUrl}/service/panel/automation/v1.0/${accountId}/integrations/${id}/pull`,
			headers: {
				"Content-Type": "application/json",
				...authHeaders,
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		});

		return response.data.data;
	} catch (error) {
		handleError(error);
	}
};

const uploadFileToCloud = async (
	apiUrl,
	token,
	accountId,
	session,
	filePath
) => {
	if (!fs.existsSync(filePath)) {
		throw new Error("File does not exist: " + filePath);
	}

	try {
		await ensureAuthenticatedOrExit(accountId, token, session);
		const authHeaders = await buildAuthHeaders(token, session);
		const form = new FormData();
		form.append("files", fs.createReadStream(filePath));

		const response = await axios.post(
			`${apiUrl}/service/panel/automation/v1.0/${accountId}/utility/upload`,
			form,
			{
				headers: {
					...form.getHeaders(),
					...authHeaders,
				},
				httpsAgent: getHttpsAgentForUrl(apiUrl),
			}
		);

		return response.data?.data?.[0];
	} catch (error) {
		console.error(
			"❌ Upload failed:",
			error?.response?.data || error.message
		);
		throw error;
	}
};
export {
	editIntegration,
	getAuthenticationByIntegrationId,
	getConfigurationByIntegrationId,
	getIntegrationById,
	getIntegrationGroups,
	getWebhooksByIntegrationId,
	listAllIntegrations,
	pullIntegration,
	purgeCache,
	saveIntegration,
	sendIntegrationForReview,
	syncIntegration,
	updateIntegration,
	uploadFileToCloud,
};
