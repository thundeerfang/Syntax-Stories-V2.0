'use client';

import { Card, CardContent, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from '@mui/material';
import {
  CATEGORY_URL_MAP,
  DEPLOY_TOPOLOGY,
  REQUEST_FLOW,
} from '@/lib/documentation/apiContracts';
import { getDocsAppUrl } from '@/lib/documentation/docsAppUrl';

export function DocumentationArchitecturePanel() {
  const docsAppUrl = getDocsAppUrl();

  return (
    <Stack spacing={2}>
      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Request flow
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            component="pre"
            sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.8125rem' }}
          >
            {REQUEST_FLOW}
          </Typography>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Deploy topology
          </Typography>
          <Stack spacing={0.75} component="ul" sx={{ pl: 2.5, m: 0 }}>
            {Object.entries(DEPLOY_TOPOLOGY).map(([key, value]) => (
              <Typography key={key} variant="body2" color="text.secondary" component="li">
                <strong>{key}</strong>: {value}
              </Typography>
            ))}
          </Stack>
          {docsAppUrl ? (
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.5 }}>
              Docs webapp URL: {docsAppUrl}
            </Typography>
          ) : null}
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <CardContent>
          <Typography variant="subtitle1" fontWeight={700} gutterBottom>
            Categories &amp; URLs
          </Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Category</TableCell>
                <TableCell>Public path</TableCell>
                <TableCell>Readers</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {CATEGORY_URL_MAP.map((row) => (
                <TableRow key={row.category}>
                  <TableCell>
                    <code>{row.category}</code>
                  </TableCell>
                  <TableCell>
                    <code>{row.publicPath}</code>
                  </TableCell>
                  <TableCell>{row.readers}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </Stack>
  );
}
