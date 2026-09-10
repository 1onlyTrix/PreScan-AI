import { jsonrepair } from 'jsonrepair';

/**
 * Robustly parses JSON returned by Gemini or other LLMs.
 * Handles markdown code blocks, unescaped newlines/quotes, trailing commas,
 * invalid control characters, and truncated JSON structures.
 */
export function parseGeminiJSON<T = any>(rawText: string): T {
  if (!rawText || typeof rawText !== 'string') {
    throw new Error('Cannot parse empty or non-string input as JSON.');
  }

  let text = rawText.trim();

  // 1. Remove markdown code blocks if wrapped in ```json ... ``` or ``` ... ```
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // 2. Locate first JSON structure start ({ or [) and last structure end (} or ])
  const firstBrace = text.indexOf('{');
  const firstBracket = text.indexOf('[');
  let startIndex = -1;

  if (firstBrace !== -1 && firstBracket !== -1) {
    startIndex = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIndex = firstBrace;
  } else if (firstBracket !== -1) {
    startIndex = firstBracket;
  }

  if (startIndex !== -1) {
    text = text.substring(startIndex);
  }

  // Find last closing brace/bracket
  const lastBrace = text.lastIndexOf('}');
  const lastBracket = text.lastIndexOf(']');
  let endIndex = Math.max(lastBrace, lastBracket);

  if (endIndex !== -1) {
    text = text.substring(0, endIndex + 1);
  }

  // Attempt 1: Standard native JSON.parse
  try {
    return JSON.parse(text) as T;
  } catch (err1) {
    // Continue to repair strategies
  }

  // Attempt 2: Use jsonrepair
  try {
    const repaired = jsonrepair(text);
    return JSON.parse(repaired) as T;
  } catch (err2) {
    // Continue
  }

  // Attempt 3: Fix unescaped control characters & raw newlines inside JSON string literals
  try {
    // Replace raw newlines inside double-quoted string literals with escaped \n
    const sanitizedControlChars = text.replace(/(?<=:\s*"[^"]*)\n(?=[^"]*")/g, '\\n');
    const repaired = jsonrepair(sanitizedControlChars);
    return JSON.parse(repaired) as T;
  } catch (err3) {
    // Continue
  }

  // Attempt 4: Truncated JSON recovery (if response was cut off before closing braces/brackets)
  try {
    let truncatedText = text;

    // Remove any trailing comma or dangling property name/colon at the end
    truncatedText = truncatedText.replace(/,\s*$/g, '');
    truncatedText = truncatedText.replace(/,\s*"[^"]*"\s*:\s*$/g, '');

    // Count open braces vs closed braces
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;

    for (let i = 0; i < truncatedText.length; i++) {
      const char = truncatedText[i];
      if (char === '"' && (i === 0 || truncatedText[i - 1] !== '\\')) {
        inString = !inString;
      }
      if (!inString) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces--;
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets--;
      }
    }

    if (inString) {
      truncatedText += '"';
    }

    // Balance unclosed arrays and objects
    while (openBrackets > 0) {
      truncatedText += ']';
      openBrackets--;
    }
    while (openBraces > 0) {
      truncatedText += '}';
      openBraces--;
    }

    const repaired = jsonrepair(truncatedText);
    return JSON.parse(repaired) as T;
  } catch (err4) {
    // Continue
  }

  // Attempt 5: Fallback on original raw text with jsonrepair
  try {
    const rawRepaired = jsonrepair(rawText);
    return JSON.parse(rawRepaired) as T;
  } catch (err5) {
    throw new Error(`Failed to parse Gemini media analysis JSON response: Expected valid JSON or repairable JSON structure.`);
  }
}
