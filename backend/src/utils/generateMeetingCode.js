import crypto from "crypto";
import Meeting from "../models/Meeting.js";

const LETTERS = "abcdefghijklmnopqrstuvwxyz";

// crypto.randomInt is secure random, Math.random is guessable
const randomLetters = (count) =>
  Array.from({ length: count }, () => LETTERS[crypto.randomInt(LETTERS.length)]).join("");

// Example: abc-defg-hij
export const generateMeetingCode = () => `${randomLetters(3)}-${randomLetters(4)}-${randomLetters(3)}`;

export async function generateUniqueMeetingCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateMeetingCode();
    const exists = await Meeting.exists({ meetingCode: code });
    if (!exists) return code;
  }
  throw new Error("Could not generate a unique meeting code");
}
