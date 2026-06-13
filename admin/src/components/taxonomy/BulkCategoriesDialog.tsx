'use client';

import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import { BulkTaxonomyDialog } from '@/components/taxonomy/BulkTaxonomyDialog';

export function BulkCategoriesDialog(props: {
  open: boolean;
  onClose: () => void;
  saving: boolean;
  onSubmit: (csvText: string) => void | Promise<void>;
}) {
  return (
    <BulkTaxonomyDialog
      kind="category"
      headerIcon={<FolderRoundedIcon color="primary" />}
      {...props}
    />
  );
}
