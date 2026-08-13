export default function DataTable({ columns, rows }) {
  return (
    <div className="table-container">
      <table>
        <thead>
          <tr>
            {columns.map((col, i) => <th key={i}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length} className="empty-state">No data available</td></tr>
          ) : (
            rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => <td key={j}>{cell}</td>)}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
