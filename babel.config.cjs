module.exports = {
	presets: [
		[
			"@babel/preset-env",
			{
				targets: {
					node: "current",
				},
				modules: "commonjs",
			},
		],
	],
	plugins: [
		[
			"@babel/plugin-transform-modules-commonjs",
			{
				allowTopLevelThis: true,
				loose: true,
				lazy: true,
			},
		],
		function () {
			return {
				visitor: {
					MetaProperty(path) {
						path.replaceWithSourceString("process");
					},
				},
			};
		},
	],
	env: {
		test: {
			presets: [
				[
					"@babel/preset-env",
					{
						targets: {
							node: "current",
						},
						modules: "commonjs",
					},
				],
			],
		},
	},
};
