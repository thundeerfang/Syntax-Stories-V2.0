import type { InfoSwiperSlide } from '@/components/ui/dialog';


/** Three-step Squads onboarding for {@link InfoSwiperDialog}. */
export const SQUADS_INTRO_SLIDES: InfoSwiperSlide[] = [
  {
    id: 'squads-intro-1',
    title: "Let's see what you can do with Squads!",
    body: (
      <p>
        Squads are small reader groups—share stories, give feedback, and keep discussions in one place.
      </p>
    ),
  },
  {
    id: 'squads-intro-2',
    title: 'Share articles',
    body: (
      <div className="space-y-3 text-left">
        <p>
          <span className="mr-2 bg-violet-500 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
            New
          </span>
          Share articles and swap feedback with your squad.
        </p>
        <p>
          <span className="mr-2 bg-violet-500 px-1.5 py-0.5 text-[10px] font-black uppercase text-white">
            New
          </span>
          From the main feed, use the <strong className="text-zinc-200">squad (people) icon</strong> on a card
          to share into a squad you belong to.
        </p>
      </div>
    ),
  },
  {
    id: 'squads-intro-3',
    title: 'Private space & invites',
    body: (
      <div className="space-y-3 text-left">
        <p>Run <strong className="text-zinc-200">private squads</strong> for trusted circles—stay in sync with friends, teammates, and devs you care about.</p>
        <p>
          <strong className="text-zinc-200">Invite members</strong> with a private join code, or have an admin add
          people by username.
        </p>
      </div>
    ),
  },
];
