'use client';

import Grid from '@mui/material/Grid2';
import {
  Box,
  Card,
  CardContent,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import LinkOffRoundedIcon from '@mui/icons-material/LinkOffRounded';
import { PROVIDER_ICONS } from '@/components/icons/SocialProviderIcons';

export const OAUTH_PROVIDER_CONFIG = [
  { flag: 'isGoogleAccount', id: 'google', label: 'Google' },
  { flag: 'isGitAccount', id: 'github', label: 'GitHub' },
  { flag: 'isFacebookAccount', id: 'facebook', label: 'Facebook' },
  { flag: 'isXAccount', id: 'x', label: 'X' },
  { flag: 'isDiscordAccount', id: 'discord', label: 'Discord' },
  { flag: 'isTwitchAccount', id: 'twitch', label: 'Twitch' },
] as const;

type OAuthFlags = Record<string, boolean>;

export function UserOAuthBadges({ oauth }: { oauth: OAuthFlags }) {
  const theme = useTheme();
  const linkedCount = OAUTH_PROVIDER_CONFIG.filter((p) => oauth[p.flag]).length;

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        {linkedCount === 0
          ? 'No OAuth providers linked to this account.'
          : `${linkedCount} of ${OAUTH_PROVIDER_CONFIG.length} providers linked`}
      </Typography>

      <Grid container spacing={1.5}>
        {OAUTH_PROVIDER_CONFIG.map((provider) => {
          const linked = Boolean(oauth[provider.flag]);
          const Icon = PROVIDER_ICONS[provider.id];

          return (
            <Grid key={provider.flag} size={{ xs: 6, sm: 4, md: 4 }}>
              <Card
                elevation={0}
                sx={{
                  height: '100%',
                  border: '2px solid',
                  borderColor: linked ? 'primary.main' : 'divider',
                  borderStyle: linked ? 'solid' : 'dashed',
                  borderRadius: 2,
                  bgcolor: linked
                    ? alpha(theme.palette.primary.main, 0.06)
                    : alpha(theme.palette.action.hover, 0.04),
                  transition: 'border-color 0.15s ease, background-color 0.15s ease',
                }}
              >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Stack spacing={1.25} alignItems="flex-start">
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 44,
                        height: 44,
                        borderRadius: 1.5,
                        border: '1px solid',
                        borderColor: 'divider',
                        bgcolor: 'background.paper',
                        opacity: linked ? 1 : 0.55,
                        '& svg': {
                          width: provider.id === 'twitch' ? 26 : 24,
                          height: provider.id === 'twitch' ? 26 : 24,
                          display: 'block',
                        },
                        '& img': { width: 26, height: 26, objectFit: 'contain' },
                      }}
                    >
                      {Icon ? <Icon /> : null}
                    </Box>

                    <Box sx={{ minWidth: 0, width: '100%' }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>
                        {provider.label}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.25 }}>
                        {linked ? (
                          <CheckCircleRoundedIcon
                            sx={{ fontSize: 16, color: 'success.main' }}
                            aria-hidden
                          />
                        ) : (
                          <LinkOffRoundedIcon
                            sx={{ fontSize: 16, color: 'text.disabled' }}
                            aria-hidden
                          />
                        )}
                        <Typography
                          variant="caption"
                          fontWeight={600}
                          color={linked ? 'success.main' : 'text.secondary'}
                        >
                          {linked ? 'Linked' : 'Not linked'}
                        </Typography>
                      </Stack>
                    </Box>
                  </Stack>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );
}
