'use client';

import { Box, Step, StepLabel, Stepper } from '@mui/material';

const STEP_LABELS = ['Verify email', 'Set password', 'Profile & role', 'Done'] as const;

export type AdminStepIndicatorProps = {
  activeStep: number;
};

export function AdminStepIndicator({ activeStep }: AdminStepIndicatorProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Stepper
        activeStep={activeStep}
        alternativeLabel
        sx={{ '& .MuiStepLabel-label': { fontSize: '0.7rem' } }}
      >
        {STEP_LABELS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}
