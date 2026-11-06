/* Chart Coaster: the game layer. Era timelines, milestone types, and the
   strangers and quiz questions that stop you along the way.

   phases: [start, end, label]  broad chapters of the era, drawn on the timeline.
   kinds:  one type per story card, in order (buildup, peak, catalyst, crash, rescue, bottom, recovery).
   stops:  { d, who, say, opts: [[label, invested]] }   a stranger asks you to do something.
                invested is how much of your money stays in the market after you answer: 1, 0.5 or 0.
           { d, q, opts: [right, wrong, wrong], fact }   a pop quiz. The first option is right
                (they are shuffled on screen). A right answer pays a 5% bonus.
   game: "quiz" means the chart isn't something you can invest in, so the ride is quiz-only. */
window.CC = window.CC || {};
(() => {
"use strict";

const KINDS = {
  buildup: { label: "Buildup", color: "#7cc4ff" },
  peak: { label: "Peak", color: "#f4f1ff" },
  catalyst: { label: "Catalyst", color: "#ffb547" },
  crash: { label: "Crash", color: "#ff5d6c" },
  rescue: { label: "Rescue", color: "#3ddc97" },
  bottom: { label: "Bottom", color: "#c58cff" },
  recovery: { label: "Recovery", color: "#a8e66a" }
};

const IN = ["Go all in", 1], HALF = ["Keep half in, half in cash", 0.5], OUT = ["Sell everything", 0];

const GAME = {
  crash1929: {
    phases: [["1928-01-03", "1929-09-03", "Roaring Twenties"], ["1929-09-03", "1929-11-13", "The Crash"], ["1929-11-13", "1932-07-08", "Great Depression"], ["1932-07-08", "1934-02-05", "New Deal"]],
    kinds: ["buildup", "peak", "buildup", "catalyst", "crash", "recovery", "catalyst", "catalyst", "bottom", "rescue"],
    stops: [
      { d: "1929-03-25", who: "A shoeshine boy on Wall Street", say: "Psst, mister. Radio stocks only go up. My barber's all in. You in?", opts: [["All in, like the barber", 1], HALF, ["Sell. When shoeshine boys give tips, it's time to go", 0]] },
      { d: "1929-10-25", who: "A banker on the steps of the Exchange", say: "The big banks stepped in yesterday. The worst is behind us. Buy the dip!", opts: [["Buy the dip", 1], ["Hedge: half in", 0.5], ["Get out while I can", 0]] },
      { d: "1929-11-25", q: "On Black Tuesday, why did nobody know what their stocks were worth?", opts: ["The ticker tape ran hours behind", "The exchange lost power", "Newspapers were on strike"], fact: "Prices printed on the ticker came in hours late, so traders sold blind." },
      { d: "1930-04-20", who: "A cheerful radio announcer", say: "Stocks are up nearly 50% from the lows! Happy days are here again!", opts: [["Back in, all the way", 1], ["Half back in", 0.5], ["Stay in cash", 0]] },
      { d: "1931-01-20", q: "Which bank collapsed in December 1930, the biggest US bank failure up to then?", opts: ["Bank of United States", "Bank of America", "J.P. Morgan & Co."], fact: "Its failure wiped out the savings of about 400,000 depositors." },
      { d: "1932-07-12", who: "Your neighbor in the breadline", say: "Stocks are 89% off. I'd never touch them again. Would you?", opts: [["Buy everything that's left", 1], ["Dip a toe in", 0.5], ["Never again", 0]] }
    ]
  },
  black1987: {
    phases: [["1987-01-02", "1987-08-25", "Takeover boom"], ["1987-08-25", "1987-10-16", "Cracks"], ["1987-10-16", "1987-10-21", "Crash"], ["1987-10-21", "1988-07-05", "Recovery"]],
    kinds: ["buildup", "peak", "catalyst", "crash", "rescue", "recovery"],
    stops: [
      { d: "1987-08-20", who: "A trader in red suspenders", say: "Dow's up 40% this year. Computers insure our portfolios now. What could go wrong?", opts: [IN, HALF, ["Cash out at the top", 0]] },
      { d: "1987-10-17", who: "A nervous floor clerk, Saturday morning", say: "Friday was the first 100-point drop ever. Do we sell before Monday?", opts: [["Hold. It's just one bad day", 1], ["Sell half", 0.5], ["Sell it all at the open", 0]] },
      { d: "1987-10-20", q: "How much did the Dow fall on Black Monday?", opts: ["22.6%", "8.4%", "45%"], fact: "It is still the biggest one-day percentage drop in Dow history." },
      { d: "1987-10-21", who: "A Fed watcher on the evening news", say: "The Fed says it'll keep the banks flush with cash. Time to get back in?", opts: [["Back in", 1], ["Half in", 0.5], ["Wait and see", 0]] },
      { d: "1988-03-01", q: "What computer trading strategy was blamed for feeding the selling?", opts: ["Portfolio insurance", "High-frequency trading", "Crypto mining"], fact: "It sold futures automatically as prices fell, which pushed prices down further." }
    ]
  },
  dotcom: {
    phases: [["1998-01-02", "2000-03-10", "Dot-com mania"], ["2000-03-10", "2001-09-21", "The bubble bursts"], ["2001-09-21", "2002-10-09", "Scandal & slump"], ["2002-10-09", "2003-12-31", "Rebuild"]],
    kinds: ["buildup", "buildup", "buildup", "peak", "crash", "catalyst", "catalyst", "bottom"],
    stops: [
      { d: "1999-06-01", who: "Your cousin, the web designer", say: "I quit my job to day-trade. Up 300%! Want my picks?", opts: [["Yes, all in on his picks", 1], ["Half in", 0.5], ["No thanks, cash", 0]] },
      { d: "1999-12-15", q: "Which company was founded in a garage in 1998?", opts: ["Google", "Amazon", "Apple"], fact: "Larry Page and Sergey Brin rented a garage in Menlo Park." },
      { d: "2000-03-06", who: "A startup CEO with a cartoon mascot", say: "We have no profits, but we have eyeballs. IPO next week. You in?", opts: [IN, HALF, ["Sell before the party ends", 0]] },
      { d: "2000-07-20", who: "A TV stock guru", say: "That spring drop was a gift. Buy the dip!", opts: [["Buy the dip", 1], ["Half in", 0.5], ["Stay out", 0]] },
      { d: "2001-01-15", q: "AOL agreed to buy which media giant in January 2000?", opts: ["Time Warner", "Disney", "Viacom"], fact: "It became one of the most famous failed mergers in history." },
      { d: "2001-10-01", who: "A laid-off programmer", say: "My stock options are worthless. Tech is dead forever, right?", opts: [["Buy the wreckage", 1], ["Half in", 0.5], ["Tech is dead", 0]] }
    ]
  },
  gfc2008: {
    phases: [["2007-01-03", "2007-10-09", "Housing bubble"], ["2007-10-09", "2008-09-12", "Credit crunch"], ["2008-09-12", "2009-03-09", "Panic"], ["2009-03-09", "2010-04-23", "Recovery"]],
    kinds: ["catalyst", "catalyst", "peak", "rescue", "rescue", "crash", "crash", "rescue", "bottom"],
    stops: [
      { d: "2007-06-01", who: "A mortgage broker with a fresh tan", say: "No income? No problem! Everyone's flipping houses. Stocks too. All in?", opts: [IN, HALF, OUT] },
      { d: "2007-11-01", q: "In August 2007, a French bank froze funds tied to what?", opts: ["US mortgages", "Oil futures", "Tech stocks"], fact: "BNP Paribas couldn't value its subprime mortgage funds, and credit markets froze." },
      { d: "2008-03-18", who: "A cable-news host", say: "Bear Stearns got rescued. The system works! Time to buy.", opts: [["Buy", 1], ["Half in", 0.5], ["Don't trust it, sell", 0]] },
      { d: "2008-09-16", who: "A Lehman employee carrying a cardboard box", say: "We're done. It might be the whole street next. What are you doing?", opts: [["Holding on", 1], ["Selling half", 0.5], ["Selling everything", 0]] },
      { d: "2008-12-01", q: "How much did the TARP bank rescue set aside?", opts: ["$700 billion", "$7 billion", "$7 trillion"], fact: "Most of the money was eventually paid back, with interest." },
      { d: "2009-03-10", who: "Your neighbor, beside a foreclosure sign", say: "Stocks are down 57%. Only a fool buys now... right?", opts: [["Be the fool: all in", 1], ["Half in", 0.5], ["Stay in cash", 0]] }
    ]
  },
  covid2020: {
    phases: [["2020-01-02", "2020-02-19", "Before"], ["2020-02-19", "2020-03-23", "Lockdown crash"], ["2020-03-23", "2020-08-18", "Stimulus rally"], ["2020-08-18", "2020-12-31", "New highs"]],
    kinds: ["catalyst", "peak", "catalyst", "crash", "rescue", "rescue", "recovery", "recovery"],
    stops: [
      { d: "2020-02-14", who: "A coworker at the coffee machine", say: "Weird virus news from overseas, but stocks keep making records. Still all in?", opts: [["Still all in", 1], HALF, ["Sell, something's off", 0]] },
      { d: "2020-03-12", who: "A neighbor carrying 40 rolls of toilet paper", say: "Everything's crashing! I sold it all this morning. You should too!", opts: [["Hold steady", 1], ["Sell half", 0.5], ["Sell everything", 0]] },
      { d: "2020-03-20", q: "What stopped trading minutes after the open on March 16?", opts: ["Circuit breakers", "A cyberattack", "A power cut"], fact: "A 7% drop triggers an automatic 15-minute pause. It happened four times that month." },
      { d: "2020-04-15", who: "A teen with a brand-new trading app", say: "My stimulus check just landed. Stocks only go up now. Buy?", opts: [["Buy with them", 1], ["Half in", 0.5], ["Wait for a retest", 0]] },
      { d: "2020-06-01", q: "How big was the CARES Act relief package?", opts: ["$2.2 trillion", "$220 billion", "$22 trillion"], fact: "It was the largest economic relief bill in US history at the time." }
    ]
  },
  btc2017: {
    phases: [["2017-01-01", "2017-09-01", "Early adopters"], ["2017-09-01", "2017-12-17", "Mania"], ["2017-12-17", "2018-04-06", "The pop"], ["2018-04-06", "2018-12-31", "Crypto winter"]],
    kinds: ["buildup", "catalyst", "catalyst", "buildup", "peak", "crash", "crash", "bottom"],
    stops: [
      { d: "2017-05-20", who: "A guy in a hoodie at a crypto meetup", say: "Bitcoin's more than doubled this year. HODL. Buy more?", opts: [["HODL, all in", 1], HALF, ["Take profits", 0]] },
      { d: "2017-08-20", q: "What did Bitcoin split off on August 1, 2017?", opts: ["Bitcoin Cash", "Bitcoin Gold", "Ethereum"], fact: "Holders got one Bitcoin Cash for every Bitcoin they owned." },
      { d: "2017-12-12", who: "Your uncle at the holiday party", say: "I sold the boat for crypto. It's going to $100,000 by spring!", opts: [["Join the uncle", 1], ["Half in", 0.5], ["Sell to the uncle", 0]] },
      { d: "2018-02-08", who: "A crypto influencer, live from a lambo", say: "It's just a dip. Real ones buy the dip.", opts: [["Buy the dip", 1], ["Half in", 0.5], ["I'm out", 0]] },
      { d: "2018-06-01", q: "Bitcoin's December 2017 peak came the same day what launched?", opts: ["CME Bitcoin futures", "The first Bitcoin ATM", "The first Bitcoin ETF"], fact: "Futures let big traders bet against Bitcoin for the first time." },
      { d: "2018-11-27", who: "An ex-miner selling graphics cards", say: "Crypto winter. I'm out for good. You?", opts: [["Buy when there's blood", 1], ["Half in", 0.5], ["Out for good", 0]] }
    ]
  },
  gme2021: {
    phases: [["2020-12-01", "2021-01-12", "Short bets"], ["2021-01-12", "2021-01-27", "The squeeze"], ["2021-01-27", "2021-02-19", "Collapse"], ["2021-02-19", "2021-03-31", "Round two"]],
    kinds: ["buildup", "catalyst", "buildup", "catalyst", "peak", "crash", "catalyst", "recovery"],
    stops: [
      { d: "2021-01-12", who: "A forum poster with a cat avatar", say: "GME is the most shorted stock in America. You know what that means?", opts: [["Buy and hold", 1], ["Small bet: half in", 0.5], ["Stay out", 0]] },
      { d: "2021-01-24", q: "What happens in a short squeeze?", opts: ["Short sellers rush to buy back shares, pushing the price up", "A company buys back its own stock", "The exchange halts all trading"], fact: "Shorts borrowed shares to sell. When the price soars, they must buy back at any price." },
      { d: "2021-01-27", who: "Your little brother, screaming", say: "It's at $347! Diamond hands, or take the money?", opts: [["Diamond hands", 1], ["Sell half", 0.5], ["Take the money", 0]] },
      { d: "2021-02-05", who: "A forum poster, still smiling", say: "It dropped 85%. Hold the line!", opts: [["Hold the line", 1], ["Half in", 0.5], ["Cut losses", 0]] },
      { d: "2021-02-20", q: "Which app restricted buying GME on January 28?", opts: ["Robinhood", "Venmo", "Instagram"], fact: "It said it needed more cash to cover clearinghouse deposits." }
    ]
  },
  nikkei1989: {
    phases: [["1985-01-04", "1985-09-22", "Before Plaza"], ["1985-09-22", "1989-12-29", "Bubble economy"], ["1989-12-29", "1990-10-01", "Bust"], ["1990-10-01", "1992-12-28", "Lost decade"]],
    kinds: ["catalyst", "buildup", "crash", "buildup", "peak", "catalyst", "crash", "bottom"],
    stops: [
      { d: "1986-01-15", who: "A salaryman on the Ginza line", say: "The yen is soaring and rates are falling. Everyone's buying land and stocks!", opts: [IN, HALF, OUT] },
      { d: "1987-12-01", q: "Which company's 1987 stock market debut set off a frenzy?", opts: ["NTT", "Sony", "Toyota"], fact: "Millions of first-time investors applied for shares in the phone company." },
      { d: "1989-11-20", who: "A property tycoon at a karaoke bar", say: "Tokyo land is worth more than America! The Nikkei will hit 50,000!", opts: [["Kanpai! All in", 1], ["Half in", 0.5], ["Sell at the top", 0]] },
      { d: "1990-04-05", who: "A bank branch manager", say: "Down 28% this quarter. Just a correction. Buy?", opts: [["Buy the correction", 1], ["Half in", 0.5], ["Stay out", 0]] },
      { d: "1991-01-15", q: "What did the government cap in March 1990 to cool the bubble?", opts: ["Bank lending for land", "Car exports", "Rice imports"], fact: "Cutting off land loans helped burst the property bubble." },
      { d: "1992-08-20", who: "A retired investor", say: "Halved twice over. I'm done with stocks. You?", opts: [["Buy at the bottom", 1], ["Half in", 0.5], ["Done with stocks", 0]] }
    ]
  },
  silver1980: {
    phases: [["1979-01-02", "1979-09-28", "Quiet buying"], ["1979-09-28", "1980-01-17", "The corner"], ["1980-01-17", "1980-03-27", "The rules change"], ["1980-03-27", "1980-12-31", "Aftermath"]],
    kinds: ["buildup", "buildup", "buildup", "catalyst", "peak", "catalyst", "crash", "rescue"],
    stops: [
      { d: "1979-06-01", who: "A Dallas oilman in a Stetson", say: "Inflation's eating cash alive. Silver is real money. Buy with me?", opts: [["Buy all I can", 1], HALF, ["Pass", 0]] },
      { d: "1979-11-15", q: "Who was trying to corner the silver market?", opts: ["The Hunt brothers", "The Rothschilds", "The Rockefellers"], fact: "Nelson Bunker Hunt and William Herbert Hunt, sons of a Texas oil billionaire." },
      { d: "1980-01-10", who: "Grandma, holding the family teapot", say: "The smelter's paying a fortune per ounce! Should I keep it or sell?", opts: [["Keep it, silver's going to $100", 1], ["Sell half the set", 0.5], ["Sell it all", 0]] },
      { d: "1980-02-01", q: "What did the COMEX exchange allow from January 21, 1980?", opts: ["Only trades that close positions", "Unlimited borrowing", "Round-the-clock trading"], fact: "Nobody could open new bets, which broke the squeeze." },
      { d: "1980-03-28", who: "A broker, the day after Silver Thursday", say: "Silver crashed to $10.80. Bargain, or a falling knife?", opts: [["Bargain, buy", 1], ["Half in", 0.5], ["Falling knife", 0]] }
    ]
  },
  co2: {
    game: "quiz",
    phases: [["1959-01-15", "1979-02-12", "Early record"], ["1979-02-12", "1997-12-11", "Warnings"], ["1997-12-11", "2015-12-12", "Treaties"], ["2015-12-12", "2024-12-15", "Past 400"]],
    kinds: ["buildup", "buildup", "catalyst", "catalyst", "rescue", "peak", "rescue", "peak"],
    stops: [
      { d: "1965-06-15", q: "Why does the curve wiggle up and down every year?", opts: ["Northern forests absorb CO₂ each summer", "Volcanoes erupt every winter", "Ocean tides"], fact: "Most land and forests are in the Northern Hemisphere, so its seasons set the rhythm." },
      { d: "1975-06-15", q: "Why measure on top of a Hawaiian volcano?", opts: ["The air is far from cities and well mixed", "It's the highest place on Earth", "Volcanoes make CO₂ easy to see"], fact: "At 3,400 m in the middle of the Pacific, local pollution barely reaches it." },
      { d: "1990-06-15", q: "Who told Congress in 1988 that global warming had begun?", opts: ["James Hansen", "Carl Sagan", "Al Gore"], fact: "He said he was 99% sure the warming wasn't natural." },
      { d: "2003-06-15", q: "Roughly what was CO₂ before the industrial age?", opts: ["280 ppm", "180 ppm", "400 ppm"], fact: "Air bubbles trapped in ice cores record it." },
      { d: "2014-06-15", q: "What milestone did Mauna Loa pass in 2013?", opts: ["400 ppm", "500 ppm", "300 ppm"], fact: "It hadn't been that high in at least 800,000 years." },
      { d: "2020-06-15", q: "Which 2015 agreement aims to keep warming well under 2°C?", opts: ["Paris Agreement", "Kyoto Protocol", "Montreal Protocol"], fact: "Nearly every country on Earth signed it." }
    ]
  }
};

// Jokes for the top of a big climb. The first one is the house favorite.
const HEIGHT_JOKES = [
  ["Scared of heights?", "Don't worry. Highs are always temporary."],
  ["Nice view up here?", "Enjoy it. Gravity always collects."],
  ["Feeling dizzy?", "Relax, the market has a cure for altitude."],
  ["Is it windy up here,", "or is that just the bubble?"],
  ["Afraid of heights?", "Good news: this chart is too."]
];

// Strangers for rides you build yourself, placed automatically at big run-ups and big drops.
const GENERIC = {
  hype: [
    { who: "A stranger who won't stop smiling", say: "This only goes up! I put my rent money in. You?" },
    { who: "A stranger with a newsletter", say: "My model says it doubles again from here. Want in?" }
  ],
  panic: [
    { who: "A stranger, pale and sweating", say: "It's collapsing! I sold everything. You should too!" },
    { who: "A stranger reading the headlines", say: "They say it's over for good. Are you still holding?" }
  ]
};

CC.GAME = GAME; CC.KINDS = KINDS; CC.HEIGHT_JOKES = HEIGHT_JOKES; CC.GENERIC_STOPS = GENERIC;
})();
