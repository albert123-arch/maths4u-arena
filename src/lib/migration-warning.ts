const seriesTableNames = [
  "StudentAccount",
  "Series",
  "SeriesRound",
  "SeriesRegistration",
  "SeriesScore",
];

export function isStudentSeriesMigrationError(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";

  if (!message) {
    return false;
  }

  const normalized = message.toLowerCase();

  return (
    seriesTableNames.some((tableName) => normalized.includes(tableName.toLowerCase())) ||
    normalized.includes("doesn't exist") ||
    normalized.includes("does not exist") ||
    normalized.includes("unknown column") ||
    normalized.includes("studentaccountid")
  );
}
