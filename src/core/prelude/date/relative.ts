/*!
 * V4Fire Core
 * https://github.com/V4Fire/Core
 *
 * Released under the MIT license
 * https://github.com/V4Fire/Core/blob/master/LICENSE
 */

import extend from 'core/prelude/extend';

/** @see Date.prototype.relative */
extend(Date.prototype, 'relative', function (this: Date): DateRelative {
	return relative(this, new Date());
});

/** @see Date.prototype.relativeTo */
extend(Date.prototype, 'relativeTo', function (this: Date, date: DateCreateValue): DateRelative {
	return relative(this, date);
});

function relative(from: DateCreateValue, to: DateCreateValue): DateRelative {
	const
		diff = Date.create(to).valueOf() - Date.create(from).valueOf();

	const intervals = [
		{type: 'milliseconds', bound: 1e3},
		{type: 'seconds', bound: 1e3 * 60},
		{type: 'minutes', bound: 1e3 * 60 * 60},
		{type: 'hours', bound: 1e3 * 60 * 60 * 24},
		{type: 'days', bound: 1e3 * 60 * 60 * 24 * 7},
		{type: 'weeks', bound: 1e3 * 60 * 60 * 24 * 30},
		{type: 'months', bound: 1e3 * 60 * 60 * 24 * 365}
	];

	for (let i = 0; i < intervals.length; i++) {
		const
			{type, bound} = intervals[i];

		if (Math.abs(diff) < bound) {
			return {
				type: <DateRelative['type']>type,
				value: Number((diff / (i ? intervals[i - 1].bound : 1)).toFixed(2)),
				diff
			};
		}
	}

	return {
		type: 'years',
		value: Number((diff / intervals[intervals.length - 1].bound).toFixed(2)),
		diff
	};
}
