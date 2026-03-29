'use client';

import React, { useState, useEffect } from 'react';
import { Dialog } from '@/components/ui/Dialog';
import { cn } from '@/lib/utils';

const MISSING_FIELD_LABELS: Record<string, string> = {
  startDate: 'Start date (YYYY-MM)',
  endDate: 'End date (YYYY-MM)',
  employmentType: 'Employment type',
  locationType: 'Location type',
  issueDate: 'Issue date (YYYY-MM)',
  publicationDate: 'Publication date (YYYY-MM)',
  publisher: 'Publisher name',
};

export type CompleteItemDialogSection = 'workExperiences' | 'education' | 'certifications' | 'projects';

export interface CompleteItemDialogProps {
  open: boolean;
  onClose: () => void;
  section: CompleteItemDialogSection;
  itemTitle?: string;
  missingFields: string[];
  initialValues?: Record<string, string>;
  onSave: (values: Record<string, string>) => Promise<void>;
}

export function CompleteItemDialog({
  open,
  onClose,
  section,
  itemTitle,
  missingFields,
  initialValues = {},
  onSave,
}: Readonly<CompleteItemDialogProps>) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      const next: Record<string, string> = {};
      missingFields.forEach((f) => { next[f] = initialValues[f] ?? ''; });
      setValues(next);
    }
  }, [open, missingFields, initialValues]);

  const handleChange = (field: string, value: string) => {
    setValues((v) => ({ ...v, [field]: value }));
  };

  const handleSubmit = async () => {
    const trimmed: Record<string, string> = {};
    missingFields.forEach((f) => { trimmed[f] = (values[f] ?? '').trim(); });
    const allFilled = missingFields.every((f) => trimmed[f].length > 0);
    if (!allFilled) return;
    setSaving(true);
    try {
      await onSave(trimmed);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const canSave = missingFields.every((f) => (values[f] ?? '').trim().length > 0);

  return (
    <Dialog open={open} onClose={onClose} titleId="complete-item-dialog-title" panelClassName="max-w-md">
      <div className="space-y-4">
        <h2 id="complete-item-dialog-title" className="text-sm font-black uppercase tracking-widest text-foreground">
          Add missing fields {itemTitle ? `— ${itemTitle}` : ''}
        </h2>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Fill in the required fields below. Use YYYY-MM for dates (e.g. 2024-01).
        </p>
        <div className="space-y-3">
          {missingFields.map((field) => (
            <div key={field}>
              <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                {MISSING_FIELD_LABELS[field] ?? field}
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border-2 border-border bg-card text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={field.includes('Date') ? 'e.g. 2024-01' : ''}
                value={values[field] ?? ''}
                onChange={(e) => handleChange(field, e.target.value)}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 border-2 border-border bg-card font-black text-[10px] uppercase tracking-widest hover:bg-muted/40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || !canSave}
            className={cn(
              'flex-1 px-4 py-2 border-2 border-border font-black text-[10px] uppercase tracking-widest',
              canSave && !saving
                ? 'bg-primary text-primary-foreground shadow-[3px_3px_0px_0px_var(--border)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </Dialog>
  );
}
