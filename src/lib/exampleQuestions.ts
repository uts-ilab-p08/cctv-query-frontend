/**
 * Example questions shown on the landing and in empty states. The first three were asked
 * of the running system; the rest map to activities MEVA annotates (person_exits_vehicle,
 * person_talks_on_phone, person_abandons_package), so the index can actually answer them.
 */
export const EXAMPLE_QUESTIONS = [
  "Did someone carry a heavy object in this scene?",
  "Did anyone open a car trunk in the school parking lot?",
  "Was there a vehicle that turned right in the school parking lot?",
  "Did anyone get out of a vehicle at the bus stop?",
  "Was someone talking on the phone near the parked cars?",
  "Did anyone leave a bag behind?",
] as const;
