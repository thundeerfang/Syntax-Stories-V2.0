"use client";

import { useState } from "react";

export function useSettingsEntityCrudState<T>() {
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form, setForm] = useState<T | null>(null);
  const [initialForm, setInitialForm] = useState<T | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [removeConfirmIndex, setRemoveConfirmIndex] = useState<number | null>(
    null,
  );

  const openCreate = (defaults: T) => {
    setEditingIndex(null);
    setForm(defaults);
    setInitialForm(defaults);
    setFieldErrors({});
    setDialogOpen(true);
  };

  const openEdit = (index: number, current: T) => {
    setEditingIndex(index);
    setForm(current);
    setInitialForm(current);
    setFieldErrors({});
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingIndex(null);
    setFieldErrors({});
  };

  return {
    saving,
    setSaving,
    dialogOpen,
    setDialogOpen,
    editingIndex,
    setEditingIndex,
    form,
    setForm,
    initialForm,
    setInitialForm,
    fieldErrors,
    setFieldErrors,
    removeConfirmIndex,
    setRemoveConfirmIndex,
    openCreate,
    openEdit,
    closeDialog,
  };
}
