import axios from "axios";
import https from "https";
import { handleError } from "../helper/error.js";

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

const getProductAccounts = async (consoleUrl, token, orgId) => {
	try {
		const response = await axios({
			method: "get",
			url: `${consoleUrl}/service/platform/payment/v1/productAccounts?orgId=${orgId}`,
			headers: {
				Cookie: `fc.session=${token}`,
			},
			httpsAgent: getHttpsAgentForUrl(consoleUrl),
		});
		return response;
	} catch (error) {
		handleError(error);
	}
};

const getCliSession = async (apiUrl, requestCode) => {
	try {
		const response = await axios({
			method: "get",
			url: `${apiUrl}/service/auth/v1.0/authentication/cli/${requestCode}`,
			headers: {
				"Content-Type": "application/json",
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		});
		return response;
	} catch (error) {
		handleError(error);
	}
};

const getCliBearerToken = async (name, apiUrl, account_id, session) => {
	try {
		const response = await axios({
			method: "get",
			url: `${apiUrl}/service/web/token/${account_id}`,
			headers: {
				"Content-Type": "application/json",
				Cookie: `${name}.session=${session}`,
			},
			httpsAgent: getHttpsAgentForUrl(apiUrl),
		});
		return response;
	} catch (error) {
		handleError(error);
	}
};

export { getCliBearerToken, getCliSession, getProductAccounts };
