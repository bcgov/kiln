import React, { useState } from "react";
import { LogEntryDto } from "../types/form";
import {
  Tag,
  DataTable,
  TableContainer,
  Table,
  TableHead,
  TableRow,
  TableHeader,
  TableBody,
  TableCell,
  Button,
} from "carbon-components-react";
import { ChevronRight, ChevronDown } from "@carbon/icons-react";
import "../styles/LogsViewer.scss";

interface LogsViewerProps {
  logs: Record<string, LogEntryDto> | LogEntryDto[] | null;
  maxHeight?: string;
}

const LogsViewer: React.FC<LogsViewerProps> = ({
  logs,
  maxHeight = "300px",
}) => {
  const [showPreviousValues, setShowPreviousValues] = useState(false);

  // Compare old and new properties
  const renderPropertiesTable = (properties: any) => {
    if (!properties || (!properties.attributes && !properties.old)) {
      return null;
    }
    const allFields = new Set([
      ...(properties.attributes ? Object.keys(properties.attributes) : []),
      ...(properties.old ? Object.keys(properties.old) : []),
    ]);

    if (allFields.size === 0) {
      return null;
    }

    const tableData = Array.from(allFields).map((fieldKey) => ({
      id: fieldKey,
      field: fieldKey,
      oldValue: properties.old?.[fieldKey] || "",
      newValue: properties.attributes?.[fieldKey] || "",
      hasOldValue:
        properties.old &&
        Object.prototype.hasOwnProperty.call(properties.old, fieldKey),
      hasNewValue:
        properties.attributes &&
        Object.prototype.hasOwnProperty.call(properties.attributes, fieldKey),
    }));

    const headers = showPreviousValues
      ? [
          { key: "field", header: "Field" },
          { key: "oldValue", header: "Previous Value" },
          { key: "newValue", header: "New Value" },
        ]
      : [
          { key: "field", header: "Field" },
          { key: "newValue", header: "Current Value" },
        ];

    const hasOldValues = tableData.some((item) => item.hasOldValue);

    return (
      <div className="logs-viewer__properties-table">
        {hasOldValues && (
          <div className="logs-viewer__table-controls">
            <Button
              kind="ghost"
              size="sm"
              onClick={() => setShowPreviousValues(!showPreviousValues)}
              renderIcon={showPreviousValues ? ChevronDown : ChevronRight}
              iconDescription={
                showPreviousValues
                  ? "Hide previous values"
                  : "Show previous values"
              }
            >
              {showPreviousValues
                ? "Hide previous values"
                : "Show previous values"}
            </Button>
          </div>
        )}

        <DataTable
          rows={tableData}
          headers={headers}
          size="sm"
          render={({ headers, getHeaderProps, getTableProps }) => (
            <TableContainer>
              <Table {...getTableProps()}>
                <TableHead>
                  <TableRow>
                    {headers.map((header) => (
                      <TableHeader
                        {...getHeaderProps({ header })}
                        key={header.key}
                      >
                        {header.header}
                      </TableHeader>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {tableData.map((rowData) => (
                    <TableRow key={rowData.id}>
                      <TableCell>
                        <span className="logs-viewer__field-name">
                          {rowData.field}
                        </span>
                      </TableCell>
                      {showPreviousValues && (
                        <TableCell>
                          {rowData.hasOldValue ? (
                            <span className="logs-viewer__old-value">
                              {JSON.stringify(rowData.oldValue)}
                            </span>
                          ) : (
                            <span className="logs-viewer__no-value">—</span>
                          )}
                        </TableCell>
                      )}
                      <TableCell>
                        {rowData.hasNewValue ? (
                          <span className="logs-viewer__new-value">
                            {JSON.stringify(rowData.newValue)}
                          </span>
                        ) : (
                          <span className="logs-viewer__no-value">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        />
      </div>
    );
  };

  const renderLogs = () => {
    if (!logs) {
      return "No logs available";
    }
    let logEntries: LogEntryDto[] = [];
    if (Array.isArray(logs)) {
      if (logs.length === 0) {
        return "No logs available";
      }
      logEntries = logs;
    } else {
      logEntries = Object.values(logs);
      if (logEntries.length === 0) {
        return "No logs available";
      }
    }

    return (
      <div>
        {logEntries.map((log, index) => (
          <div key={log.id || index} className="logs-viewer__log-entry">
            <span>{log.description}</span>

            <div className="logs-viewer__metadata">
              <Tag type="gray" size="sm">
                {new Date(log.created_at).toLocaleString()}
              </Tag>
              <Tag type="blue" size="sm">
                {log.event}
              </Tag>
            </div>

            {log.properties && renderPropertiesTable(log.properties)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="logs-viewer">
      <div className="logs-viewer__header">Form Logs</div>
      <div className="logs-viewer__container" style={{ maxHeight }}>
        {renderLogs()}
      </div>
    </div>
  );
};

export default LogsViewer;
