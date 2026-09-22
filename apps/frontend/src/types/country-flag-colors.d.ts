declare module 'country-flag-colors' {
	interface CountryFlagColor {
		name: string;
		colors: string[];
	}

	const countryFlagColors: CountryFlagColor[];
	export default countryFlagColors;
}
