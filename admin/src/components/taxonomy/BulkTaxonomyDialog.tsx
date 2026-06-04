'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DragEvent, ReactNode } from 'react';
import {
  Box,
  Button,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import EditNoteRoundedIcon from '@mui/icons-material/EditNoteRounded';
import UploadFileRoundedIcon from '@mui/icons-material/UploadFileRounded';
import { AdminSplitPreviewDialog } from '@/components/ui/AdminSplitPreviewDialog';
import { AdminFeedbackMessage } from '@/components/ui/AdminFeedbackMessage';
import { AdminTabs } from '@/components/ui/AdminTabs';
import {
  BULK_TAXONOMY_MAX,
  downloadTaxonomyCsvTemplate,
  isTaxonomyCsvFile,
  manualLinesToTaxonomyCsv,
  parseTaxonomyCsv,
  taxonomyManualPlaceholder,
  validTaxonomyRows,
  type TaxonomyKind,
} from '@/lib/taxonomy/parseTaxonomyCsv';

const INPUT_TABS = [
  { label: 'Upload CSV', icon: UploadFileRoundedIcon },
  { label: 'Manual input', icon: EditNoteRoundedIcon },
] as const;

const KIND_CONFIG: Record<
  TaxonomyKind,
  { title: string; entity: string; entityCap: string; headerIcon: ReactNode }
> = {
  category: {
    title: 'Bulk add categories',
    entity: 'categories',
    entityCap: 'Categories',
    headerIcon: null,
  },
  tag: {
    title: 'Bulk add tags',
    entity: 'tags',
    entityCap: 'Tags',
    headerIcon: null,
  },
};

export function BulkTaxonomyDialog({
  kind,
  open,
  onClose,
  saving,
  onSubmit,
  headerIcon,
}: {
  kind: TaxonomyKind;
  open: boolean;
  onClose: () => void;
  saving: boolean;
  onSubmit: (csvText: string) => void | Promise<void>;
  headerIcon: ReactNode;
}) {
  const theme = useTheme();
  const config = KIND_CONFIG[kind];
  const inputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState(0);
  const [fileName, setFileName] = useState<string | null>(null);
  const [uploadedCsv, setUploadedCsv] = useState('');
  const [manualText, setManualText] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const csvText = tab === 0 ? uploadedCsv : manualLinesToTaxonomyCsv(manualText);

  const { rows, parseError } = useMemo(
    () => (csvText ? parseTaxonomyCsv(csvText, kind) : { rows: [], parseError: null }),
    [csvText, kind]
  );
  const validRows = useMemo(() => validTaxonomyRows(rows), [rows]);
  const skippedCount = rows.length - validRows.length;

  useEffect(() => {
    if (open) {
      setTab(0);
      setFileName(null);
      setUploadedCsv('');
      setManualText('');
      setLocalError(null);
      setDragOver(false);
    }
  }, [open]);

  async function onPickFile(file: File | null) {
    setLocalError(null);
    if (!file) return;
    if (!isTaxonomyCsvFile(file)) {
      setLocalError('Upload a .csv file only.');
      setFileName(null);
      setUploadedCsv('');
      return;
    }
    if (file.size > 256 * 1024) {
      setLocalError('CSV file is too large (max 256 KB).');
      return;
    }
    try {
      const text = await file.text();
      setFileName(file.name);
      setUploadedCsv(text);
      setTab(0);
    } catch {
      setLocalError('Could not read the CSV file.');
      setFileName(null);
      setUploadedCsv('');
    }
  }

  function onDragOver(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!saving) setDragOver(true);
  }

  function onDragLeave(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (saving) return;
    void onPickFile(e.dataTransfer.files?.[0] ?? null);
  }

  function handleSubmit() {
    setLocalError(null);
    if (!csvText.trim()) {
      setLocalError(tab === 0 ? 'Upload a CSV file first.' : `Add at least one ${config.entity.slice(0, -1)} line.`);
      return;
    }
    if (parseError) {
      setLocalError(parseError);
      return;
    }
    if (validRows.length === 0) {
      setLocalError(`No valid ${config.entity} to add.`);
      return;
    }
    void onSubmit(csvText);
  }

  const dropZoneSx = {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    p: 2,
    m: 1.5,
    borderRadius: 2,
    borderStyle: 'dashed',
    borderWidth: 2,
    textAlign: 'center' as const,
    transition: 'border-color 0.15s ease, background-color 0.15s ease',
    borderColor: dragOver ? 'primary.main' : 'divider',
    bgcolor: dragOver
      ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.14 : 0.1)
      : alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.06 : 0.03),
  };

  const feedback = (
    <>
      {localError ? (
        <AdminFeedbackMessage severity="error" message={localError} onClose={() => setLocalError(null)} />
      ) : null}
      {parseError ? <AdminFeedbackMessage severity="warning" message={parseError} /> : null}
      {skippedCount > 0 && !parseError ? (
        <AdminFeedbackMessage
          severity="warning"
          message={`${skippedCount} row${skippedCount === 1 ? '' : 's'} skipped (duplicate slug or missing name).`}
        />
      ) : null}
    </>
  );

  const tabInputPanel =
    tab === 0 ? (
      <Stack spacing={1.5} sx={{ p: 1.5 }}>
        <Box onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop} sx={dropZoneSx}>
          <UploadFileRoundedIcon sx={{ fontSize: 36, color: 'primary.main', mb: 1 }} />
          <Typography variant="body2" fontWeight={600}>
            {fileName ?? 'Drag & drop .csv here'}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
            Template format only · up to {BULK_TAXONOMY_MAX} rows
          </Typography>
        </Box>
        <Button
          variant="contained"
          fullWidth
          startIcon={<UploadFileRoundedIcon />}
          onClick={() => inputRef.current?.click()}
          disabled={saving}
        >
          Upload file
        </Button>
        <Button
          variant="outlined"
          fullWidth
          startIcon={<DownloadRoundedIcon />}
          onClick={() => downloadTaxonomyCsvTemplate(kind)}
          disabled={saving}
        >
          Download template
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          hidden
          onChange={(e) => {
            void onPickFile(e.target.files?.[0] ?? null);
            e.target.value = '';
          }}
        />
      </Stack>
    ) : (
      <TextField
        value={manualText}
        onChange={(e) => {
          setManualText(e.target.value);
          setLocalError(null);
        }}
        disabled={saving}
        multiline
        fullWidth
        minRows={12}
        placeholder={taxonomyManualPlaceholder(kind)}
        variant="standard"
        InputProps={{
          disableUnderline: true,
          sx: {
            px: 1.5,
            py: 1.5,
            fontFamily: 'ui-monospace, monospace',
            fontSize: '0.8125rem',
            alignItems: 'flex-start',
          },
        }}
      />
    );

  const previewContent =
    validRows.length === 0 ? (
      <Box sx={{ p: 2, minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Typography variant="body2" color="text.secondary" textAlign="center">
          {tab === 0 ? `Upload a CSV to preview ${config.entity}.` : `Type ${config.entity} to preview.`}
        </Typography>
      </Box>
    ) : (
      <Table size="small" stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Slug</TableCell>
            <TableCell align="right">Sort</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {validRows.map((row) => (
            <TableRow key={`${row.line}-${row.slugPreview}`}>
              <TableCell>{row.name}</TableCell>
              <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8125rem' }}>{row.slugPreview}</TableCell>
              <TableCell align="right">{row.sortOrder}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );

  return (
    <AdminSplitPreviewDialog
      open={open}
      onClose={onClose}
      title={config.title}
      headerIcon={headerIcon}
      maxWidth="md"
      feedback={feedback}
      inputLabel={tab === 0 ? 'CSV upload' : 'Manual input'}
      inputHint={
        tab === 0 ? (
          <>Upload a .csv file or switch to manual input.</>
        ) : (
          <>
            One line per {config.entity.slice(0, -1)}:{' '}
            <strong>name, description, sortOrder, slug</strong> (slug optional)
          </>
        )
      }
      inputPanel={
        <AdminTabs tabs={[...INPUT_TABS]} value={tab} onChange={setTab} panelSx={{ pt: 0 }}>
          {tabInputPanel}
        </AdminTabs>
      }
      previewTitle="Preview"
      previewCount={validRows.length}
      previewContent={previewContent}
      primaryButton={{
        label:
          validRows.length > 0
            ? `Add ${validRows.length} ${config.entity}`
            : `Add ${config.entity}`,
        disabled: saving || validRows.length === 0 || Boolean(parseError),
        loading: saving,
        onClick: handleSubmit,
      }}
      secondaryButton={{ label: 'Cancel', onClick: onClose, disabled: saving }}
    />
  );
}
