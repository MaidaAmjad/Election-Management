import { useState } from 'react';
import toast from 'react-hot-toast';
import Button from '../ui/Button';
import {
  exportResultsToCsv,
  exportResultsToExcel,
  exportResultsToPdf,
} from '../../utils/exportResults';

export default function ResultsExportMenu({ exportPayload, disabled }) {
  const [exporting, setExporting] = useState(false);

  async function runExport(fn, label) {
    if (!exportPayload || disabled) return;
    setExporting(true);
    try {
      fn(exportPayload);
      toast.success(`${label} downloaded.`);
    } catch (err) {
      toast.error(err.message ?? `Could not export ${label}.`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled || exporting}
        onClick={() => runExport(exportResultsToPdf, 'PDF')}
      >
        PDF
      </Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled || exporting}
        onClick={() => runExport(exportResultsToCsv, 'CSV')}
      >
        CSV
      </Button>
      <Button
        variant="secondary"
        size="sm"
        disabled={disabled || exporting}
        isLoading={exporting}
        onClick={() => runExport(exportResultsToExcel, 'Excel')}
      >
        Excel
      </Button>
    </div>
  );
}
