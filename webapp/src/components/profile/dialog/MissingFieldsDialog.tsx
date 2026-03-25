'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Dialog } from '@/components/ui/Dialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { ParseCvMissingFieldKey, IncompleteItemHints } from '@/api/auth';
import { CompleteItemDialog, type CompleteItemDialogSection } from './CompleteItemDialog';
import { cn } from '@/lib/utils';

/** Settings page section id for each profile section (for deep link). Projects not from CV. */
const SECTION_TO_SETTINGS_ID: Record<CompleteItemDialogSection, string> = {
  workExperiences: 'work-experiences',
  education: 'education',
  certifications: 'certifications',
  projects: 'projects',
};

const FIELD_LABELS: Record<ParseCvMissingFieldKey, string> = {
  bio: 'Short bio',
  linkedin: 'LinkedIn URL',
  github: 'GitHub URL',
  stackAndTools: 'Tech stack (comma-separated)',
  workExperiences: 'Work experience',
  education: 'Education',
  certifications: 'Certifications',
};

const MISSING_FIELD_LABELS: Record<string, string> = {
  startDate: 'Start date',
  endDate: 'End date',
  employmentType: 'Employment type',
  locationType: 'Location type',
  issueDate: 'Issue date',
  publicationDate: 'Publication date',
  publisher: 'Publisher',
};

const SCALAR_FIELDS: ParseCvMissingFieldKey[] = ['bio', 'linkedin', 'github', 'stackAndTools'];
const ARRAY_FIELDS: ParseCvMissingFieldKey[] = ['workExperiences', 'education', 'certifications'];

export interface MissingFieldsDialogProps {
  open: boolean;
  onClose: () => void;
  missingFields: ParseCvMissingFieldKey[];
  incompleteItemHints?: IncompleteItemHints | null;
  /** Current profile arrays so we can show "Add fields" for incomplete items and pass initial values */
  currentProfile?: {
    workExperiences?: Array<Record<string, unknown>>;
    education?: Array<Record<string, unknown>>;
    certifications?: Array<Record<string, unknown>>;
    projects?: Array<Record<string, unknown>>;
  } | null;
  onSave: (values: Partial<Record<ParseCvMissingFieldKey, string | string[]>>) => Promise<void>;
  onCompleteItem: (section: CompleteItemDialogSection, index: number, values: Record<string, string>) => Promise<void>;
  settingsHref: string;
  /** When provided, "Edit in Settings" runs this (e.g. save pending CV data then navigate) instead of using a plain link. */
  onEditInSettings?: (section: CompleteItemDialogSection, index: number) => void | Promise<void>;
}

export function MissingFieldsDialog({
  open,
  onClose,
  missingFields,
  incompleteItemHints,
  currentProfile,
  onSave,
  onCompleteItem,
  settingsHref,
  onEditInSettings,
}: MissingFieldsDialogProps) {
  const [values, setValues] = useState<Partial<Record<ParseCvMissingFieldKey, string | string[]>>>({});
  const [saving, setSaving] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [completeDialogState, setCompleteDialogState] = useState<{
    section: CompleteItemDialogSection;
    index: number;
    title?: string;
    missing: string[];
    initialValues: Record<string, string>;
  } | null>(null);
  const [discardConfirmOpen, setDiscardConfirmOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setValues({});
    }
  }, [open, missingFields]);

  const handleChange = (key: ParseCvMissingFieldKey, value: string) => {
    if (key === 'stackAndTools') {
      const arr = value.split(',').map((s) => s.trim()).filter(Boolean);
      setValues((v) => ({ ...v, [key]: arr }));
    } else {
      setValues((v) => ({ ...v, [key]: value }));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload: Partial<Record<ParseCvMissingFieldKey, string | string[]>> = {};
      for (const k of SCALAR_FIELDS) {
        if (missingFields.includes(k) && values[k] !== undefined) {
          if (k === 'stackAndTools' && Array.isArray(values[k])) payload[k] = values[k] as string[];
          else if (k !== 'stackAndTools' && typeof values[k] === 'string') payload[k] = values[k] as string;
        }
      }
      await onSave(payload);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const scalarMissing = missingFields.filter((f) => SCALAR_FIELDS.includes(f));
  const arrayMissing = missingFields.filter((f) => ARRAY_FIELDS.includes(f));
  const hasIncompleteItems = !!incompleteItemHints && (
    (incompleteItemHints.education?.length ?? 0) +
    (incompleteItemHints.certifications?.length ?? 0) +
    (incompleteItemHints.workExperiences?.length ?? 0)
  ) > 0;
  const hasFilledScalar = scalarMissing.some((f) => (f === 'stackAndTools' ? (values[f] as string[] | undefined)?.length : (values[f] as string | undefined)?.trim()));
  const canSave = (scalarMissing.length === 0 || hasFilledScalar) && !hasIncompleteItems;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      titleId="missing-fields-dialog-title"
      panelClassName="max-w-lg"
    >
      <div className="space-y-4">
        <h2 id="missing-fields-dialog-title" className="text-sm font-black uppercase tracking-widest text-foreground">
          {missingFields.length} {missingFields.length === 1 ? 'field' : 'fields'} not found in your CV
        </h2>
        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
          Fill in what you can below. You can add the rest later in Settings.
        </p>

        {scalarMissing.length > 0 && (
          <div className="space-y-3">
            {scalarMissing.map((key) => (
              <div key={key}>
                <label className="block text-[10px] font-bold uppercase text-muted-foreground mb-1">
                  {FIELD_LABELS[key]}
                </label>
                {key === 'bio' ? (
                  <textarea
                    className="w-full min-h-[80px] px-3 py-2 border-2 border-border bg-card text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={key === 'bio' ? 'Tell us about yourself…' : ''}
                    value={(values[key] as string) ?? ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    maxLength={key === 'bio' ? 500 : undefined}
                  />
                ) : (
                  <input
                    type="text"
                    className="w-full px-3 py-2 border-2 border-border bg-card text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder={
                      key === 'linkedin' ? 'https://linkedin.com/in/username' :
                      key === 'github' ? 'https://github.com/username' :
                      'e.g. JavaScript, React, Node.js'
                    }
                    value={
                      key === 'stackAndTools'
                        ? (values[key] as string[] | undefined)?.join(', ') ?? ''
                        : (values[key] as string | undefined) ?? ''
                    }
                    onChange={(e) => handleChange(key, e.target.value)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {(() => {
          const hasIncompleteItems = incompleteItemHints && (
            (incompleteItemHints.education?.length ?? 0) +
            (incompleteItemHints.certifications?.length ?? 0) +
            (incompleteItemHints.workExperiences?.length ?? 0)
          ) > 0;
          const sections: { key: CompleteItemDialogSection; label: string; hints: Array<{ index: number; title?: string; missing: string[] }> }[] = [];
          if (incompleteItemHints?.education?.length) sections.push({ key: 'education', label: 'Education', hints: incompleteItemHints.education });
          if (incompleteItemHints?.certifications?.length) sections.push({ key: 'certifications', label: 'Certifications', hints: incompleteItemHints.certifications });
          if (incompleteItemHints?.workExperiences?.length) sections.push({ key: 'workExperiences', label: 'Work experience', hints: incompleteItemHints.workExperiences });

          const settingsSectionId = (k: CompleteItemDialogSection) => SECTION_TO_SETTINGS_ID[k];

          return (
            <>
              {hasIncompleteItems && (
                <div className="border-2 border-border bg-muted/10 p-3 space-y-3">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    Complete all required fields below before you can save. Use Add fields or Edit in Settings.
                  </p>
                  {sections.map(({ key, label, hints }) => (
                    <div key={key} className="space-y-2">
                      <span className="text-[10px] font-black uppercase text-foreground">{label}</span>
                      <ul className="space-y-1">
                        {hints.map((h) => {
                          const settingsUrl = `${settingsHref}?section=${settingsSectionId(key)}&edit=${h.index}`;
                          const openCompleteDialog = () => {
                            const arr = currentProfile?.[key] ?? [];
                            const item = arr[h.index] as Record<string, unknown> | undefined;
                            const initialValues: Record<string, string> = {};
                            h.missing.forEach((f) => { initialValues[f] = (item?.[f] != null ? String(item[f]) : '') || ''; });
                            setCompleteDialogState({ section: key, index: h.index, title: h.title, missing: h.missing, initialValues });
                            setCompleteDialogOpen(true);
                          };
                          return (
                            <li key={`${key}-${h.index}`} className="flex flex-wrap items-center gap-2 text-[10px]">
                              <span className="font-medium text-foreground">
                                {h.title ? `"${h.title}"` : `Item ${h.index + 1}`}: add {h.missing.map((m) => MISSING_FIELD_LABELS[m] ?? m).join(', ')}
                              </span>
                              <button
                                type="button"
                                onClick={openCompleteDialog}
                                className="px-2 py-1 border-2 border-border bg-card font-black text-[9px] uppercase hover:bg-muted/40"
                              >
                                Add fields
                              </button>
                              {onEditInSettings ? (
                                <button
                                  type="button"
                                  onClick={() => onEditInSettings(key, h.index)}
                                  className="px-2 py-1 border-2 border-border bg-primary text-primary-foreground font-black text-[9px] uppercase hover:bg-primary/90"
                                >
                                  Edit in Settings
                                </button>
                              ) : (
                                <Link
                                  href={settingsUrl}
                                  className="px-2 py-1 border-2 border-border bg-primary text-primary-foreground font-black text-[9px] uppercase hover:bg-primary/90 no-underline"
                                >
                                  Edit in Settings
                                </Link>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
              {arrayMissing.length > 0 && !hasIncompleteItems && (
                <div className="border-2 border-border bg-muted/10 p-3 space-y-2">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">Add these in Settings after saving:</p>
                  <ul className="list-disc list-inside text-[10px] font-medium text-foreground space-y-1">
                    {arrayMissing.map((key) => (
                      <li key={key}>{FIELD_LABELS[key]}</li>
                    ))}
                  </ul>
                  <Link href={settingsHref} className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-primary hover:underline">
                    Open Settings →
                  </Link>
                </div>
              )}
              {completeDialogState && (
                <CompleteItemDialog
                  open={completeDialogOpen}
                  onClose={() => { setCompleteDialogOpen(false); setCompleteDialogState(null); }}
                  section={completeDialogState.section}
                  itemTitle={completeDialogState.title}
                  missingFields={completeDialogState.missing}
                  initialValues={completeDialogState.initialValues}
                  onSave={async (vals) => {
                    await onCompleteItem(completeDialogState.section, completeDialogState.index, vals);
                    setCompleteDialogOpen(false);
                    setCompleteDialogState(null);
                  }}
                />
              )}
            </>
          );
        })()}

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={() => setDiscardConfirmOpen(true)}
            className="flex-1 px-4 py-2 border-2 border-border bg-card font-black text-[10px] uppercase tracking-widest hover:bg-muted/40"
          >
            Skip
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !canSave}
            title={hasIncompleteItems ? 'Complete all required fields above before saving.' : undefined}
            className={cn(
              'flex-1 px-4 py-2 border-2 border-border font-black text-[10px] uppercase tracking-widest',
              canSave && !saving
                ? 'bg-primary text-primary-foreground shadow-[3px_3px_0px_0px_var(--border)] hover:shadow-none hover:translate-x-0.5 hover:translate-y-0.5'
                : 'bg-muted text-muted-foreground cursor-not-allowed'
            )}
          >
            {saving ? 'Saving…' : hasIncompleteItems ? 'Save (complete required fields first)' : 'Save'}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={discardConfirmOpen}
        onClose={() => setDiscardConfirmOpen(false)}
        title="Discard CV upload?"
        message="The upload CV process will be discarded. Extracted data will not be saved to your profile."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        variant="danger"
        onConfirm={() => {
          onClose();
          setDiscardConfirmOpen(false);
        }}
      />
    </Dialog>
  );
}
