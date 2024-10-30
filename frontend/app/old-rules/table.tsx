import React from 'react';

interface TableProps {
  data: Array<{
    rule: string;
    grouping: string;
    description: string;
  }>;
}

const Table: React.FC<TableProps> = ({ data }) => {
  return (
    <div className="table">
      <table className="data-table">
        <tbody>
          <tr id="table-header">
            <td>Rule</td>
            <td>Actions</td>
            <td>Description</td>
          </tr>
          {data.map((item, index) => (
            <tr key={index}>
              <td>{item.rule}</td>
              <td>{item.grouping}</td>
              <td>{item.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
