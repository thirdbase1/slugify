export type Options = {
	/**
	@default '-'

	@example
	```
	import slugify from '@sindresorhus/slugify';

	slugify('BAR and baz');
	//=> 'bar-and-baz'

	slugify('BAR and baz', {separator: '_'});
	//=> 'bar_and_baz'

	slugify('BAR and baz', {separator: ''});
	//=> 'barandbaz'
	```
	*/
	readonly separator?: string;

	/**
	Make the slug lowercase.

	@default true

	@example
	```
	import slugify from '@sindresorhus/slugify';

	slugify('Déjà Vu!');
	//=> 'deja-vu'

	slugify('Déjà Vu!', {lowercase: false});
	//=> 'Deja-Vu'
	```
	*/
	readonly lowercase?: boolean;

	/**
	Convert camelcase to separate words. Internally it does `fooBar` → `foo bar`.

	@default true

	@example
	```
	import slugify from '@sindresorhus/slugify';

	slugify('fooBar');
	//=> 'foo-bar'

	slugify('fooBar', {decamelize: false});
	//=> 'foobar'
	```
	*/
	readonly decamelize?: boolean;

	/**
	Add your own custom replacements.

	The replacements are run on the original string before any other transformations.

	This only overrides a default replacement if you set an item with the same key, like `&`.

	Add a leading and trailing space to the replacement to have it separated by dashes.

	@default [ ['&', ' and '], ['🦄', ' unicorn '], ['♥', ' love '] ]

	@example
	```
	import slugify from '@sindresorhus/slugify';

	slugify('Foo@unicorn', {
		customReplacements: [
			['@', 'at']
		]
	});
	//=> 'fooatunicorn'

	slugify('foo@unicorn', {
		customReplacements: [
			['@', ' at ']
		]
	});
	//=> 'foo-at-unicorn'

	slugify('I love 🐶', {
		customReplacements: [
			['🐶', 'dogs']
		]
	});
	//=> 'i-love-dogs'
	```
	*/
	readonly customReplacements?: ReadonlyArray<[string, string]>;

	/**
	If your string starts with an underscore, it will be preserved in the slugified string.

	Sometimes leading underscores are intentional, for example, filenames representing hidden paths on a website.

	@default false

	@example
	```
	import slugify from '@sindresorhus/slugify';

	slugify('_foo_bar');
	//=> 'foo-bar'

	slugify('_foo_bar', {preserveLeadingUnderscore: true});
	//=> '_foo-bar'
	```
	*/
	readonly preserveLeadingUnderscore?: boolean;

	/**
	If your string ends with a dash, it will be preserved in the slugified string.

	For example, using slugify on an input field would allow for validation while not preventing the user from writing a slug.

	@default false

	@example
	```
	import slugify from '@sindresorhus/slugify';

	slugify('foo-bar-');
	//=> 'foo-bar'

	slugify('foo-bar-', {preserveTrailingDash: true});
	//=> 'foo-bar-'
	```
	 */
	readonly preserveTrailingDash?: boolean;

	/**
	Preserve certain characters.

	It cannot contain the `separator`.

	The apostrophe in a word-final `'s` or `'t` is still dropped, even if you preserve `'`.

	For example, if you want to slugify URLs, but preserve the HTML fragment `#` character, you could set `preserveCharacters: ['#']`.

	@default []

	@example
	```
	import slugify from '@sindresorhus/slugify';

	slugify('foo_bar#baz', {preserveCharacters: ['#']});
	//=> 'foo-bar#baz'
	```
	*/
	readonly preserveCharacters?: string[];

	/**
	The locale to use for language-specific transliteration.

	See the [`@sindresorhus/transliterate` package](https://github.com/sindresorhus/transliterate#locale) for more info.

	@default undefined

	@example
	```
	import slugify from '@sindresorhus/slugify';

	slugify('Räksmörgås');
	//=> 'raeksmoergas'

	slugify('Räksmörgås', {locale: 'sv'});
	//=> 'raksmorgas'
	```
	*/
	readonly locale?: string | undefined;

	/**
	Whether to transliterate Unicode characters to ASCII.

	When `false`, non-ASCII characters will be preserved instead of being transliterated. This can improve performance when you don't need transliteration.

	@default true

	@example
	```
	import slugify from '@sindresorhus/slugify';

	slugify('Déjà Vu');
	//=> 'deja-vu'

	slugify('Déjà Vu', {transliterate: false});
	//=> 'déjà-vu'
	```
	*/
	readonly transliterate?: boolean;
};

/**
Slugify a string.

@param string - String to slugify.

@example
```
import slugify from '@sindresorhus/slugify';

slugify('I ♥ Dogs');
//=> 'i-love-dogs'

slugify('  Déjà Vu!  ');
//=> 'deja-vu'

slugify('fooBar 123 $#%');
//=> 'foo-bar-123'

slugify('Conway’s Law');
//=> 'conways-law'

slugify('я люблю единорогов');
//=> 'ya-lyublyu-edinorogov'
```
*/
export type Slugify = {
	(string: string, options?: Options): string;
	/**
	Slugify a string and report how many characters the slugification removed.

	@example
	```
	import slugify from '@sindresorhus/slugify';

	slugify.count('Hello, World!');
	//=> {slug: 'hello-world', removedCount: 2}

	slugify.count('Déjà Vu!');
	//=> {slug: 'deja-vu', removedCount: 1}
	```
	*/
	count: (string: string, options?: Options) => SlugCount;
};

declare const slugify: Slugify;

export default slugify;

export type CountableSlugify = {
	/**
	Reset the counter.

	@example
	```
	import {slugifyWithCounter} from '@sindresorhus/slugify';

	const slugify = slugifyWithCounter();

	slugify('foo bar');
	//=> 'foo-bar'

	slugify('foo bar');
	//=> 'foo-bar-2'

	slugify.reset();

	slugify('foo bar');
	//=> 'foo-bar'
	```
	*/
	reset: () => void;

	/**
	Returns a new instance of `slugify(string, options?)` with a counter to handle multiple occurrences of the same string.

	@param string - String to slugify.

	@example
	```
	import {slugifyWithCounter} from '@sindresorhus/slugify';

	const slugify = slugifyWithCounter();

	slugify('foo bar');
	//=> 'foo-bar'

	slugify('foo bar');
	//=> 'foo-bar-2'

	slugify.reset();

	slugify('foo bar');
	//=> 'foo-bar'
	```

	__Use case example of counter__

	If, for example, you have a document with multiple sections where each subsection has an example.

	```
	## Section 1

	### Example

	## Section 2

	### Example
	```

	You can then use `slugifyWithCounter()` to generate unique HTML `id`'s to ensure anchors will link to the right headline.
	*/
	(string: string, options?: Options): string;
};

export type SlugCount = {
	/**
	The slug, exactly as `slugify()` would return it.
	*/
	readonly slug: string;

	/**
	The number of characters that were removed while slugifying.

	Characters that are dropped outright, like `!` or `_`, are counted, and so are the characters that are swallowed when a run of them collapses into a single separator. Characters that are swapped one-for-one are not counted, so a space that becomes the separator or `é` that becomes `e` adds nothing. Neither do characters the slugification adds, like the ` and ` that `&` expands to.

	@example
	```
	import slugify from '@sindresorhus/slugify';

	slugify.count('Hello, World!').removedCount;
	//=> 2

	slugify.count('foo  bar').removedCount;
	//=> 1
	```
	*/
	readonly removedCount: number;
};

export function slugifyWithCounter(): CountableSlugify;
