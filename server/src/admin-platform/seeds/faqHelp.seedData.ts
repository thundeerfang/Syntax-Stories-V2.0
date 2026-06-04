import type { HelpIconKey } from '../cms/help/help.icons.js';

export type FaqHelpSeedItem = {
  title: string;
  answer: string;
  icon: HelpIconKey;
};

/** Default FAQ content for /help — seeded via `npm run seed:faq`. */
export const FAQ_HELP_SEED: FaqHelpSeedItem[] = [
  {
    title: 'What is Syntax Stories?',
    icon: 'sparkles',
    answer:
      'Syntax Stories is a community platform for reading, writing, and sharing developer stories. Browse topics, join Squads, follow writers, and publish from **Write**.',
  },
  {
    title: 'How do I create an account?',
    icon: 'user-plus',
    answer:
      'Go to **/signup**, enter your email, and verify with the one-time code we send you. You can also sign up with an invite link.',
  },
  {
    title: 'How does email login work?',
    icon: 'mail',
    answer:
      'On **/login**, enter your email and request a code. Check your inbox (and spam), enter the OTP within the expiry window, and you will be signed in.',
  },
  {
    title: 'Can I sign in with Google or other providers?',
    icon: 'key',
    answer:
      'Yes — use the social buttons on **/login** or **/signup**. You will be redirected to the provider and returned when authorization completes.',
  },
  {
    title: 'I forgot my password — what do I do?',
    icon: 'lock',
    answer:
      'Use **Settings → Security** to reset your password, or request a fresh login code via email OTP on the login page.',
  },
  {
    title: 'How do I update my profile?',
    icon: 'settings',
    answer:
      'Open **/settings** or **/profile** to change display name, bio, avatar, and other public fields. Your public URL is **/u/your-username**.',
  },
  {
    title: 'How do I write and publish a blog post?',
    icon: 'book-open',
    answer:
      'Click **Write** or go to **/blogs/write**, add a title and markdown body, then publish. Your post lives at **/blogs/username/slug**.',
  },
  {
    title: 'What are topics and categories?',
    icon: 'layers',
    answer:
      '**Topics** are tags at **/topics**. **Categories** are broader groups at **/categories**. Both help readers discover your posts.',
  },
  {
    title: 'How do I follow a topic or writer?',
    icon: 'bell',
    answer:
      'On a topic page (**/topics/slug**) or profile (**/u/username**), use **Follow**. Your **Following** feed is at **/following**.',
  },
  {
    title: 'What is the Explore page?',
    icon: 'globe',
    answer:
      '**Explore** surfaces squads, topics, and content outside your usual feed — useful when you are new or want fresh inspiration.',
  },
  {
    title: 'How do bookmarks work?',
    icon: 'smile',
    answer:
      'While reading a post, save it to **Bookmarks** (**/bookmarks**). Saved posts stay in your library until you remove them.',
  },
  {
    title: 'What are bookmark groups?',
    icon: 'layers',
    answer:
      'Organize saves into groups inside **Bookmarks** — separate tutorials, references, and reading lists.',
  },
  {
    title: 'How do reposts work?',
    icon: 'zap',
    answer:
      'Reposting shares someone else’s post to your audience. View your repost history at **/reposts**.',
  },
  {
    title: 'What are Squads?',
    icon: 'user-plus',
    answer:
      'Squads are themed community spaces. Browse **/squads** or featured squads at **/squads/featured**.',
  },
  {
    title: 'How do I join a Squad?',
    icon: 'user-plus',
    answer:
      'Open a squad at **/squads/slug** and join or request access depending on squad settings.',
  },
  {
    title: 'What is the Following feed?',
    icon: 'bell',
    answer:
      '**Following** shows posts from accounts and topics you follow, in reverse chronological order.',
  },
  {
    title: 'How does Trending work?',
    icon: 'zap',
    answer:
      '**Trending** (**/trending**) highlights posts gaining traction recently based on engagement signals.',
  },
  {
    title: 'Where is the FAQ / help center?',
    icon: 'circle-help',
    answer:
      'Public FAQs live at **/help** as expandable questions. Longer product docs are at **/docs**.',
  },
  {
    title: 'What is the difference between /help and /docs?',
    icon: 'book-open',
    answer:
      '**/help** = short FAQ answers. **/docs** = product documentation. They are managed separately.',
  },
  {
    title: 'How do I contact support?',
    icon: 'life-buoy',
    answer: 'Use **/contact** or the support link on the help page. Include your username for faster help.',
  },
  {
    title: 'How do I send product feedback?',
    icon: 'message-circle',
    answer: 'Go to **/feedback** to share bugs, ideas, or UX notes with the team.',
  },
  {
    title: 'What plans are available?',
    icon: 'credit-card',
    answer: 'See **/pricing** for current tiers, limits, and features.',
  },
  {
    title: 'How do I subscribe or upgrade?',
    icon: 'credit-card',
    answer:
      'On **/pricing**, choose a plan and complete checkout. Your account upgrades after successful payment.',
  },
  {
    title: 'How do I cancel or change my subscription?',
    icon: 'receipt',
    answer:
      'Open **Settings → Billing** or **/pricing** account flows to manage renewal, cancellation, or plan changes.',
  },
  {
    title: 'Where can I see payment receipts?',
    icon: 'receipt',
    answer: 'Billing history and invoices are available in subscription/billing settings after checkout.',
  },
  {
    title: 'Is my payment information secure?',
    icon: 'shield',
    answer:
      'Payments are processed by **Stripe**. We do not store full card numbers on Syntax Stories servers.',
  },
  {
    title: 'How is my personal data protected?',
    icon: 'shield',
    answer:
      'See **/privacy** for how we collect, use, and retain data, plus controls in **Settings**.',
  },
  {
    title: 'Where is the Privacy Policy?',
    icon: 'lock',
    answer: 'See **/privacy** for cookies, account data, and retention practices.',
  },
  {
    title: 'Where are the Terms of Service?',
    icon: 'book-open',
    answer: 'See **/terms** for platform rules, content ownership, and acceptable use.',
  },
  {
    title: 'How do I request account or data deletion?',
    icon: 'lock',
    answer:
      'See **/user-data-deletion** for the process. Some data may be retained where law or security requires it.',
  },
  {
    title: 'How do invites work?',
    icon: 'mail',
    answer: 'Members can share invite links from **/invite**. New users can attach a code at signup.',
  },
  {
    title: 'What is an invite code?',
    icon: 'key',
    answer:
      'A short code or link tying your new account to an invite campaign. Enter it during signup if you have one.',
  },
  {
    title: 'Why did OAuth sign-in fail?',
    icon: 'key',
    answer:
      'Ensure pop-ups are not blocked and you complete the provider flow. Try again or use email OTP.',
  },
  {
    title: 'Why will my post not publish?',
    icon: 'settings',
    answer:
      'Posts need a **title** and answer/body content. Check validation errors in the editor and save a draft first.',
  },
  {
    title: 'Can I use Markdown in posts?',
    icon: 'book-open',
    answer:
      'Yes — the blog editor supports **Markdown** for headings, lists, code blocks, links, and emphasis.',
  },
  {
    title: 'What is profile analytics?',
    icon: 'zap',
    answer:
      '**/profile/analytics** shows engagement stats on your content where enabled for your account.',
  },
  {
    title: 'What is my public profile URL?',
    icon: 'globe',
    answer: 'Your profile is **/u/username**. Share that link after setting your username in settings.',
  },
  {
    title: 'How do I delete my account?',
    icon: 'lock',
    answer:
      'Use account deletion in **Settings** or follow **/user-data-deletion**. Deletion may be irreversible.',
  },
  {
    title: 'How do I report inappropriate content?',
    icon: 'shield',
    answer:
      'Use in-product report actions where available, or **/contact** with the post URL and reason.',
  },
  {
    title: 'Why am I not getting notifications?',
    icon: 'bell',
    answer:
      'Check **Settings → Notifications** and your email preferences. Verify your email and spam folder.',
  },
  {
    title: 'How do email notifications work?',
    icon: 'mail',
    answer:
      'We send transactional mail (login codes, security) and optional product emails per your settings.',
  },
  {
    title: 'How do I manage security and connected accounts?',
    icon: 'key',
    answer: '**Settings → Security** covers password, sessions, and linked OAuth providers.',
  },
  {
    title: 'Why was I logged out suddenly?',
    icon: 'lock',
    answer:
      'Sessions expire for security, or you signed out elsewhere. Sign in again with email OTP or your provider.',
  },
  {
    title: 'Does Syntax Stories work on mobile browsers?',
    icon: 'globe',
    answer:
      'Yes — the webapp is responsive. Use a current Chrome, Safari, or Firefox version for best results.',
  },
  {
    title: 'How do I switch appearance (light/dark)?',
    icon: 'settings',
    answer:
      'Use the theme toggle in the header when available, or **Settings → Appearance** if offered.',
  },
  {
    title: 'Is the platform accessible?',
    icon: 'smile',
    answer:
      'We aim for keyboard navigation, contrast, and semantic markup. Report gaps via **/feedback**.',
  },
  {
    title: 'Is there an API for developers?',
    icon: 'layers',
    answer:
      'Platform APIs power the webapp. See **/docs** or contact us for integration questions.',
  },
  {
    title: 'What is the Wallet page?',
    icon: 'credit-card',
    answer:
      '**/wallet** is reserved for future balance or rewards features. Check **/pricing** for what is live today.',
  },
  {
    title: 'What are featured stories on the home feed?',
    icon: 'sparkles',
    answer:
      'The home page may highlight editorial or high-quality posts. Explore **/explore** or **/topics** when empty.',
  },
  {
    title: 'I am new — where should I start?',
    icon: 'circle-help',
    answer:
      'Create an account → complete your profile → follow topics → join a Squad → read **Trending** → publish from **Write**.',
  },
];
