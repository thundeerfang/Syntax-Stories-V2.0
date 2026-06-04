'use client';

import { useEffect, useMemo, useState } from 'react';
import { Box, Stack, TextField, Typography } from '@mui/material';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import LabelRoundedIcon from '@mui/icons-material/LabelRounded';
import { AdminDialog } from '@/components/ui/AdminDialog';
import { previewSlugFromDisplayName } from '@/lib/slug/slugifyDisplayName';

export type TaxonomyFormValues = {
  name: string;
  description: string;
  sortOrder: string;
};

const EMPTY: TaxonomyFormValues = {
  name: '',
  description: '',
  sortOrder: '0',
};

export function BlogTaxonomyFormDialog({
  open,
  onClose,
  kind,
  mode,
  initial,
  saving,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  kind: 'category' | 'tag';
  mode: 'create' | 'edit';
  initial?: Partial<TaxonomyFormValues> & { slug?: string };
  saving: boolean;
  onSubmit: (values: TaxonomyFormValues) => void | Promise<void>;
}) {
  const [values, setValues] = useState<TaxonomyFormValues>(EMPTY);

  useEffect(() => {
    if (!open) return;
    setValues({
      name: initial?.name ?? '',
      description: initial?.description ?? '',
      sortOrder: initial?.sortOrder ?? '0',
    });
  }, [open, initial?.name, initial?.description, initial?.sortOrder]);

  const slugPreview = useMemo(
    () => (mode === 'create' && values.name.trim() ? previewSlugFromDisplayName(values.name) : ''),
    [mode, values.name]
  );

  const title =
    mode === 'create'
      ? kind === 'category'
        ? 'Add category'
        : 'Add tag'
      : kind === 'category'
        ? 'Edit category'
        : 'Edit tag';

  const Icon = kind === 'category' ? FolderRoundedIcon : LabelRoundedIcon;

  return (
    <AdminDialog
      open={open}
      onClose={onClose}
      title={title}
      headerIcon={<Icon color="primary" />}
      maxWidth="sm"
      primaryButton={{
        label: mode === 'create' ? 'Create' : 'Save',
        disabled: saving || !values.name.trim(),
        loading: saving,
        onClick: () => void onSubmit(values),
      }}
      secondaryButton={{ label: 'Cancel', onClick: onClose, disabled: saving }}
    >
      <Stack spacing={2}>
        {mode === 'edit' && initial?.slug ? (
          <Typography variant="body2" color="text.secondary">
            Slug{' '}
            <Box component="span" fontFamily="monospace" fontWeight={600}>
              {initial.slug}
            </Box>{' '}
            is set automatically and cannot be changed.
          </Typography>
        ) : null}
        {mode === 'create' && slugPreview ? (
          <Typography variant="body2" color="text.secondary">
            URL slug will be{' '}
            <Box component="span" fontFamily="monospace" fontWeight={600}>
              {slugPreview}
            </Box>
            {' '}(unique suffix added if needed)
          </Typography>
        ) : null}
        <TextField
          label="Display name"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          disabled={saving}
          fullWidth
          size="small"
          required
        />
        <TextField
          label="Description"
          value={values.description}
          onChange={(e) => setValues((v) => ({ ...v, description: e.target.value }))}
          disabled={saving}
          multiline
          minRows={2}
          fullWidth
          size="small"
        />
        <TextField
          label="Sort order"
          type="number"
          value={values.sortOrder}
          onChange={(e) => setValues((v) => ({ ...v, sortOrder: e.target.value }))}
          disabled={saving}
          fullWidth
          size="small"
        />
      </Stack>
    </AdminDialog>
  );
}
