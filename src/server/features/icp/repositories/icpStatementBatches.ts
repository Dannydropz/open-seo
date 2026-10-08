// D1 permits at most 100 bound values in one SQL statement. Each ICP
// statement row inserts five values, so keep each multi-row insert at 20 rows
// or fewer. Postgres accepts the same chunking inside its transaction.
export const ICP_STATEMENT_INSERT_BATCH_SIZE = 20;

export function chunkIcpStatements<T>(statements: readonly T[]): T[][] {
  return Array.from(
    { length: Math.ceil(statements.length / ICP_STATEMENT_INSERT_BATCH_SIZE) },
    (_, index) =>
      statements.slice(
        index * ICP_STATEMENT_INSERT_BATCH_SIZE,
        (index + 1) * ICP_STATEMENT_INSERT_BATCH_SIZE,
      ),
  );
}
