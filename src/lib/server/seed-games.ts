import type { CategoryId } from "@/lib/shared/categories";

export interface SeedGame {
  slug: string;
  name: string;
  url: string;
  category: CategoryId;
  description: string;
  tags?: string[];
}

/**
 * Curated starter catalog. Slugs double as stable IDs for seed games.
 * Edit freely — `npm run db:seed` upserts by slug and is safe to re-run.
 */
export const SEED_GAMES: SeedGame[] = [
  // Trivia
  { slug: "krillion", name: "Krillion", url: "https://krillion.io", category: "trivia", description: "Seven open-ended prompts a day — the rarer your answer, the deeper you dive.", tags: ["rarity"] },
  { slug: "daily-tens", name: "Daily Tens", url: "https://dailytens.com", category: "trivia", description: "Name the top ten answers in today's category.", tags: ["top10"] },
  { slug: "timeguessr", name: "TimeGuessr", url: "https://timeguessr.com", category: "trivia", description: "Guess where and when each photo was taken." },
  { slug: "chronophoto", name: "Chronophoto", url: "https://www.chronophoto.app", category: "trivia", description: "Guess the year a photo was taken." },
  { slug: "wikitrivia", name: "Wikitrivia", url: "https://wikitrivia.tomjwatson.com", category: "trivia", description: "Put historical events in order on a timeline." },
  { slug: "costcodle", name: "Costcodle", url: "https://costcodle.com", category: "trivia", description: "Guess the price of a Costco item in six tries." },

  // Word
  { slug: "wordle", name: "Wordle", url: "https://www.nytimes.com/games/wordle/index.html", category: "word", description: "Guess the five-letter word in six tries.", tags: ["nyt"] },
  { slug: "connections", name: "Connections", url: "https://www.nytimes.com/games/connections", category: "word", description: "Group sixteen words into four hidden categories.", tags: ["nyt"] },
  { slug: "strands", name: "Strands", url: "https://www.nytimes.com/games/strands", category: "word", description: "Find themed words hidden in a letter grid.", tags: ["nyt"] },
  { slug: "spelling-bee", name: "Spelling Bee", url: "https://www.nytimes.com/puzzles/spelling-bee", category: "word", description: "Make words from seven letters — always use the center one.", tags: ["nyt"] },
  { slug: "the-mini", name: "The Mini Crossword", url: "https://www.nytimes.com/crosswords/game/mini", category: "word", description: "A bite-sized daily crossword.", tags: ["nyt", "crossword"] },
  { slug: "letter-boxed", name: "Letter Boxed", url: "https://www.nytimes.com/puzzles/letter-boxed", category: "word", description: "Connect letters around a square to use them all.", tags: ["nyt"] },
  { slug: "quordle", name: "Quordle", url: "https://www.merriam-webster.com/games/quordle/", category: "word", description: "Solve four Wordles at once in nine guesses." },
  { slug: "octordle", name: "Octordle", url: "https://octordle.com", category: "word", description: "Eight words, thirteen guesses." },
  { slug: "waffle", name: "Waffle", url: "https://wafflegame.net/daily", category: "word", description: "Swap letters to fix the waffle-shaped word grid." },
  { slug: "contexto", name: "Contexto", url: "https://contexto.me", category: "word", description: "Find the secret word by semantic closeness." },
  { slug: "semantle", name: "Semantle", url: "https://semantle.com", category: "word", description: "Guess the word using similarity scores." },
  { slug: "squaredle", name: "Squaredle", url: "https://squaredle.app", category: "word", description: "Find all the words in a square of letters." },
  { slug: "phrazle", name: "Phrazle", url: "https://solitaired.com/phrazle", category: "word", description: "Guess the hidden phrase." },
  { slug: "pinpoint", name: "Pinpoint", url: "https://www.linkedin.com/games/pinpoint/", category: "word", description: "Guess the category from as few clues as possible.", tags: ["linkedin"] },

  // Geography
  { slug: "worldle", name: "Worldle", url: "https://worldle.teuteuf.fr", category: "geo", description: "Guess the country from its silhouette." },
  { slug: "globle", name: "Globle", url: "https://globle-game.com", category: "geo", description: "Find the mystery country on a hot-and-cold globe." },
  { slug: "tradle", name: "Tradle", url: "https://games.oec.world/en/tradle/", category: "geo", description: "Guess the country from its exports." },
  { slug: "travle", name: "Travle", url: "https://travle.earth", category: "geo", description: "Connect two countries through their neighbors." },
  { slug: "flagle", name: "Flagle", url: "https://www.flagle.io", category: "geo", description: "Reveal the flag piece by piece." },
  { slug: "geogrid", name: "GeoGrid", url: "https://www.geogridgame.com", category: "geo", description: "Fill a 3×3 grid with countries matching each row and column." },

  // Numbers
  { slug: "nerdle", name: "Nerdle", url: "https://nerdlegame.com", category: "math", description: "Wordle, but it's an equation." },
  { slug: "mathler", name: "Mathler", url: "https://www.mathler.com", category: "math", description: "Find the equation that equals today's number." },
  { slug: "sumplete", name: "Sumplete", url: "https://sumplete.com", category: "math", description: "Delete numbers so each row and column hits its target." },

  // Logic
  { slug: "queens", name: "Queens", url: "https://www.linkedin.com/games/queens/", category: "logic", description: "Place one queen in every row, column and color region.", tags: ["linkedin"] },
  { slug: "tango", name: "Tango", url: "https://www.linkedin.com/games/tango/", category: "logic", description: "Fill the grid with suns and moons.", tags: ["linkedin"] },
  { slug: "zip", name: "Zip", url: "https://www.linkedin.com/games/zip/", category: "logic", description: "Draw one path through every cell in order.", tags: ["linkedin"] },
  { slug: "nyt-sudoku", name: "Sudoku", url: "https://www.nytimes.com/puzzles/sudoku", category: "logic", description: "Classic daily sudoku in three difficulties.", tags: ["nyt"] },
  { slug: "puzzmo", name: "Puzzmo", url: "https://www.puzzmo.com", category: "logic", description: "A daily bundle of fresh puzzle games." },

  // Movies & music
  { slug: "framed", name: "Framed", url: "https://framed.wtf", category: "media", description: "Guess the movie from six frames." },
  { slug: "moviedle", name: "Moviedle", url: "https://moviedle.app", category: "media", description: "Guess the movie from a sped-up clip." },
  { slug: "cinenerdle", name: "Cinenerdle", url: "https://www.cinenerdle2.app", category: "media", description: "Chain movies together through shared cast and crew." },
  { slug: "bandle", name: "Bandle", url: "https://bandle.app", category: "media", description: "Guess the song as instruments are added." },
  { slug: "spotle", name: "Spotle", url: "https://spotle.io", category: "media", description: "Guess the Spotify artist." },
  { slug: "guess-the-game", name: "GuessThe.Game", url: "https://guessthe.game", category: "media", description: "Guess the video game from screenshots." },
];
