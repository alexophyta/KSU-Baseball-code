/**
 * Determines the current season start date.
 * Season starts July 15 each year.
 */
export function getCurrentSeasonStart(): string {
  const now = new Date();
  const year = now.getFullYear();
  const seasonStart = new Date(year, 6, 15); // July 15
  
  if (now < seasonStart) {
    // We're before July 15 this year, so season started last July 15
    return `${year - 1}-07-15`;
  }
  return `${year}-07-15`;
}
