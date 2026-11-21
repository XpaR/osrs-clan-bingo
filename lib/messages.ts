export function completionMessage(teamName: string, tileName: string, points: number) {
  return `${teamName} completed ${tileName} (+${points}).`;
}

export function removalMessage(teamName: string, tileName: string) {
  return `${teamName} had their mark removed from ${tileName}.`;
}
