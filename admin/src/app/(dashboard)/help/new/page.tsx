'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackRoundedIcon from '@mui/icons-material/ArrowBackRounded';
import { createHelpArticle } from '@/lib/api';
import { useSessionStore } from '@/store/session';

export default function NewArticlePage() {
  const router = useRouter();
  const token = useSessionStore((s) => s.token);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [category, setCategory] = useState('general');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      router.replace('/login');
      return;
    }
    setErr(null);
    setLoading(true);
    try {
      const created = await createHelpArticle(token, {
        slug: slug.trim(),
        title: title.trim(),
        summary: summary.trim() || undefined,
        category: category.trim() || undefined,
      });
      router.replace(`/help/${created.id}/edit`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box className="mx-auto max-w-lg">
      <Button
        component={Link}
        href="/help"
        startIcon={<ArrowBackRoundedIcon />}
        size="small"
        className="mb-4"
        sx={{ color: 'text.secondary' }}
      >
        Articles
      </Button>
      <Typography variant="h4" component="h1" fontWeight={800} className="mb-6 tracking-tight">
        New help article
      </Typography>
      <Paper elevation={0} className="border border-[var(--color-border)] p-6" sx={{ borderColor: 'divider' }}>
        <Box component="form" onSubmit={submit}>
          <Stack spacing={3}>
            {err && <Alert severity="error">{err}</Alert>}
            <TextField
              label="Slug (URL)"
              required
              fullWidth
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="sign-in-troubleshooting"
              size="small"
            />
            <TextField label="Title" required fullWidth value={title} onChange={(e) => setTitle(e.target.value)} size="small" />
            <FormControl fullWidth size="small">
              <InputLabel id="article-category-label">Category</InputLabel>
              <Select
                labelId="article-category-label"
                label="Category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                <MenuItem value="general">general (help center)</MenuItem>
                <MenuItem value="documentation">documentation (/docs)</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Summary (optional)"
              fullWidth
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              size="small"
            />
            <Button type="submit" variant="contained" disabled={loading} className="self-start">
              {loading ? 'Creating…' : 'Create draft'}
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
