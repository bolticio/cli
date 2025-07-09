import { environments } from "../config/environments.js";
import { handleError } from "../helper/error.js";

const getEnvironments = () => {
	try {
		return environments;
	} catch (error) {
		handleError(error);
	}
};

const setEnvironment = async (environment) => {
	try {
		return environments[environment];
	} catch (error) {
		handleError(error);
	}
};

const getEnvironment = async (configData) => {
	try {
		return configData?.environment || "bolt";
	} catch (error) {
		handleError(error);
	}
};

export { getEnvironment, getEnvironments, setEnvironment };
