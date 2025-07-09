import axios from "axios";
import { handleError } from "../helper/error.js";

const getProductAccounts = async (consoleUrl, token, orgId) => {
	try {
		const response = await axios({
			method: "get",
			url: `${consoleUrl}/service/platform/payment/v1/productAccounts?orgId=${orgId}`,
			headers: {
				Cookie: `fc.session=${token}`,
			},
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
		});
		return response;
	} catch (error) {
		handleError(error);
	}
};

export { getCliBearerToken, getCliSession, getProductAccounts };
