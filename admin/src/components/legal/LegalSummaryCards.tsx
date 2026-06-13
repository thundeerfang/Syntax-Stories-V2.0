'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Grid,
  IconButton,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import PolicyRoundedIcon from '@mui/icons-material/PolicyRounded';
import DeleteForeverRoundedIcon from '@mui/icons-material/DeleteForeverRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import type { LegalPolicyKind, LegalPolicyRecord } from '@/lib/api/legalAdmin';
import { LEGAL_KIND_LABEL } from '@/lib/legal/legalLabels';
import { legalLiveViewPath } from '@/lib/legal/legalPaths';
import { LegalDocumentStatusBadge } from './LegalVersionBadge';

const KIND_ICONS: Record<LegalPolicyKind, typeof DescriptionRoundedIcon> = {
  terms: DescriptionRoundedIcon,
  privacy: PolicyRoundedIcon,
  udd: DeleteForeverRoundedIcon,
};

export function LegalSummaryCards({ policies }: { policies: LegalPolicyRecord[] }) {
  const theme = useTheme();

  const byKind = useMemo(() => {
    const map = new Map<LegalPolicyKind, LegalPolicyRecord>();
    for (const p of policies) map.set(p.kind, p);
    return map;
  }, [policies]);

  const kinds: LegalPolicyKind[] = ['terms', 'privacy', 'udd'];

  return (
    <Grid container spacing={3} sx={{ mb: 0.5 }}>
      {kinds.map((kind) => {
        const policy = byKind.get(kind);
        const Icon = KIND_ICONS[kind];
        const viewHref = policy ? legalLiveViewPath(kind, policy) : undefined;
        const liveVersion = policy?.publishedRevisionId ? policy.version : null;

        return (
          <Grid key={kind} size={{ xs: 12, md: 4 }}>
            <Card
              elevation={0}
              sx={{
                position: 'relative',
                height: '100%',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 2,
                bgcolor: 'background.paper',
              }}
            >
              {viewHref ? (
                <IconButton
                  component={Link}
                  href={viewHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  size="small"
                  aria-label={`Open ${LEGAL_KIND_LABEL[kind]} in new tab`}
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    zIndex: 2,
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 1.5,
                    bgcolor: 'background.paper',
                  }}
                >
                  <OpenInNewRoundedIcon fontSize="small" />
                </IconButton>
              ) : null}

              <CardActionArea
                component={viewHref ? Link : 'div'}
                href={viewHref}
                disabled={!viewHref}
                sx={{ height: '100%', alignItems: 'stretch' }}
              >
                <CardContent sx={{ p: 2.5, pr: viewHref ? 5.5 : 2.5, '&:last-child': { pb: 2.5 } }}>
                  <Stack direction="row" spacing={2} alignItems="flex-start">
                    <Box
                      sx={{
                        width: 44,
                        height: 44,
                        borderRadius: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        bgcolor: alpha(
                          theme.palette.primary.main,
                          theme.palette.mode === 'dark' ? 0.16 : 0.1
                        ),
                        color: 'primary.main',
                      }}
                    >
                      <Icon />
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                        {LEGAL_KIND_LABEL[kind]}
                      </Typography>
                      {policy ? (
                        <Stack
                          direction="row"
                          spacing={1}
                          flexWrap="wrap"
                          useFlexGap
                          alignItems="center"
                        >
                          {liveVersion != null ? (
                            <LegalDocumentStatusBadge status="published" version={liveVersion} />
                          ) : (
                            <LegalDocumentStatusBadge
                              status={policy.status}
                              version={policy.version || 1}
                            />
                          )}
                          {policy.publishedAt ? (
                            <Typography variant="caption" color="text.secondary">
                              {new Date(policy.publishedAt).toLocaleDateString()}
                            </Typography>
                          ) : null}
                        </Stack>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Not initialized — open Legal tab below
                        </Typography>
                      )}
                    </Box>
                  </Stack>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        );
      })}
    </Grid>
  );
}
