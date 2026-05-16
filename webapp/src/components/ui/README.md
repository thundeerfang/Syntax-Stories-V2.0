# UI components (`components/ui`)

App-wide primitives grouped by domain. Import from the root barrel or a subfolder:

```ts
import { Button, Dialog, FormDialog } from '@/components/ui';
import { HoverCard } from '@/components/ui/popover';
import { BlogWriteEditor } from '@/components/ui/editor';
```

## Folders

| Folder | Contents |
|--------|----------|
| [`button/`](./button/) | `buttons.tsx` — `Button`, `BlockShadowButton`, `GhostOutlineButton` |
| [`dialog/`](./dialog/) | `dialogs.tsx` (base `Dialog`) + `FormDialog`, `InfoSwiperDialog`, `ConfirmDialog` |
| [`form/`](./form/) | `FormInput`, `SearchField`, `ImageDropzone` |
| [`retro/`](./retro/) | `RetroCard`, `RetroBadge`, `RetroAccordion`, `RetroSortDropdown` |
| [`feedback/`](./feedback/) | `Skeleton`, `Tooltip`, `UiProcessingShield` |
| [`popover/`](./popover/) | `HoverCard`, link/mention/GIF popover cards |
| [`media/`](./media/) | `OptimizedRemoteImage`, `CropperKeyboardWrapper`, `GridBackground`, `SkillIconImage` |
| [`editor/`](./editor/) | `BlogWriteEditor`, `RichParagraphEditor`, `BottomToolbar`, `ProfileSectionAccordion` |
| [`layout/`](./layout/) | `Header`, `Tabs`, `FullWidthSegmentedControl` |
| [`lottie/`](./lottie/) | Lottie icon animations |

`retroui/` (sibling folder) holds lower-level form controls used by settings and dialogs.
