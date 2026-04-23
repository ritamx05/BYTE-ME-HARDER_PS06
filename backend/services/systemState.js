/**
 * systemState.js
 * Singleton for global system mode state (Normal / MCI).
 * Centralizes mode access so all services read from one source.
 */

let systemMode = 'normal'; // "normal" | "MCI"

/**
 * Get the current system mode.
 * @returns {string} "normal" or "MCI"
 */
function getSystemMode() {
  return systemMode;
}

/**
 * Set the system mode.
 * @param {'normal'|'MCI'} mode
 */
function setSystemMode(mode) {
  if (mode !== 'normal' && mode !== 'MCI') {
    throw new Error(`Invalid mode: ${mode}. Must be "normal" or "MCI".`);
  }
  systemMode = mode;
  console.log(`[SYSTEM] Mode switched to: ${mode}`);
}

/**
 * Toggle between normal and MCI.
 * @returns {string} new mode
 */
function toggleSystemMode() {
  systemMode = systemMode === 'normal' ? 'MCI' : 'normal';
  console.log(`[SYSTEM] Mode toggled to: ${systemMode}`);
  return systemMode;
}

module.exports = { getSystemMode, setSystemMode, toggleSystemMode };
