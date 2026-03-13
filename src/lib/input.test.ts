import test from "node:test";
import assert from "node:assert/strict";
import {
  sanitizeEmailInput,
  sanitizeIpInput,
  sanitizeMultilineInput,
  sanitizeSingleLineInput,
  sanitizeSlugListInput,
} from "./input.ts";

test("sanitizeSingleLineInput strips control chars and collapses whitespace", () => {
  const value = sanitizeSingleLineInput("  hello\tworld\u0000<script>  ");
  assert.equal(value, "hello world <script>");
});

test("sanitizeMultilineInput preserves clean newlines and removes control chars", () => {
  const value = sanitizeMultilineInput("  line one\r\nline\t two\u0000\r\n\r\n\r\nline three  ");
  assert.equal(value, "line one\nline two\n\nline three");
});

test("sanitizeEmailInput lowercases and removes header injection chars", () => {
  const value = sanitizeEmailInput("  User+Test@Example.com\r\nBCC:evil@example.com  ");
  assert.equal(value, "user+test@example.com bcc:evil@example.com");
});

test("sanitizeSlugListInput deduplicates and limits entries", () => {
  const value = sanitizeSlugListInput(" Luffy-01, ichigo-01,\nLUFFY-01 , ulquiorra-01 ");
  assert.deepEqual(value, ["luffy-01", "ichigo-01", "ulquiorra-01"]);
});

test("sanitizeIpInput normalizes ipv4-mapped ipv6 addresses", () => {
  const value = sanitizeIpInput(" ::ffff:203.0.113.7 ");
  assert.equal(value, "203.0.113.7");
});
