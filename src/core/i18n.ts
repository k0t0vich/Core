/*!
 * V4Fire Core
 * https://github.com/V4Fire/Core
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Core/blob/master/LICENSE
 */

import $C = require('collection.js');
import config from 'config';
import * as dict from 'lang';

import { asyncLocal } from 'core/kv-storage';
import { GLOBAL, IS_NODE } from 'core/const/links';
import { EventEmitter2 as EventEmitter } from 'eventemitter2';

export const
	event = new EventEmitter({maxListeners: 100});

const
	storage = asyncLocal.namespace('[[I18N]]'),
	ws = /[\r\n]+/g;

// Normalize translates
const langs = $C(dict).map((el) => {
	if (typeof el !== 'object') {
		return el;
	}

	return $C(el).to(Object.createDict()).reduce((map, el, key) => {
		map[key.replace(ws, ' ')] = el.replace(ws, ' ');
		return map;
	});
});

/**
 * System language
 */
export let
	lang: string,
	isLangDef: boolean,
	isInitialized: Promise<void> = Promise.resolve();

if (IS_NODE) {
	setLang(config.lang);

} else {
	isInitialized = (async () => {
		try {
			const
				l = await storage.get('lang');

			if (l) {
				setLang(l, await storage.get('isLangDef'));
				return;
			}

			throw new Error('Default language');

		} catch {
			setLang(config.lang, true);
		}
	})();
}

/**
 * Sets a new system language
 *
 * @param [value]
 * @param [def] - if true, then the language is system default
 * @emits setLang(value: string, oldValue?: string)
 */
export function setLang(value: string, def?: boolean): string {
	const
		oldLang = lang;

	lang = value;
	isLangDef = Boolean(def);

	if (!IS_NODE) {
		storage.set('lang', value).catch(stderr);
		storage.set('isLangDef', isLangDef).catch(stderr);
	}

	event.emit('setLang', lang, oldLang);
	return lang;
}

/**
 * Global i18n function (string tag)
 */
GLOBAL.i18n = GLOBAL.t = function t(strings: any | string[], ...exprs: any[]): string {
	if (strings == null) {
		return '';
	}

	if (!Object.isArray(strings)) {
		return i18n(strings);
	}

	let str = '';
	if (exprs.length === 0) {
		for (let i = 0; i < strings.length; i++) {
			str += i18n(strings[i]);
		}

	} else {
		for (let i = 0; i < strings.length; i++) {
			str += i18n(strings[i]) + (i in exprs ? exprs[i] : '');
		}
	}

	return str;
};

/**
 * Global i18n helper function (string tag)
 */
GLOBAL.l = function l(strings: any | string[], ...exprs: any[]): string {
	if (strings == null) {
		return '';
	}

	if (!Object.isArray(strings)) {
		return String(strings);
	}

	if (strings.length === 1) {
		return String(strings[0]);
	}

	let str = '';
	for (let i = 0; i < strings.length; i++) {
		str += strings[i] + (i in exprs ? exprs[i] : '');
	}

	return str;
};

/**
 * Base i18n function
 *
 * @param str
 * @param [defLang]
 */
function i18n(str: any, defLang?: string): string {
	str = String(str);
	defLang = defLang === undefined ? lang : defLang;

	if (defLang) {
		const w = langs[defLang] && langs[defLang][str];
		return w != null ? w : str;
	}

	return str;
}
