import type { PublicState } from "@/lib/types";
import { formatUtc } from "@/lib/format";

const RULES: { title: string; body: string }[] = [
  {
    title: "The window",
    body: "A drop, kill, chest, casket, or experience gain counts only if it happened between the start and the end shown at the top of the board. Items owned before the window, collection-log entries from before the window, and items reclaimed from death do not count.",
  },
  {
    title: "The screenshot",
    body: "One team member posts one proof for the tile. The shot has to show the drop, kill count, or experience, the player name, and clan chat with the event word visible. A RuneLite screenshot with the clock is ideal. The admin pastes the image link onto the tile. If the shot is missing the chat word, it can be refused.",
  },
  {
    title: "One proof, the whole team",
    body: "The first valid proof locks the tile for that team. Every other team can still complete the same tile on their own. A second drop of the same item does not score again for the team that already has the tile.",
  },
  {
    title: "Splits",
    body: "Kill-count and experience tiles say so when the team can add their gains together. Unique drops, pets, and clue caskets have to be received by a team member on their own account. Buying the item, or drop-trading it to a teammate, does not count. Iron accounts play their own drops.",
  },
  {
    title: "One drop can fill more than one tile",
    body: "If a single drop qualifies for two tiles, it completes both. A heron completes Heron or rift pet and Any pet. A 3rd age piece from an elite casket completes 3rd age and Elite clue. Say so in the note so the admin can mark both.",
  },
  {
    title: "Pets",
    body: "A pet unlocked during the window counts. A metamorph of a pet the player already owned does not. The tile description names the pets that are narrower than Any pet.",
  },
  {
    title: "The free space",
    body: "The centre tile is filled for every team when the board opens. It is worth 0 points. It still sits in the centre row, the centre column, and both diagonals, so four real tiles around it finish a line.",
  },
  {
    title: "Points",
    body: "Easy tiles are 1 or 2 points, medium tiles are 3 to 5, and hard tiles are 8 to 10. The number on the square is the tile score. Read the square before you hunt it. The description is the ruling for that tile.",
  },
  {
    title: "Lines and blackout",
    body: "A finished row, column, or diagonal adds a line bonus. Both diagonals count, and they share the centre. A blackout is every square on the board, including the free space, and it pays on top of the lines. The amounts are shown on the standings and can be changed by an admin before the event if your clan wants a different table.",
  },
  {
    title: "Ties",
    body: "The higher total wins. If the totals match, the team with more points from tiles ranks higher. If those match too, the team whose latest completion is earlier ranks higher.",
  },
  {
    title: "Disputes",
    body: "Admins can remove a mark if the proof is from outside the window, the chat word is missing, or the item was bought. Their call is final. A removed mark leaves a line in the completion feed so the board stays honest.",
  },
  {
    title: "Conduct",
    body: "No bug abuse, no buying a unique to fake a drop, and no sharing one screenshot across teams. Team lists are fixed when the event starts unless an admin approves a swap. Play on your own account.",
  },
];

export function RulesView({ state }: { state: PublicState }) {
  const { event } = state;
  return (
    <article className="parchment-panel mx-auto max-w-3xl p-5 sm:p-8">
      <p className="font-display text-xs tracking-[0.22em] text-[#8a6230]">CLAN NOTICE</p>
      <h2 className="font-display text-3xl text-[#3a250f]">Event rules</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#5c4630]">
        {event.name}. {event.tagline}
      </p>
      <div className="mt-4 rounded-sm border border-[#c9a24a] bg-[#fff6df] p-4">
        <p className="text-sm font-bold text-[#6a4a16]">Put this word in clan chat before you screenshot</p>
        <p className="font-display mt-1 text-2xl text-[#3a250f]">{event.chatPassword || "Ask an admin for the word"}</p>
        <p className="mt-2 text-sm text-[#5c4630]">
          Window: {formatUtc(event.startAt)} to {formatUtc(event.endAt)}.
        </p>
      </div>
      <ol className="mt-6 space-y-4">
        {RULES.map((rule, index) => (
          <li key={rule.title} className="border-b border-[#d7c39a] pb-4 last:border-b-0">
            <h3 className="font-display text-lg text-[#3a250f]">
              {index + 1}. {rule.title}
            </h3>
            <p className="mt-1 text-sm leading-relaxed">{rule.body}</p>
          </li>
        ))}
      </ol>
      <section className="mt-2 rounded-sm bg-[#fff8e8] p-4 text-sm">
        <h3 className="font-display text-lg text-[#3a250f]">This event pays</h3>
        <ul className="mt-2 space-y-1">
          <li>+{event.bonuses.row} for each finished row</li>
          <li>+{event.bonuses.column} for each finished column</li>
          <li>+{event.bonuses.diagonal} for each finished diagonal</li>
          <li>+{event.bonuses.blackout} for a blackout, on top of the lines</li>
        </ul>
        <p className="mt-3 text-[#5c4630]">
          There are {state.teams.length} teams: {state.teams.map((team) => team.name).join(", ")}. Open any square on
          the board to read exactly what counts.
        </p>
      </section>
    </article>
  );
}
