import type { SvgIconComponent } from '@mui/icons-material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import BookRoundedIcon from '@mui/icons-material/BookRounded';
import CreditCardRoundedIcon from '@mui/icons-material/CreditCardRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import HelpOutlineRoundedIcon from '@mui/icons-material/HelpOutlineRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import LanguageRoundedIcon from '@mui/icons-material/LanguageRounded';
import LayersRoundedIcon from '@mui/icons-material/LayersRounded';
import LockRoundedIcon from '@mui/icons-material/LockRounded';
import MessageRoundedIcon from '@mui/icons-material/MessageRounded';
import NotificationsRoundedIcon from '@mui/icons-material/NotificationsRounded';
import PeopleAltRoundedIcon from '@mui/icons-material/PeopleAltRounded';
import ReceiptLongRoundedIcon from '@mui/icons-material/ReceiptLongRounded';
import SecurityRoundedIcon from '@mui/icons-material/SecurityRounded';
import SentimentSatisfiedAltRoundedIcon from '@mui/icons-material/SentimentSatisfiedAltRounded';
import SettingsRoundedIcon from '@mui/icons-material/SettingsRounded';
import SupportRoundedIcon from '@mui/icons-material/SupportRounded';
import BoltRoundedIcon from '@mui/icons-material/BoltRounded';
import type { HelpIconKey } from './helpIcons';
import { normalizeHelpIconKey } from './helpIcons';

const GLYPHS: Record<HelpIconKey, SvgIconComponent> = {
  'circle-help': HelpOutlineRoundedIcon,
  sparkles: AutoAwesomeRoundedIcon,
  smile: SentimentSatisfiedAltRoundedIcon,
  layers: LayersRoundedIcon,
  'credit-card': CreditCardRoundedIcon,
  'user-plus': PeopleAltRoundedIcon,
  receipt: ReceiptLongRoundedIcon,
  mail: EmailRoundedIcon,
  'message-circle': MessageRoundedIcon,
  'life-buoy': SupportRoundedIcon,
  'book-open': BookRoundedIcon,
  shield: SecurityRoundedIcon,
  settings: SettingsRoundedIcon,
  bell: NotificationsRoundedIcon,
  key: KeyRoundedIcon,
  lock: LockRoundedIcon,
  globe: LanguageRoundedIcon,
  zap: BoltRoundedIcon,
};

export function HelpIconGlyph({
  name,
  fontSize = 'small',
}: Readonly<{ name: string | undefined | null; fontSize?: 'small' | 'inherit' | 'medium' }>) {
  const key = normalizeHelpIconKey(name);
  const Icon = GLYPHS[key];
  return <Icon fontSize={fontSize} />;
}
