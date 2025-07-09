import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import { handleError } from "../helper/error.js";
import { logApi } from "../helper/verbose.js";

const getIntegrationGroups = async (apiUrl, accountId, token, session) => {
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
			url: `${apiUrl}/service/panel/temporal/v1.0/${accountId}/integration-groups`,
			params: {
				page: 1,
				per_page: 999,
			},
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
		};

		const response = await axios(axiosOptions);
		logApi(axiosOptions.method, axiosOptions.url, response.status);
		return response.data.data;
	} catch (error) {
		handleError(error);
	}
};

const listAllIntegrations = async (apiUrl, token, accountId, session) => {
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
			url: `${apiUrl}/service/panel/temporal/v1.0/${accountId}/integrations`,
			params: {
				page: 1,
				per_page: 999,
			},
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
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
			method: "post",
			url: `${apiUrl}/service/panel/temporal/v1.0/${accountId}/integrations`,
			data: integration,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
		});
		return response.data.data;
	} catch (error) {
		handleError(error);
	}
};

const editIntegration = async (apiUrl, token, accountId, session, payload) => {
	if (!token || !session || !accountId) {
		console.error(
			"\x1b[31mError:\x1b[0m Authentication credentials are required."
		);
		console.log("\n🔹 Please log in first using:");
		console.log("\x1b[32m$ boltic login\x1b[0m\n");
		process.exit(1); // Exit the CLI with an error code
	}
	const { id } = payload;
	try {
		const response = await axios({
			method: "post",
			url: `${apiUrl}/service/panel/temporal/v1.0/${accountId}/integrations/${id}/edit`,
			data: payload,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
		});

		return response.data.data;
	} catch (error) {
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
	if (!token || !session || !accountId) {
		console.error(
			"\x1b[31mError:\x1b[0m Authentication credentials are required."
		);
		console.log("\n🔹 Please log in first using:");
		console.log("\x1b[32m$ boltic login\x1b[0m\n");
		process.exit(1); // Exit the CLI with an error code
	}
	try {
		const { id, ...rest } = integration;
		const response = await axios({
			method: "patch",
			url: `${apiUrl}/service/panel/temporal/v1.0/${accountId}/integrations/${id}`,
			data: rest,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
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
			url: `${apiUrl}/service/panel/temporal/v1.0/${accountId}/integrations/${integrationId}`,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
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
			url: `${apiUrl}/service/panel/temporal/v1.0/${accountId}integrations/${integrationId}/authentication`,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
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
			url: `${apiUrl}/service/panel/temporal/v1.0/${accountId}integrations/${integrationId}/webhooks`,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
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
			url: `${apiUrl}/service/panel/temporal/v1.0/${accountId}integrations/${integrationId}/configuration`,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
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
			method: "post",
			url: `${apiUrl}/service/panel/temporal/v1.0/${accountId}/integrations/${integration.integration_id}/deploy`,
			data: integration,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
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
			method: "post",
			url: `${apiUrl}/service/panel/temporal/v1.0/${accountId}/integration-reviews`,
			data: integration,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
		});
		return response.data.data;
	} catch (error) {
		handleError(error);
	}
};

const purgeCache = async (apiUrl, token, accountId, session, integration) => {
	const { integration_id } = integration;
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
			method: "post",
			url: `${apiUrl}/service/panel/temporal/v1.0/${accountId}/integrations/${integration_id}/cache`,
			data: {},
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
		});
		return response.data;
	} catch (error) {
		handleError(error);
	}
};

const pullIntegration = async (apiUrl, token, accountId, session, id) => {
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
			url: `${apiUrl}/service/panel/temporal/v1.0/${accountId}/integrations/${id}/pull`,
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
				Cookie: session,
			},
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
	if (!token || !session || !accountId) {
		console.error(
			"\x1b[31mError:\x1b[0m Authentication credentials are required."
		);
		console.log("\n🔹 Please log in first using:");
		console.log("\x1b[32m$ boltic login\x1b[0m\n");
		process.exit(1);
	}

	if (!fs.existsSync(filePath)) {
		throw new Error("File does not exist: " + filePath);
	}

	try {
		const form = new FormData();
		form.append("files", fs.createReadStream(filePath));

		const response = await axios.post(
			`${apiUrl}/service/panel/temporal/v1.0/${accountId}/utility/upload`,
			form,
			{
				headers: {
					...form.getHeaders(),
					Authorization: `Bearer ${token}`,
					Cookie: session,
				},
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
