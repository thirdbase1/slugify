import escapeStringRegexp from 'escape-string-regexp';
import transliterate from '@sindresorhus/transliterate';
import builtinOverridableReplacements from './overridable-replacements.js';

const decamelize = string => string
	// Separate capitalized words.
	// Each pattern captures the least leading context it needs, as a greedy quantifier there causes quadratic backtracking on long runs of the same character class.
	// `FOO360` → `FOO 360`
	.replaceAll(/([A-Z]{2})(\d+)/g, '$1 $2')
	// `foo360BAR` → `foo360 BAR`, `fooBar` → `foo Bar`
	.replaceAll(/([a-z\d])([A-Z])/g, '$1 $2')
	// `APISection` → `API Section`. A lowercase `s` right after the acronym is a plural marker rather than the start of a new word, unless another lowercase letter follows it, so `APIs` is left alone while `APIUsage` is still separated.
	.replaceAll(/([A-Z])([A-Z](?!s(?![a-z]))[a-z\d]+)/g, '$1 $2');

const removeMootSeparators = (string, separator) => {
	const escapedSeparator = escapeStringRegexp(separator);

	return string
		.replaceAll(new RegExp(`(?:${escapedSeparator}){2,}`, 'g'), separator)
		.replaceAll(new RegExp(`^(?:${escapedSeparator})|(?:${escapedSeparator})$`, 'g'), '');
};

// Strip the trailing counter groups from a slug, so `foo-1-2` becomes `foo`. This is done with a split rather than a `(?:-\d+)+$` regex, as that pattern is unanchored and so retries at every `-` in the string, which is quadratic on input such as `-1-1-1…-1a`.
const removeCounterSuffix = string => {
	const parts = string.split('-');

	while (parts.length > 1 && /^\d+$/.test(parts.at(-1))) {
		parts.pop();
	}

	return parts.join('-');
};

const buildPatternSlug = options => {
	let negationSetPattern = String.raw`a-z\d`;
	negationSetPattern += options.lowercase ? '' : 'A-Z';

	// When transliteration is disabled, preserve Unicode characters
	if (options.transliterate === false) {
		negationSetPattern += String.raw`\p{L}\p{N}`;
	}

	if (options.preserveCharacters.length > 0) {
		for (const character of options.preserveCharacters) {
			if (character === options.separator) {
				throw new Error(`The separator character \`${options.separator}\` cannot be included in preserved characters: ${options.preserveCharacters}`);
			}

			negationSetPattern += escapeStringRegexp(character);
		}
	}

	const flags = options.transliterate ? 'g' : 'gu';
	return new RegExp(`[^${negationSetPattern}]+`, flags);
};

// Record how many characters a transformation dropped. The removals are counted per step rather than as one difference between the input and the slug, because a step can insert characters too (the separator, the space `decamelize` adds) and those insertions must not offset the removals. Steps that never remove anything, like lowercasing, are left unmeasured.
const recordRemovals = (removals, before, after) => {
	if (removals) {
		removals.count += Math.max(0, before.length - after.length);
	}
};

const assertString = string => {
	if (typeof string !== 'string') {
		throw new TypeError(`Expected a string, got \`${typeof string}\``);
	}
};

const normalizeOptions = options => ({
	separator: '-',
	lowercase: true,
	decamelize: true,
	customReplacements: [],
	preserveLeadingUnderscore: false,
	preserveTrailingDash: false,
	preserveCharacters: [],
	transliterate: true,
	...options,
});

// The whole pipeline lives here so that `slugify()` and `slugify.count()` can never disagree on the slug. `removals` is only passed by `slugify.count()`, which uses it to count the characters the pipeline drops.
const slugifyString = (string, options, removals) => {
	const shouldPrependUnderscore = options.preserveLeadingUnderscore && string.startsWith('_');
	const shouldAppendDash = options.preserveTrailingDash && string.endsWith('-');

	if (options.transliterate) {
		const customReplacements = new Map([
			...builtinOverridableReplacements,
			...options.customReplacements,
		]);

		const transliterated = transliterate(string, {customReplacements, locale: options.locale});
		recordRemovals(removals, string, transliterated);
		string = transliterated;
	} else if (options.customReplacements.length > 0) {
		// Apply custom replacements even when transliteration is disabled
		for (const [key, value] of options.customReplacements) {
			const replaced = string.replaceAll(key, value);
			recordRemovals(removals, string, replaced);
			string = replaced;
		}
	}

	if (options.decamelize) {
		const decamelized = decamelize(string);
		recordRemovals(removals, string, decamelized);
		string = decamelized;
	}

	const patternSlug = buildPatternSlug(options);

	if (options.lowercase) {
		string = options.locale ? string.toLocaleLowerCase(options.locale) : string.toLowerCase();
	}

	// Drop the apostrophe from contractions and possessives so that `Conway's Law` becomes `conways-law` rather than `conway-s-law`. Only a word-final `'t` or `'s` qualifies, so `foo'sbar` is left alone, and both straight and curly apostrophes are handled. What counts as a word character has to be what survives into the slug, so it widens to Unicode alongside `buildPatternSlug` when transliteration is disabled. The `i` flag covers `DON'T` when the `lowercase` option is disabled.
	const contractionPattern = options.transliterate
		? /([a-z\d])['\u2019]([ts])(?![a-z\d])/gi
		: /([\p{L}\p{N}])['\u2019]([ts])(?![\p{L}\p{N}])/giu;

	const contracted = string.replaceAll(contractionPattern, '$1$2');
	recordRemovals(removals, string, contracted);
	string = contracted;

	const slugified = string.replace(patternSlug, options.separator);
	recordRemovals(removals, string, slugified);
	string = slugified;

	const withoutBackslashes = string.replaceAll('\\', '');
	recordRemovals(removals, string, withoutBackslashes);
	string = withoutBackslashes;

	if (options.separator) {
		const separated = removeMootSeparators(string, options.separator);
		recordRemovals(removals, string, separated);
		string = separated;
	}

	if (shouldPrependUnderscore) {
		string = `_${string}`;
	}

	if (shouldAppendDash) {
		string = `${string}-`;
	}

	return string;
};

export default function slugify(string, options) {
	assertString(string);

	return slugifyString(string, normalizeOptions(options));
}

// Slugify a string and report how many characters the slugification removed, so that `slugify.count('Hello, World!')` returns `{slug: 'hello-world', removedCount: 2}`. The removals are counted per step of the pipeline, so a character that is swapped one-for-one, like a space that becomes the separator or `é` that becomes `e`, is not counted.
slugify.count = (string, options) => {
	assertString(string);

	const removals = {count: 0};
	const slug = slugifyString(string, normalizeOptions(options), removals);

	return {slug, removedCount: removals.count};
};

export function slugifyWithCounter() {
	const occurrences = new Map();
	const returned = new Set();

	const countable = (string, options) => {
		string = slugify(string, options);

		if (!string) {
			return '';
		}

		const stringLower = string.toLowerCase();
		const numberless = occurrences.get(removeCounterSuffix(stringLower)) || 0;
		const counter = occurrences.get(stringLower);
		occurrences.set(stringLower, typeof counter === 'number' ? counter + 1 : 1);
		let newCounter = occurrences.get(stringLower) || 2;
		let result = newCounter >= 2 || numberless > 2 ? `${string}-${newCounter}` : string;

		// The counter is keyed on the incoming slug, so it cannot see a slug that was previously handed out by appending a counter to a *different* input. Without this loop, `foo`, `foo`, `foo 2` would return `foo-2` twice. Keep bumping the counter until the result is one that has not been returned before.
		while (returned.has(result.toLowerCase())) {
			newCounter += 1;
			occurrences.set(stringLower, newCounter);
			result = `${string}-${newCounter}`;
		}

		returned.add(result.toLowerCase());

		return result;
	};

	countable.reset = () => {
		occurrences.clear();
		returned.clear();
	};

	return countable;
}
