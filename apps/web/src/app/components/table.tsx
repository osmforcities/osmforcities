import React from "react";

export interface Column<T> {
  title: string;
  dataIndex: keyof T;
  // TODO - Fix type of render function
  render?: any;
  align?: "left" | "center" | "right";
}

type TableProps<T> = {
  columns: Column<T>[];
  data: T[];
};

const Table = <T extends Record<string, any>>({
  columns,
  data,
}: TableProps<T>) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            {columns.map(({ title, align }, index) => (
              <th
                key={index}
                className={`border border-gray-300 px-4 py-2 text-${
                  align || "left"
                }`}
              >
                {title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((record, rowIndex) => (
            <tr key={rowIndex} className="hover:bg-gray-50">
              {columns.map(({ dataIndex, render, align }, columnIndex) => {
                const value = record[dataIndex];
                return (
                  <td
                    key={columnIndex}
                    className={`border border-gray-300 px-4 py-2 text-${
                      align || "left"
                    }`}
                  >
                    {render ? render(value, record) : value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Table;
