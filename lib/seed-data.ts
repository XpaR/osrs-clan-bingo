export type SeedDifficulty = "easy" | "medium" | "hard" | "free";

export interface SeedTile {
  id: string;
  position: number;
  name: string;
  description: string;
  points: number;
  icon: string;
  category: string;
  difficulty: SeedDifficulty;
  isFree: boolean;
}

export interface SeedTeam {
  id: string;
  name: string;
  color: string;
  members: string[];
  sortOrder: number;
}

export interface SeedCompletionPlan {
  teamId: string;
  position: number;
  note: string;
  minutesAgo: number;
}

export const SEED_EVENT = {
  name: "Serpent Cup Bingo",
  tagline: "Four teams, one board, and a week to black it out.",
  chatPassword: "serpentscale",
  bonuses: { row: 5, column: 5, diagonal: 5, blackout: 25 },
};

export const SEED_TEAMS: SeedTeam[] = [
  {
    id: "team-zulrah",
    name: "Team Zulrah",
    color: "#1f9d55",
    members: ["Scales", "Venom", "Snek", "Toxic"],
    sortOrder: 0,
  },
  {
    id: "team-vorkath",
    name: "Team Vorkath",
    color: "#2f6fed",
    members: ["BlueDrag", "Undead", "Assembler", "Wyrm"],
    sortOrder: 1,
  },
  {
    id: "team-jad",
    name: "Team Jad",
    color: "#ef6c1a",
    members: ["Wave63", "CapeRun", "TzTok", "Healers"],
    sortOrder: 2,
  },
  {
    id: "team-bandos",
    name: "Team Bandos",
    color: "#c23b6e",
    members: ["Graardor", "BgsSpec", "Goblin", "Minion"],
    sortOrder: 3,
  },
];

function tile(
  position: number,
  name: string,
  points: number,
  difficulty: SeedDifficulty,
  icon: string,
  category: string,
  description: string,
  isFree = false,
): SeedTile {
  return {
    id: `tile-${String(position).padStart(2, "0")}`,
    position,
    name,
    description,
    points,
    icon,
    category,
    difficulty,
    isFree,
  };
}

export const SEED_TILES: SeedTile[] = [
  tile(
    0,
    "Godwars hilt",
    8,
    "hard",
    "⚔️",
    "Boss",
    "Any one of the Armadyl, Bandos, Saradomin, or Zamorak hilts. A team member has to receive the drop during the event. Hilts bought, traded, or already owned do not count. Nex's ancient hilt is a different tile if you add one; it does not count here.",
  ),
  tile(
    1,
    "50 Zulrah KC",
    3,
    "medium",
    "🐍",
    "Combat",
    "The team combines 50 Zulrah kills gained during the event window. Pre-event kill count does not count. Screenshot a before-and-after kill count, or a session counter, with the clan chat and event word visible. One snake unique is not required.",
  ),
  tile(
    2,
    "Tome of fire",
    4,
    "medium",
    "🔥",
    "Skilling",
    "A tome of fire from Wintertodt, pulled from a supply crate or the reward screen during the event. Burnt pages are not required. The pyromancer outfit, phoenix, and tome of fire pages alone do not complete this tile.",
  ),
  tile(
    3,
    "Master clue",
    5,
    "medium",
    "📜",
    "Clue",
    "Open one master clue casket during the event. The reward can be anything. Screenshot the casket loot or the collection log unlock, with your name and the clan chat word visible. A master clue step in progress does not count.",
  ),
  tile(
    4,
    "Dragon warhammer",
    10,
    "hard",
    "🔨",
    "Boss",
    "A dragon warhammer dropped for a team member, normally from lizardman shamans. The hammer has to be the drop itself. Buying one on the Grand Exchange, or receiving it in a trade, does not count.",
  ),
  tile(
    5,
    "Crystal tool seed",
    4,
    "medium",
    "💎",
    "Skilling",
    "Any crystal tool seed: axe, pickaxe, harpoon, or felling axe. Zalcano, the Gauntlet, and other Prifddinas sources all count. An enhanced crystal weapon seed does not count for this tile. It belongs on Gauntlet seed.",
  ),
  tile(
    6,
    "Fire cape",
    2,
    "easy",
    "🧥",
    "Combat",
    "Earn a Fire cape from the Fight Caves. Screenshot TzTok-Jad's death or the cape in the inventory at the cave exit, with your name visible. A cape bought from another player does not count. One cape completes it for the whole team.",
  ),
  tile(
    7,
    "Zenyte shard",
    8,
    "hard",
    "💍",
    "Boss",
    "A zenyte shard drop, usually from demonic gorillas. Finished zenyte jewellery does not count unless the shard dropped during the event. One shard completes the tile.",
  ),
  tile(
    8,
    "5M skill XP",
    4,
    "medium",
    "📈",
    "Skilling",
    "One team member gains 5,000,000 experience in a single skill during the event. Lamps and other experience count if they are used inside the window. This one is not split across the team. Screenshot an experience tracker or before-and-after skill tab.",
  ),
  tile(
    9,
    "Barrows set",
    5,
    "medium",
    "⚰️",
    "Boss",
    "Complete any one brother set: Ahrim, Dharok, Guthan, Karil, Torag, or Verac. All four pieces have to be obtained during the event. Mixing pieces from several brothers does not count. Screenshot the set in the bank or the collection log.",
  ),
  tile(
    10,
    "Heron or rift pet",
    9,
    "hard",
    "🐦",
    "Skilling",
    "Unlock the heron from aerial fishing, or any rift guardian from Guardians of the Rift. Other pets do not count here. A metamorph of a pet that was already owned does not count. The same pet can also complete Any pet.",
  ),
  tile(
    11,
    "Temp / GotR unique",
    4,
    "medium",
    "🌊",
    "Minigame",
    "One Tempoross or Guardians of the Rift unique. Tempoross: fish barrel, tome of water, big harpoonfish, or a spirit angler piece. Guardians of the Rift: abyssal needle, catalytic talisman, abyssal lantern, a dye, or a robe piece. Pearls, ashes, and runes do not count.",
  ),
  tile(
    12,
    "FREE",
    0,
    "free",
    "⭐",
    "Free",
    "The centre square is filled for every team when the board opens. It is worth 0 points. It still fills the middle of the centre row, the centre column, and both diagonals, so it is the difference between four tiles and a finished line.",
    true,
  ),
  tile(
    13,
    "Boss jar",
    9,
    "hard",
    "🏺",
    "Boss",
    "Any jar drop. Jar of dirt, souls, sand, swamp, stone, darkness, spirits, smoke, chemicals, eyes, decay, miasma, venom, and the rest all qualify. One jar completes the tile. Jars bought from the Grand Exchange do not count.",
  ),
  tile(
    14,
    "Penance Queen",
    3,
    "medium",
    "🛡️",
    "Minigame",
    "Land one Penance Queen kill in Barbarian Assault during the event. The rest of the party can be teammates or randoms. A high-level gamble is not required. Screenshot the queen's death or the reward screen with clan chat open.",
  ),
  tile(
    15,
    "Vorkath head",
    8,
    "hard",
    "🐉",
    "Boss",
    "A Vorkath head drop. The assembled Ava's assembler does not count unless the head itself dropped during the event. Screenshot the drop or the collection log unlock.",
  ),
  tile(
    16,
    "1M Agility XP",
    2,
    "easy",
    "🏃",
    "Skilling",
    "The team combines 1,000,000 Agility experience gained during the event. Rooftops, Hallowed Sepulchre, Brimhaven, and the Wilderness course all count. Add the members' gains together. This is one of the tiles that is allowed to be split.",
  ),
  tile(
    17,
    "Tanzanite / Magma",
    8,
    "hard",
    "🦷",
    "Boss",
    "A tanzanite fang or a magma mutagen from Zulrah. The serpentine visage, magic fang, and uncoloured mutagen do not count. The item has to drop for a team member during the event.",
  ),
  tile(
    18,
    "3rd age piece",
    10,
    "hard",
    "👑",
    "Clue",
    "Any 3rd age item from a clue casket opened during the event. Gilded pieces, ornament kits, and 3rd age bought from the Grand Exchange do not count. This is the long-shot tile. One piece fills it, and the same casket can also fill its clue tile.",
  ),
  tile(
    19,
    "Raids purple",
    8,
    "hard",
    "💜",
    "Boss",
    "A unique from Chambers of Xeric, Theatre of Blood, or Tombs of Amascut. Dust, thread, and a normal raid completion do not count. Twisted bow, scythe, shadow, and the smaller uniques (arcane, dex, avernic, fang, lightbearer, and the rest) all count. One purple fills the tile.",
  ),
  tile(
    20,
    "Any pet",
    9,
    "hard",
    "🐾",
    "Pet",
    "Unlock a pet from any source during the event: boss, skilling, raid, or clue. A metamorph of a pet the player already owned does not count. If the pet is a heron or rift guardian, it can complete this tile and Heron or rift pet together.",
  ),
  tile(
    21,
    "Inferno attempt",
    5,
    "medium",
    "🌋",
    "Combat",
    "Reach wave 50 or higher in the Inferno. You do not have to defeat TzKal-Zuk, and a death counts. Screenshot the wave counter. A Fire cape does not count here. An infernal cape also completes this tile.",
  ),
  tile(
    22,
    "Elite clue",
    2,
    "easy",
    "🗺️",
    "Clue",
    "Open one elite clue casket during the event. The reward can be anything. If it happens to be 3rd age, that piece also completes the 3rd age tile. A casket that is still sealed does not count.",
  ),
  tile(
    23,
    "20 Barrows KC",
    2,
    "easy",
    "💀",
    "Combat",
    "The team loots 20 Barrows chests during the event, combined across members. Chests from before the window do not count. Screenshot the kill count gained or a session tally with the clan chat word visible.",
  ),
  tile(
    24,
    "Gauntlet seed",
    5,
    "medium",
    "🌀",
    "Combat",
    "A crystal armour seed or an enhanced crystal weapon seed from the Corrupted Gauntlet. The regular Gauntlet does not drop the enhanced seed. Crystal tool seeds do not count here. They have their own tile.",
  ),
];

export const SEED_COMPLETIONS: SeedCompletionPlan[] = [
  { teamId: "team-zulrah", position: 2, minutesAgo: 1200, note: "Scales, Wintertodt supply crate. Chat word in the shot." },
  { teamId: "team-vorkath", position: 6, minutesAgo: 1000, note: "BlueDrag, Jad down. Fire cape in the inventory." },
  { teamId: "team-jad", position: 6, minutesAgo: 800, note: "CapeRun, their own cape. Same tile, separate proof." },
  { teamId: "team-bandos", position: 0, minutesAgo: 700, note: "Graardor, Bandos hilt on task." },
  { teamId: "team-zulrah", position: 22, minutesAgo: 400, note: "Snek, elite casket. Not 3rd age." },
  { teamId: "team-jad", position: 8, minutesAgo: 360, note: "TzTok, 5.2M Ranged. Tracker covers the whole gain." },
  { teamId: "team-vorkath", position: 23, minutesAgo: 300, note: "Undead, 20 Barrows chests since the start." },
  { teamId: "team-bandos", position: 14, minutesAgo: 240, note: "Goblin, Penance Queen down. Reward screen attached." },
  { teamId: "team-jad", position: 14, minutesAgo: 200, note: "Healers, queen kill on the same tile." },
  { teamId: "team-zulrah", position: 1, minutesAgo: 150, note: "Venom, 50 Zulrah KC added. Before and after on the KC tab." },
  { teamId: "team-bandos", position: 9, minutesAgo: 120, note: "BgsSpec, full Dharok set, every piece looted this week." },
  { teamId: "team-vorkath", position: 15, minutesAgo: 90, note: "Assembler, Vorkath head at 87 KC." },
  { teamId: "team-jad", position: 21, minutesAgo: 70, note: "Wave63, died at Inferno wave 56. Wave counter visible." },
  { teamId: "team-zulrah", position: 17, minutesAgo: 50, note: "Toxic, magma mutagen. Collection log new." },
  { teamId: "team-zulrah", position: 7, minutesAgo: 35, note: "Scales, zenyte shard on a black demon task." },
  { teamId: "team-bandos", position: 24, minutesAgo: 20, note: "Minion, crystal armour seed from the Corrupted Gauntlet." },
  { teamId: "team-vorkath", position: 3, minutesAgo: 10, note: "Wyrm, master casket opened on stream." },
];

export function eventWindow(now = new Date()) {
  const start = new Date(now.getTime() - 26 * 60 * 60 * 1000);
  const end = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  return { startAt: start.toISOString(), endAt: end.toISOString() };
}
