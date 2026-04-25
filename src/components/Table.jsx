import EmptyState from "./EmptyState";

const Table = ({ columns, rows, emptyState }) => {
  if (!rows || rows.length === 0) {
    return (
      emptyState || (
        <EmptyState icon="📋" title="No records found" sub="Nothing here yet." />
      )
    );
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key}>{column.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || `${row.memberId}-${row.date}-${row.entryTime}`}>
              {columns.map((column) => (
                <td key={column.key} className={column.mono ? "mono" : ""}>
                  {column.render
                    ? column.render(row[column.key], row)
                    : row[column.key] ?? "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
