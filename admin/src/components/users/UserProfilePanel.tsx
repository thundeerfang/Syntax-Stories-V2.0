'use client';

import type { ReactNode } from 'react';
import Grid from '@mui/material/Grid2';
import {
  Box,
  Card,
  CardContent,
  Chip,
  Link as MuiLink,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import CodeRoundedIcon from '@mui/icons-material/CodeRounded';
import ComputerRoundedIcon from '@mui/icons-material/ComputerRounded';
import DescriptionRoundedIcon from '@mui/icons-material/DescriptionRounded';
import FolderRoundedIcon from '@mui/icons-material/FolderRounded';
import GitHubIcon from '@mui/icons-material/GitHub';
import SchoolRoundedIcon from '@mui/icons-material/SchoolRounded';
import WorkRoundedIcon from '@mui/icons-material/WorkRounded';
import type { AdminUserDetail, AdminUserProfile } from '@/admin';
import { UserDetailEmptySectionCard } from '@/components/users/UserDetailEmptySectionCard';
import { emailVerificationDisplay } from '@/lib/users/emailVerificationLabel';
import { resolveProfileMediaUrl } from '@/lib/users/resolveProfileMediaUrl';

const EMPTY_PROFILE: AdminUserProfile = {
  profileImg: null,
  profileImgAlt: null,
  coverBanner: null,
  coverBannerAlt: null,
  gender: null,
  job: null,
  profileLocation: null,
  bio: null,
  portfolioUrl: null,
  linkedin: null,
  instagram: null,
  github: null,
  youtube: null,
  stackAndTools: [],
  workExperiences: [],
  education: [],
  certifications: [],
  projects: [],
  openSourceContributions: [],
  mySetup: [],
  blogStreakMode: 'daily',
  profileUpdatedAt: null,
  referralCode: null,
  referralSource: null,
  referredAt: null,
  blogRespectReceivedCount: 0,
  readStreakLongest: 0,
};

function ListBlock({ children }: { children: ReactNode }) {
  return <Stack spacing={1.5}>{children}</Stack>;
}

function ItemBox({ children }: { children: ReactNode }) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: 1.5,
        borderRadius: 1.5,
        bgcolor: alpha(theme.palette.primary.main, 0.04),
        border: '1px solid',
        borderColor: 'divider',
      }}
    >
      {children}
    </Box>
  );
}

export function UserProfilePanel({ user }: { user: AdminUserDetail }) {
  const theme = useTheme();
  const p: AdminUserProfile = user.profile ?? EMPTY_PROFILE;
  const emailDisplay = emailVerificationDisplay(user);
  const coverSrc = resolveProfileMediaUrl(p.coverBanner, user.username);
  const avatarSrc = resolveProfileMediaUrl(p.profileImg ?? user.profileImg, user.username);

  return (
    <Stack spacing={2}>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
        <Box
          sx={{
            height: { xs: 100, sm: 140 },
            bgcolor: alpha(theme.palette.primary.main, 0.12),
            backgroundImage: coverSrc ? `url(${coverSrc})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
        <CardContent sx={{ pt: 0, '&:last-child': { pb: 2.5 } }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'flex-end' }} sx={{ mt: -4 }}>
            <Box
              component="img"
              src={avatarSrc}
              alt={user.fullName}
              sx={{
                width: 88,
                height: 88,
                borderRadius: 2,
                border: '3px solid',
                borderColor: 'background.paper',
                objectFit: 'cover',
                bgcolor: 'background.default',
              }}
            />
            <Box sx={{ flex: 1, minWidth: 0, pt: { xs: 0, sm: 5 } }}>
              <Typography variant="h6" fontWeight={800}>
                {user.fullName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                @{user.username} · {user.email}
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mt: 1 }}>
                <Chip
                  size="small"
                  color={emailDisplay.verified ? 'success' : 'warning'}
                  label={emailDisplay.label}
                />
                {p.job ? <Chip size="small" variant="outlined" label={p.job} /> : null}
                {p.profileLocation ? (
                  <Chip size="small" variant="outlined" label={p.profileLocation} />
                ) : null}
              </Stack>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <UserDetailEmptySectionCard
            title="Bio"
            icon={<DescriptionRoundedIcon />}
            emptyMessage="No bio yet."
          >
            {p.bio?.trim() ? (
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {p.bio}
              </Typography>
            ) : null}
          </UserDetailEmptySectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <UserDetailEmptySectionCard
            title="Stack & tools"
            icon={<CodeRoundedIcon />}
            emptyMessage="No stack or tools listed."
          >
            {p.stackAndTools.length > 0 ? (
              <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75}>
                {p.stackAndTools.map((tool) => (
                  <Chip key={tool} label={tool} size="small" variant="outlined" />
                ))}
              </Stack>
            ) : null}
          </UserDetailEmptySectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <UserDetailEmptySectionCard
            title="Work experience"
            icon={<WorkRoundedIcon />}
            emptyMessage="No work experience added."
          >
            {p.workExperiences.length > 0 ? (
              <ListBlock>
                {p.workExperiences.map((item, i) => (
                  <ItemBox key={i}>
                    <Typography variant="body2" fontWeight={700}>
                      {String(item.jobTitle ?? 'Role')} · {String(item.company ?? 'Company')}
                    </Typography>
                    {item.location ? (
                      <Typography variant="caption" color="text.secondary">
                        {String(item.location)}
                      </Typography>
                    ) : null}
                    {item.description ? (
                      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
                        {String(item.description)}
                      </Typography>
                    ) : null}
                  </ItemBox>
                ))}
              </ListBlock>
            ) : null}
          </UserDetailEmptySectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <UserDetailEmptySectionCard
            title="Education"
            icon={<SchoolRoundedIcon />}
            emptyMessage="No education added."
          >
            {p.education.length > 0 ? (
              <ListBlock>
                {p.education.map((item, i) => (
                  <ItemBox key={i}>
                    <Typography variant="body2" fontWeight={700}>
                      {String(item.degree ?? 'Degree')} — {String(item.school ?? 'School')}
                    </Typography>
                    {item.fieldOfStudy ? (
                      <Typography variant="caption" color="text.secondary">
                        {String(item.fieldOfStudy)}
                      </Typography>
                    ) : null}
                  </ItemBox>
                ))}
              </ListBlock>
            ) : null}
          </UserDetailEmptySectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <UserDetailEmptySectionCard
            title="Projects"
            icon={<FolderRoundedIcon />}
            emptyMessage="No projects added."
          >
            {p.projects.length > 0 ? (
              <ListBlock>
                {p.projects.map((item, i) => (
                  <ItemBox key={i}>
                    <Typography variant="body2" fontWeight={700}>
                      {String(item.title ?? item.name ?? 'Project')}
                    </Typography>
                    {item.publicationUrl || item.url ? (
                      <MuiLink
                        href={String(item.publicationUrl ?? item.url)}
                        target="_blank"
                        rel="noopener noreferrer"
                        variant="caption"
                      >
                        View
                      </MuiLink>
                    ) : null}
                  </ItemBox>
                ))}
              </ListBlock>
            ) : null}
          </UserDetailEmptySectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <UserDetailEmptySectionCard
            title="GitHub repos"
            icon={<GitHubIcon />}
            emptyMessage="No GitHub repos linked."
          >
            {p.openSourceContributions.length > 0 ? (
              <ListBlock>
                {p.openSourceContributions.map((item, i) => (
                  <ItemBox key={i}>
                    <Typography variant="body2" fontWeight={700}>
                      {String(item.title ?? 'Repository')}
                    </Typography>
                    {item.repository ? (
                      <Typography variant="caption" color="text.secondary">
                        {String(item.repository)}
                      </Typography>
                    ) : null}
                  </ItemBox>
                ))}
              </ListBlock>
            ) : p.github?.trim() ? (
              <MuiLink href={p.github} target="_blank" rel="noopener noreferrer" variant="body2">
                {p.github}
              </MuiLink>
            ) : null}
          </UserDetailEmptySectionCard>
        </Grid>

        <Grid size={{ xs: 12, md: 6 }}>
          <UserDetailEmptySectionCard
            title="My setup"
            icon={<ComputerRoundedIcon />}
            emptyMessage="No setup items added."
          >
            {p.mySetup.length > 0 ? (
              <ListBlock>
                {p.mySetup.map((item, i) => (
                  <Typography key={i} variant="body2">
                    {String(item.label ?? 'Item')}
                    {item.productUrl ? ` — ${String(item.productUrl)}` : ''}
                  </Typography>
                ))}
              </ListBlock>
            ) : null}
          </UserDetailEmptySectionCard>
        </Grid>
      </Grid>
    </Stack>
  );
}
