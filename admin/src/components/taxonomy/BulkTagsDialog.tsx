'use client';

import LabelRoundedIcon from '@mui/icons-material/LabelRounded';
import { BulkTaxonomyDialog } from '@/components/taxonomy/BulkTaxonomyDialog';

export function BulkTagsDialog(props: {
  open: boolean;
  onClose: () => void;
  saving: boolean;
  onSubmit: (csvText: string) => void | Promise<void>;
}) {
  return (
    <BulkTaxonomyDialog kind="tag" headerIcon={<LabelRoundedIcon color="primary" />} {...props} />
  );
}
