/* ============================================================
   SPORT CONFIGURATION
   ------------------------------------------------------------
   Every sport is data. To add a sport, add an entry here and a
   row in the `teams` table that points at its key.

   roles        positions / events an athlete can be listed under
   keeperRoles  roles that cannot swap with outfield roles (GK etc.)
   squad        InterIIT squad size (line-up + reserves)
   lineupName   what the first-choice line-up is called
   formations   named line-ups; the first one is the default
                group = { label, roles (null = anyone), n, side }
                side ("att"/"def") is used by the match simulator
   sim          { base } expected goals per side for an even match;
                only goal-scoring sports get the simulator
   skills       self-assessment skills + improvement drills
   roleFocus    extra drill block for a specific role (e.g. GK)
   matchDays    weekdays counted as match days (default Sat/Sun)
   ============================================================ */

export const GENERAL_SKILLS = {
  fitness: {
    key: "fitness", label: "Fitness & endurance",
    drills: ["10 × 40 m shuttle runs with 30 s rest", "20 min steady run plus 5 × 60 m sprint intervals", "Core circuit: plank, side plank, dead bug — 3 rounds"],
    tip: "Push through the last 10 minutes — that's when matches are won or lost.",
  },
  communication: {
    key: "communication", label: "Communication & team play",
    drills: ["Call every pass or play during one drill", "Lead the warm-up huddle before the session", "Give one piece of feedback to a teammate after practice"],
    tip: "Speak first, act second — teammates play better when they hear you.",
  },
};

const field = (def, mid, fwd, gk = "GK", names = ["Forwards", "Midfield", "Defence", "Goalkeeper"], roles = ["Forward", "Midfielder", "Defender"]) => [
  { label: names[0], roles: [roles[0]], n: fwd, side: "att" },
  { label: names[1], roles: [roles[1]], n: mid, side: "att" },
  { label: names[2], roles: [roles[2]], n: def, side: "def" },
  { label: names[3], roles: [gk], n: 1, side: "def" },
];

export const SPORTS = {
  hockey: {
    name: "Hockey", code: "HK", color: "#e8521a",
    roles: ["GK", "Defender", "Midfielder", "Forward"], keeperRoles: ["GK"],
    squad: 16, lineupName: "Playing XI",
    formations: { "4-3-3": field(4, 3, 3), "4-4-2": field(4, 4, 2), "3-4-3": field(3, 4, 3), "5-3-2": field(5, 3, 2), "3-5-2": field(3, 5, 2) },
    sim: { base: 1.7 },
    skills: [
      { key: "passing", label: "Push, stop & passing", drills: ["Wall passes: 100 push passes each side (5 m apart)", "Push–stop–push square drill with a partner — 5 min", "Quick-release push under a chasing defender — 20 reps"], tip: "Stick low, hands apart, weight over the front foot, eyes up before the pass." },
      { key: "dribbling", label: "Dribbling & 3D skills", drills: ["Indian dribble through 10 cones × 5 sets", "1v1 in a 5 m box — 2 min bouts × 4", "Ball-on-stick jog — 5 min continuous"], tip: "Eyes up, ball on the flat side, use both sides of the stick." },
      { key: "dragFlick", label: "Drag flick & scoop", drills: ["20 drag flicks at goal from the top of the circle", "Scoop over a 2 m barrier — 20 reps each side", "Penalty corner routine — 10 reps with injector + stopper"], tip: "Low body, explosive hip turn, follow through — the flick comes from the hips." },
      { key: "tackling", label: "Tackling & defence", drills: ["Shadow 1v1s — 20 reps each side", "Jab-tackle vs block-tackle combo — 15 reps", "Recovery run after a missed tackle — 5 sets"], tip: "Stay low, time the jab, don't dive in." },
      { key: "goalScoring", label: "Hitting & shooting", drills: ["25 hits from the top of the circle — low and hard", "First-time deflections at the near post — 20 reps", "Reverse-stick shots — 20 reps"], tip: "Low, hard, on target — score the simple ones first." },
    ],
    roleFocus: {
      GK: { key: "goalkeeping", label: "Goalkeeping", drills: ["Kicking clearances — 20 reps each foot", "Low and high saves — 2 rounds × 15", "Angle-cutting footwork through a 4-cone ladder"], tip: "Talk to your defence — good keepers organise, not just save." },
    },
    tactics: [
      ["Penalty corner — drag flick", "Injector pushes out to the top of the circle; the stopper traps; the specialist drag-flicks low to a corner. Two runners crash the post for rebounds."],
      ["Press and win high", "Forwards funnel the build-up to one side; the nearest midfielder jumps the passing lane to win the ball in the attacking half."],
      ["Counter through the middle", "On turnover, the centre-half releases a striker down the centre channel while the wings stretch the defence."],
    ],
  },

  football: {
    name: "Football", code: "FB", color: "#1c7a4a",
    roles: ["GK", "Defender", "Midfielder", "Forward"], keeperRoles: ["GK"],
    squad: 18, lineupName: "Starting XI",
    formations: { "4-3-3": field(4, 3, 3), "4-4-2": field(4, 4, 2), "4-2-3-1": field(4, 5, 1), "3-5-2": field(3, 5, 2), "5-3-2": field(5, 3, 2) },
    sim: { base: 1.35 },
    skills: [
      { key: "firstTouch", label: "First touch", drills: ["Wall rebounds — 50 each foot", "Receive-and-turn under pressure — 3 × 3 min", "Aerial control from high throws — 20 reps"], tip: "Open your body before the ball arrives." },
      { key: "passing", label: "Passing range", drills: ["Rondo 5v2 — 4 × 3 min", "Switch-of-play long passes — 20 reps", "One-touch triangles — 5 min"], tip: "Pass to the far foot and move after you pass." },
      { key: "finishing", label: "Finishing", drills: ["Finish across the keeper — 20 shots", "Cut-back first-time finishes — 15 reps", "Weak-foot finishing — 20 shots"], tip: "Placement beats power inside the box." },
      { key: "defending", label: "Defending", drills: ["1v1 channel defending — 10 reps", "Pressing triggers in 4v4 — 4 × 3 min", "Recovery sprints into shape — 6 reps"], tip: "Side-on stance; show them onto their weak foot." },
    ],
    roleFocus: {
      GK: { key: "goalkeeping", label: "Goalkeeping", drills: ["Handling from close-range volleys — 30 reps", "Diving saves each side — 3 × 8", "Distribution: 20 throws and 20 goal kicks to targets"], tip: "Set your feet before the shot; command your box." },
    },
    tactics: [
      ["High press 4-3-3", "The front three press centre-backs; the six screens passes into midfield."],
      ["Low block and counter", "Two banks of four; win the ball and find the quickest forward in behind within three passes."],
    ],
  },

  cricket: {
    name: "Cricket", code: "CR", color: "#2f5fb3",
    roles: ["Batter", "Wicket-keeper", "All-rounder", "Bowler"],
    squad: 15, lineupName: "Playing XI",
    formations: {
      Balanced: [{ label: "Batters", roles: ["Batter"], n: 4 }, { label: "Wicket-keeper", roles: ["Wicket-keeper"], n: 1 }, { label: "All-rounders", roles: ["All-rounder"], n: 2 }, { label: "Bowlers", roles: ["Bowler"], n: 4 }],
      "Batting-heavy": [{ label: "Batters", roles: ["Batter"], n: 5 }, { label: "Wicket-keeper", roles: ["Wicket-keeper"], n: 1 }, { label: "All-rounders", roles: ["All-rounder"], n: 2 }, { label: "Bowlers", roles: ["Bowler"], n: 3 }],
      "Bowling-heavy": [{ label: "Batters", roles: ["Batter"], n: 3 }, { label: "Wicket-keeper", roles: ["Wicket-keeper"], n: 1 }, { label: "All-rounders", roles: ["All-rounder"], n: 2 }, { label: "Bowlers", roles: ["Bowler"], n: 5 }],
    },
    skills: [
      { key: "batting", label: "Batting", drills: ["60 throwdowns on an off-stump line", "Front-foot drives off the bowling machine — 40 balls", "Strike-rotation nets: 2 overs of singles only"], tip: "Head still, play late, watch the ball out of the hand." },
      { key: "bowling", label: "Bowling", drills: ["4 overs aiming at a cone on a good length", "Yorker practice — 24 balls", "Variation over: 6 different deliveries"], tip: "Consistent run-up first; pace follows rhythm." },
      { key: "fielding", label: "Fielding", drills: ["High catches — 20 reps", "Ground fielding with flat throws to the keeper — 30 reps", "Direct hits at one stump — 20 throws"], tip: "Attack the ball, stay low, throw flat." },
      { key: "matchAwareness", label: "Match awareness", drills: ["Scenario nets: 30 off 18 balls", "Field-setting walkthrough with the captain", "Watch and annotate one innings"], tip: "Know the target, overs left and the field every ball." },
    ],
    roleFocus: {
      "Wicket-keeper": { key: "keeping", label: "Wicket-keeping", drills: ["Standing up to spin — 40 takes", "Diving takes each side — 3 × 8", "Stumping drills — 20 reps"], tip: "Stay down until the ball bounces; hands soft." },
    },
  },

  basketball: {
    name: "Basketball", code: "BB", color: "#cf6a14",
    roles: ["Guard", "Forward", "Center"],
    squad: 12, lineupName: "Starting five",
    formations: {
      Standard: [{ label: "Guards", roles: ["Guard"], n: 2 }, { label: "Forwards", roles: ["Forward"], n: 2 }, { label: "Center", roles: ["Center"], n: 1 }],
      "Small ball": [{ label: "Guards", roles: ["Guard"], n: 3 }, { label: "Forwards", roles: ["Forward"], n: 2 }],
    },
    skills: [
      { key: "shooting", label: "Shooting", drills: ["100 form shots close to the rim", "Catch-and-shoot from five spots — 10 each", "Free throws when tired — 3 × 10"], tip: "Same release every shot: elbow in, follow through." },
      { key: "ballHandling", label: "Ball handling", drills: ["Two-ball dribbling — 5 min", "Cone crossover series — 5 sets", "Full-court weak-hand dribble — 6 lengths"], tip: "Eyes up — see the defence, not the ball." },
      { key: "defense", label: "On-ball defence", drills: ["Defensive slides — 6 × 30 s", "Close-out drill — 20 reps", "1v1 from the wing — 10 possessions"], tip: "Low stance, active hands, beat them to the spot." },
      { key: "rebounding", label: "Rebounding", drills: ["Box-out battles — 10 reps", "Tip drill on the backboard — 3 × 30 s", "Outlet pass after the rebound — 15 reps"], tip: "Find a body, then find the ball." },
    ],
  },

  volleyball: {
    name: "Volleyball", code: "VB", color: "#a98300",
    roles: ["Setter", "Outside hitter", "Middle blocker", "Opposite", "Libero"],
    squad: 12, lineupName: "Starting six + libero",
    formations: {
      "5-1": [{ label: "Setter", roles: ["Setter"], n: 1 }, { label: "Outside hitters", roles: ["Outside hitter"], n: 2 }, { label: "Middle blockers", roles: ["Middle blocker"], n: 2 }, { label: "Opposite", roles: ["Opposite"], n: 1 }, { label: "Libero", roles: ["Libero"], n: 1 }],
      "6-2": [{ label: "Setters", roles: ["Setter"], n: 2 }, { label: "Outside hitters", roles: ["Outside hitter"], n: 2 }, { label: "Middle blockers", roles: ["Middle blocker"], n: 2 }, { label: "Libero", roles: ["Libero"], n: 1 }],
    },
    skills: [
      { key: "serve", label: "Serve", drills: ["Float serves to zones 1, 5 and 6 — 30 reps", "Jump-serve approach — 15 reps", "Serves after sprints — 10 reps"], tip: "Same toss, same contact point." },
      { key: "receive", label: "Pass & receive", drills: ["Serve receive in pairs — 40 passes", "Platform passing to a target — 5 min", "Digs from a coach's hit — 20 reps"], tip: "Angle the platform to the target; legs do the work." },
      { key: "attack", label: "Attack", drills: ["Approach footwork without the ball — 20 reps", "Hit line and cross from a set — 20 each", "Tips and roll shots — 15 reps"], tip: "Fast arm, high contact, see the block." },
      { key: "block", label: "Block", drills: ["Footwork along the net — 10 lengths", "Read-block the setter — 15 reps", "Double-block timing with a partner — 15 reps"], tip: "Press over the net, hands firm." },
    ],
  },

  badminton: {
    name: "Badminton", code: "BD", color: "#6a4fc2",
    roles: ["Singles", "Doubles"],
    squad: 7, lineupName: "Tie line-up",
    formations: { Standard: [{ label: "Singles", roles: ["Singles"], n: 3 }, { label: "Doubles pairs", roles: ["Doubles"], n: 4 }] },
    skills: [
      { key: "footwork", label: "Court footwork", drills: ["Six-corner shadow — 6 × 45 s", "Split-step on the feed — 3 min", "Lunge recovery — 20 reps"], tip: "Split-step as the opponent hits, every time." },
      { key: "smash", label: "Smash & attack", drills: ["Rear-court smashes — 30 feeds", "Smash then net kill — 20 reps", "Jump-smash technique — 15 reps"], tip: "Hit in front of the body at the highest point." },
      { key: "netPlay", label: "Net play", drills: ["Tight net spins — 40 feeds", "Net kills on loose returns — 20 reps", "Cross-court net shots — 20 reps"], tip: "Racket up early; soft grip for touch." },
      { key: "defense", label: "Defence", drills: ["Smash defence in pairs — 3 × 2 min", "Drive exchanges — 5 min", "Lifts to length — 30 reps"], tip: "Racket in front, short backswing." },
    ],
  },

  tt: {
    name: "Table Tennis", code: "TT", color: "#c23b30",
    roles: ["Attacker", "Defender", "All-round"],
    squad: 5, lineupName: "Singles order",
    formations: { Standard: [{ label: "Singles", roles: null, n: 3 }] },
    skills: [
      { key: "serve", label: "Serve & receive", drills: ["Short backspin serves — 50 reps", "Spin variations with one motion — 30 reps", "Flick receives — 30 reps"], tip: "Disguise spin with the same arm action." },
      { key: "forehand", label: "Forehand loop", drills: ["Multiball topspin loops — 60 balls", "Loop against block — 3 × 3 min", "Kill high balls — 20 reps"], tip: "Rotate the waist; the arm follows the body." },
      { key: "backhand", label: "Backhand", drills: ["Backhand drive consistency — 100 hits", "Backhand flicks on short balls — 30 reps", "Falkenberg drill — 5 min"], tip: "Contact in front of the body, elbow relaxed." },
      { key: "footwork", label: "Footwork", drills: ["Side-to-side shuffles — 6 × 30 s", "Random multiball — 3 × 2 min", "Pivot-and-loop — 20 reps"], tip: "Small steps; return to ready after each shot." },
    ],
  },

  tennis: {
    name: "Lawn Tennis", code: "LT", color: "#6c8a0f",
    roles: ["Baseliner", "All-court", "Serve-volley"],
    squad: 5, lineupName: "Tie line-up",
    formations: { Standard: [{ label: "Singles", roles: null, n: 2 }, { label: "Doubles", roles: null, n: 2 }] },
    skills: [
      { key: "serve", label: "Serve", drills: ["First serves to T and wide — 40 balls", "Second-serve kick — 30 balls", "Serve plus first ball — 20 points"], tip: "Loose arm, reach up, land inside the court." },
      { key: "groundstrokes", label: "Groundstrokes", drills: ["Cross-court rally — 4 × 3 min", "Change down the line on cue — 20 reps", "Deep-ball targets — 30 balls"], tip: "Prepare early, hit through the ball." },
      { key: "volley", label: "Net game", drills: ["Volley-to-volley — 5 min", "Approach and first volley — 20 reps", "Overheads — 20 lobs"], tip: "Short punch, racket head above the wrist." },
      { key: "movement", label: "Court movement", drills: ["Spider drill — 5 sets", "Recovery after wide balls — 20 reps", "Split-step timing — 3 min"], tip: "Recover to the middle of your opponent's angle." },
    ],
  },

  athletics: {
    name: "Athletics", code: "AT", color: "#c93d68",
    roles: ["Sprints", "Middle distance", "Long distance", "Jumps", "Throws"],
    squad: 14, lineupName: "Event entries",
    formations: { Standard: [{ label: "Sprints", roles: ["Sprints"], n: 3 }, { label: "Middle distance", roles: ["Middle distance"], n: 2 }, { label: "Long distance", roles: ["Long distance"], n: 2 }, { label: "Jumps", roles: ["Jumps"], n: 2 }, { label: "Throws", roles: ["Throws"], n: 2 }] },
    skills: [
      { key: "start", label: "Start & acceleration", drills: ["Block starts — 8 × 20 m", "Wall drives — 3 × 20 s", "Resisted sprints — 6 × 20 m"], tip: "Push, don't step — long drive phase." },
      { key: "technique", label: "Event technique", drills: ["20 min event drills with video", "A-skips and B-skips — 4 × 30 m", "Three full attempts with review"], tip: "One technical cue per session is enough." },
      { key: "speedEndurance", label: "Speed endurance", drills: ["6 × 150 m at 90% with full rest", "Tempo 200s — 8 reps", "Race-pace intervals for your event"], tip: "Relaxed face and shoulders keep you fast late in the race." },
      { key: "power", label: "Power", drills: ["Box jumps — 4 × 6", "Medicine-ball throws — 4 × 8", "Bounding — 4 × 30 m"], tip: "Quality over volume; stop when contacts slow down." },
    ],
  },

  aquatics: {
    name: "Aquatics", code: "AQ", color: "#1b8fb0",
    roles: ["Freestyle", "Backstroke", "Breaststroke", "Butterfly", "IM"],
    squad: 10, lineupName: "Event entries",
    formations: { Standard: [{ label: "Freestyle", roles: ["Freestyle"], n: 2 }, { label: "Backstroke", roles: ["Backstroke"], n: 2 }, { label: "Breaststroke", roles: ["Breaststroke"], n: 2 }, { label: "Butterfly", roles: ["Butterfly"], n: 2 }, { label: "IM", roles: ["IM"], n: 2 }] },
    skills: [
      { key: "starts", label: "Starts & turns", drills: ["Dive starts with 15 m breakout — 10 reps", "Flip turns at race pace — 20 reps", "Streamline kick off the wall — 10 × 15 m"], tip: "Tight streamline off every wall — it's free speed." },
      { key: "stroke", label: "Stroke technique", drills: ["Catch-up drill — 8 × 50 m", "Single-arm drill — 6 × 50 m", "Fist swimming — 4 × 50 m"], tip: "Long body line, early vertical forearm." },
      { key: "endurance", label: "Aerobic base", drills: ["10 × 100 m on a steady interval", "Pull set with buoy — 800 m", "Negative-split 400 m"], tip: "Hold your stroke count as you tire." },
      { key: "kick", label: "Kick", drills: ["Kick with board — 8 × 50 m", "Underwater dolphin kick — 8 × 15 m", "Vertical kicking — 4 × 30 s"], tip: "Kick from the hips, ankles loose." },
    ],
  },

  chess: {
    name: "Chess", code: "CH", color: "#4b5160",
    roles: ["Board player"],
    squad: 5, lineupName: "Board order",
    formations: { Standard: [{ label: "Boards 1–4", roles: null, n: 4 }] },
    matchDays: [0, 6],
    skills: [
      { key: "openings", label: "Opening preparation", drills: ["Review two main lines of your repertoire", "5 blitz games in one opening", "Build a one-page opening sheet"], tip: "Understand the plans, not only the moves." },
      { key: "tactics", label: "Tactics", drills: ["30 timed tactics puzzles", "Visualise 5 positions without a board", "Analyse one missed tactic from your games"], tip: "Checks, captures, threats — every move." },
      { key: "endgames", label: "Endgames", drills: ["Rook endgame drills — 5 positions", "King and pawn studies — 10 min", "Convert won positions against an engine"], tip: "Activate the king early in the endgame." },
      { key: "timeMgmt", label: "Time management", drills: ["Two rapid games with a time budget per phase", "Review where you spent the most time", "3+2 blitz practice"], tip: "Pick candidate moves before calculating deeply." },
    ],
  },

  squash: {
    name: "Squash", code: "SQ", color: "#8a5a2b",
    roles: ["Player"],
    squad: 4, lineupName: "Ranked order",
    formations: { Standard: [{ label: "Ranked order", roles: null, n: 3 }] },
    skills: [
      { key: "movement", label: "Movement to the T", drills: ["Ghosting — 6 × 45 s", "Recovery to the T — 3 × 2 min", "Lunge-and-return — 20 per corner"], tip: "Return to the T after every shot." },
      { key: "length", label: "Length & width", drills: ["Straight drives to the back — 50 each side", "Cross-court width targets — 30 reps", "Boast-drive rally — 5 min"], tip: "Tight and deep before trying to win the point." },
      { key: "volley", label: "Volley", drills: ["Volley drives in pairs — 5 min", "Volley drops — 20 reps", "Short-to-long volley pattern — 3 min"], tip: "Take it early; volleying buys time." },
      { key: "shotSelection", label: "Shot selection", drills: ["Back-court-only conditioned games", "Attack only off loose balls — 3 games", "Review points with a partner"], tip: "Play the percentage shot until you get a loose ball." },
    ],
  },

  weightlifting: {
    name: "Weightlifting", code: "WL", color: "#5d6470",
    roles: ["-61 kg", "-73 kg", "-89 kg", "+89 kg"],
    squad: 6, lineupName: "Category entries",
    formations: { Standard: [{ label: "-61 kg", roles: ["-61 kg"], n: 1 }, { label: "-73 kg", roles: ["-73 kg"], n: 1 }, { label: "-89 kg", roles: ["-89 kg"], n: 1 }, { label: "+89 kg", roles: ["+89 kg"], n: 1 }] },
    skills: [
      { key: "snatch", label: "Snatch", drills: ["Snatch pulls — 5 × 3 at 90%", "Overhead squat — 4 × 3", "Hang snatch technique — 5 × 2"], tip: "Keep the bar close — sweep, don't swing." },
      { key: "cleanJerk", label: "Clean & jerk", drills: ["Power clean — 5 × 2", "Jerk dip and drive — 4 × 3", "Clean + jerk complex — 5 × 1"], tip: "Fast elbows in the clean, vertical dip in the jerk." },
      { key: "mobility", label: "Mobility", drills: ["Ankle and hip mobility — 15 min", "Thoracic openers with a bar — 3 × 10", "Deep squat holds — 3 × 60 s"], tip: "Mobility is a daily habit, not a warm-up." },
      { key: "strength", label: "Leg strength", drills: ["Back squat — 5 × 5", "Front squat — 4 × 4", "Romanian deadlift — 3 × 8"], tip: "Brace the same way before every rep." },
    ],
  },

  waterpolo: {
    name: "Water Polo", code: "WP", color: "#117a8b",
    roles: ["Goalkeeper", "Driver", "Center", "Defender"], keeperRoles: ["Goalkeeper"],
    squad: 11, lineupName: "Starting seven",
    formations: {
      Standard: [{ label: "Drivers", roles: ["Driver"], n: 3, side: "att" }, { label: "Center", roles: ["Center"], n: 1, side: "att" }, { label: "Defenders", roles: ["Defender"], n: 2, side: "def" }, { label: "Goalkeeper", roles: ["Goalkeeper"], n: 1, side: "def" }],
    },
    sim: { base: 8 },
    skills: [
      { key: "swimSpeed", label: "Swim speed", drills: ["Head-up sprints — 10 × 25 m", "Counter-attack sprints — 8 reps", "Change-of-direction swims — 6 sets"], tip: "Head-up freestyle wins the counter-attack." },
      { key: "passing", label: "Passing", drills: ["Dry passes in pairs — 50 each hand", "Wet passes into the center — 20 reps", "Passing while treading — 3 × 2 min"], tip: "Pass high and early to the dry side." },
      { key: "shooting", label: "Shooting", drills: ["Skip shots — 20 reps", "Lobs from 5 m — 15 reps", "Shots after a drive — 20 reps"], tip: "Pick the corner before you rise." },
      { key: "eggbeater", label: "Eggbeater & legs", drills: ["Eggbeater with weight overhead — 4 × 30 s", "Lateral eggbeater — 4 × 10 m", "Jump-outs — 3 × 10"], tip: "Wide knees, continuous circular kick." },
    ],
  },
};

/* Default teams — mirrored in supabase/schema.sql seed. */
export const DEFAULT_TEAMS = [
  { id: "hockey-m", sport: "hockey", category: "Men" },
  { id: "football-m", sport: "football", category: "Men" },
  { id: "cricket-m", sport: "cricket", category: "Men" },
  { id: "basketball-m", sport: "basketball", category: "Men" },
  { id: "basketball-w", sport: "basketball", category: "Women" },
  { id: "volleyball-m", sport: "volleyball", category: "Men" },
  { id: "volleyball-w", sport: "volleyball", category: "Women" },
  { id: "badminton-m", sport: "badminton", category: "Men" },
  { id: "badminton-w", sport: "badminton", category: "Women" },
  { id: "tt-m", sport: "tt", category: "Men" },
  { id: "tt-w", sport: "tt", category: "Women" },
  { id: "tennis-m", sport: "tennis", category: "Men" },
  { id: "athletics-x", sport: "athletics", category: "Mixed" },
  { id: "aquatics-m", sport: "aquatics", category: "Men" },
  { id: "chess-x", sport: "chess", category: "Mixed" },
  { id: "squash-m", sport: "squash", category: "Men" },
  { id: "weightlifting-m", sport: "weightlifting", category: "Men" },
  { id: "waterpolo-m", sport: "waterpolo", category: "Men" },
];

/* ---------- helpers ---------- */
const FALLBACK_SPORT = {
  name: "Sport", code: "SP", color: "#5d6470", roles: ["Player"], squad: 10, lineupName: "Line-up",
  formations: { Standard: [{ label: "Players", roles: null, n: 5 }] }, skills: [],
};
export function getSport(key) { return SPORTS[key] || { ...FALLBACK_SPORT, name: key || "Sport" }; }
export function sportOfTeam(team) { return getSport(team && team.sport); }
export function teamLabel(team) { if (!team) return ""; return `${getSport(team.sport).name} · ${team.category}`; }
export function defaultFormationName(sport) { return Object.keys(sport.formations)[0]; }
export function formationGroups(sport, name) { return sport.formations[name] || sport.formations[defaultFormationName(sport)]; }
export function lineupSize(sport, name) { return formationGroups(sport, name).reduce((a, g) => a + g.n, 0); }
export function skillKeys(sport) { return ["fitness", ...sport.skills.map((s) => s.key)]; }
export function skillLabel(sport, key) {
  if (GENERAL_SKILLS[key]) return GENERAL_SKILLS[key].label;
  const s = sport.skills.find((x) => x.key === key);
  return s ? s.label : key;
}
