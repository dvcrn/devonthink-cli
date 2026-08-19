import assert from "node:assert/strict";
import { test } from "node:test";

import {
	escapeStringForJXA,
	isJXASafeString,
} from "../src/devonthink/utils/escapeString.js";

// These tests guard the JXA-injection fix: user input interpolated into a JXA
// script string must not be able to break out of the string literal. The bug
// they regress against created a record literally named `1337` from the input
// `"+(1000+337)+"` because the value was concatenated unescaped.

test("escapes double quotes so input cannot close the string literal", () => {
	const out = escapeStringForJXA('"+(1000+337)+"');
	// When placed inside "...", the escaped form must not contain an unescaped ".
	const wrapped = `"${out}"`;
	// Evaluate the wrapped literal the same way a JS/JXA engine would.
	// eslint-disable-next-line no-eval
	const evaluated = eval(wrapped) as string;
	assert.equal(evaluated, '"+(1000+337)+"');
});

test("escapes backslashes", () => {
	const out = escapeStringForJXA("C:\\path\\to\\file");
	const evaluated = eval(`"${out}"`) as string;
	assert.equal(evaluated, "C:\\path\\to\\file");
});

test("neutralizes template-literal substitution ${...}", () => {
	const input = "echo ${HOME}/bin and ${PATH}";
	const out = escapeStringForJXA(input);
	// The escaped \${ must survive verbatim inside a template literal.
	const evaluated = eval(`\`${out}\``) as string;
	assert.equal(evaluated, input);
});

test("neutralizes backticks", () => {
	const input = "const x = `template`;";
	const out = escapeStringForJXA(input);
	const evaluated = eval(`\`${out}\``) as string;
	assert.equal(evaluated, input);
});

test("round-trips apostrophes inside double-quoted literals", () => {
	const out = escapeStringForJXA("O'Brien");
	const evaluated = eval(`"${out}"`) as string;
	assert.equal(evaluated, "O'Brien");
});

test("handles undefined and null as empty string", () => {
	assert.equal(escapeStringForJXA(undefined), "");
	assert.equal(escapeStringForJXA(null), "");
});

test("escapes newlines and tabs", () => {
	const out = escapeStringForJXA("line1\nline2\ttab");
	const evaluated = eval(`"${out}"`) as string;
	assert.equal(evaluated, "line1\nline2\ttab");
});

test("isJXASafeString rejects raw control characters", () => {
	assert.equal(isJXASafeString("normal text"), true);
	assert.equal(isJXASafeString("has\x00null"), false);
});

// A compact matrix asserting no escaped output, when wrapped in a double-quoted
// literal, can change the number of "statements" — i.e. injection is impossible.
test("adversarial inputs cannot inject when wrapped in double quotes", () => {
	const attacks = [
		'"; theApp.doShellScript("rm -rf /"); "',
		'\\"; evil(); \\"',
		'"+theApp.name()+"',
		"`${theApp.name()}`",
	];
	for (const attack of attacks) {
		const wrapped = `"${escapeStringForJXA(attack)}"`;
		const evaluated = eval(wrapped) as string;
		// The value must round-trip exactly — proving it stayed inert data.
		assert.equal(evaluated, attack);
	}
});
