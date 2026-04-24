/**
 * priorityService.js
 * Handles all priority score calculations for Normal and MCI modes.
 */

/**
 * Auto-generate survival probability from severity (offline, no API).
 * Higher severity = lower survival chance.
 * @param {number} severity - 1 to 10
 * @returns {number} survivalProbability between 0 and 1
 */
function calcSurvivalProbability(severity) {
  return parseFloat((1 - severity / 10).toFixed(4));
}

/**
 * Calculate priority score based on current system mode.
 * Normal Mode: priorityScore = (severity * 2) + (waitTime * 1)
 * MCI Mode:    survivalProbability = 1 - (severity / 10)
 *              priorityScore = survivalProbability / (severity + 1)
 *
 * @param {Object} patient
 * @param {boolean} isMCI
 * @returns {{ priorityScore: number, survivalProbability: number }}
 */
function calculatePriority(patient, isMCI) {
  const { severity, waitTime } = patient;

  if (isMCI) {
    const survivalProbability = calcSurvivalProbability(severity);
    const priorityScore = parseFloat(
      (survivalProbability / (severity + 1)).toFixed(6)
    );
    return { priorityScore, survivalProbability };
  } else {
    const priorityScore = severity * 2 + waitTime * 1;
    const survivalProbability = calcSurvivalProbability(severity);
    return { priorityScore, survivalProbability };
  }
}

module.exports = { calculatePriority, calcSurvivalProbability };
