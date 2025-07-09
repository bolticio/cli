// Helper function to calculate Levenshtein distance between two strings
function levenshteinDistance(str1, str2) {
	const m = str1.length;
	const n = str2.length;
	const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

	for (let i = 0; i <= m; i++) dp[i][0] = i;
	for (let j = 0; j <= n; j++) dp[0][j] = j;

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			if (str1[i - 1] === str2[j - 1]) {
				dp[i][j] = dp[i - 1][j - 1];
			} else {
				dp[i][j] =
					Math.min(
						dp[i - 1][j - 1], // substitution
						dp[i - 1][j], // deletion
						dp[i][j - 1] // insertion
					) + 1;
			}
		}
	}

	return dp[m][n];
}

// Find similar commands based on Levenshtein distance and prefix matching
export function findSimilarCommands(invalidCommand, availableCommands) {
	const threshold = 3; // Maximum distance to consider as similar
	const suggestions = new Set(); // Use Set to avoid duplicates
	const lowerInvalidCmd = invalidCommand.toLowerCase();

	for (const cmd of Object.keys(availableCommands)) {
		const lowerCmd = cmd.toLowerCase();

		// Check for prefix match first
		if (
			lowerCmd.startsWith(lowerInvalidCmd) ||
			lowerInvalidCmd.startsWith(lowerCmd)
		) {
			suggestions.add(cmd);
			continue;
		}

		// If no prefix match, check Levenshtein distance
		const distance = levenshteinDistance(lowerInvalidCmd, lowerCmd);
		if (distance <= threshold) {
			suggestions.add(cmd);
		}
	}

	return Array.from(suggestions);
}
