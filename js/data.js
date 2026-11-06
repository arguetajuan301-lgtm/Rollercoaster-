/* Chart Coaster: rides, their stories, and the look/sound of each era. */
window.CC = window.CC || {};
(() => {
"use strict";

// Approximate closes at key dates (enough to get the shape right).
// story: [date, title, body] cards shown on billboards and in the HUD as you pass.
// events: [date, label] gates over the track at the most dramatic moments.
const DATASETS = [
  {
    id: "crash1929", theme: "nyc29", name: "The Great Crash", period: "Dow Jones · 1928–1934", unit: "pts", len: 2400,
    pts: [["1928-01-03",200],["1928-06-12",202],["1928-11-30",290],["1929-03-25",297],["1929-06-28",333],["1929-09-03",381],["1929-10-04",325],["1929-10-23",305],["1929-10-28",260],["1929-10-29",230],["1929-10-31",273],["1929-11-13",199],["1929-12-31",248],["1930-04-17",294],["1930-06-21",208],["1930-09-10",245],["1930-12-16",157],["1931-02-24",194],["1931-06-02",121],["1931-06-27",155],["1931-10-05",86],["1931-11-09",116],["1931-12-17",72],["1932-03-08",89],["1932-07-08",41],["1932-09-07",79],["1932-12-03",56],["1933-02-27",50],["1933-07-18",108],["1933-10-21",84],["1934-02-05",110]],
    events: [["1929-09-03","Peak before the fall"],["1929-10-29","Black Tuesday"],["1930-04-17","Sucker's rally"],["1932-07-08","The bottom: −89%"]],
    story: [
      ["1928-03-01","Everyone's buying","Shoeshine boys and bankers alike pile into stocks. Many buy on margin: put 10% down, borrow the rest."],
      ["1929-09-03","The summit","The Dow closes at 381. It won't see this level again for 25 years."],
      ["1929-10-15","“A permanently high plateau”","Famous economist Irving Fisher says stock prices have reached what looks like a permanently high plateau."],
      ["1929-10-24","Black Thursday","A record 12.9 million shares change hands. Top bankers pool money to buy stocks and stop the panic. It works for a day."],
      ["1929-10-29","Black Tuesday","About 16 million shares are dumped. The ticker tape runs hours behind, so nobody knows what anything is worth."],
      ["1930-04-17","False dawn","Stocks win back nearly half their losses. Many decide the worst is over. It isn't."],
      ["1930-12-11","The banks start to fall","The Bank of United States collapses, the biggest US bank failure up to that time."],
      ["1931-09-21","Britain quits gold","Britain abandons the gold standard. Panic spreads through the world's banks."],
      ["1932-07-08","Rock bottom","Dow 41, down 89% from the top. Soon one in four American workers will be jobless."],
      ["1933-03-04","A New Deal","Franklin Roosevelt takes office and within days shuts every bank for a 'bank holiday' to stop the runs."]
    ]
  },
  {
    id: "black1987", theme: "nyc87", name: "Black Monday", period: "Dow Jones · 1987–1988", unit: "pts", len: 1800,
    pts: [["1987-01-02",1927],["1987-04-06",2405],["1987-05-20",2216],["1987-08-25",2722],["1987-09-21",2492],["1987-10-02",2640],["1987-10-14",2412],["1987-10-15",2355],["1987-10-16",2246],["1987-10-19",1738],["1987-10-20",1841],["1987-10-21",2027],["1987-10-26",1793],["1987-11-02",2014],["1987-12-04",1766],["1987-12-31",1939],["1988-03-18",2087],["1988-05-23",1941],["1988-07-05",2158]],
    events: [["1987-08-25","All-time high"],["1987-10-19","Black Monday: −22.6% in one day"],["1987-10-21","Biggest bounce"]],
    story: [
      ["1987-01-08","Dow 2,000","The Dow closes above 2,000 for the first time. Takeovers and buyouts fuel a roaring bull market."],
      ["1987-08-25","The high","Dow 2,722, up about 44% this year. Big funds now let computers run 'portfolio insurance' for them."],
      ["1987-10-16","The first 100-point day","The Dow drops 108 points on a Friday, its first-ever 100-point fall. Traders go home nervous."],
      ["1987-10-19","Black Monday","Down 508 points, −22.6%. Programmed selling feeds on itself. Still the worst day in Dow history."],
      ["1987-10-20","The Fed steps in","New Fed chair Alan Greenspan promises the banks all the cash they need. Markets steady."],
      ["1988-07-05","Life goes on","No depression follows. By 1989 the Dow is back at its old high."]
    ]
  },
  {
    id: "dotcom", theme: "valley", name: "Dot-com Bubble", period: "Nasdaq · 1998–2003", unit: "pts", len: 2400,
    pts: [["1998-01-02",1581],["1998-07-17",2014],["1998-10-08",1419],["1998-12-31",2193],["1999-06-01",2412],["1999-10-15",2690],["1999-12-31",4069],["2000-03-10",5048],["2000-04-14",3321],["2000-07-17",4250],["2000-09-01",4235],["2000-10-12",3074],["2000-12-20",2333],["2001-01-24",2859],["2001-04-04",1638],["2001-05-21",2305],["2001-09-21",1423],["2001-12-05",2046],["2002-03-11",1929],["2002-07-23",1229],["2002-08-22",1422],["2002-10-09",1114],["2002-12-02",1484],["2003-03-11",1271],["2003-12-31",2003]],
    events: [["2000-03-10","Nasdaq 5,048: the top"],["2001-04-04","−68% in a year"],["2001-09-21","After 9/11"],["2002-10-09","Bottom: −78%"]],
    story: [
      ["1998-09-04","Two students and a garage","Google is founded. Anything with '.com' in its name is about to be worth a fortune."],
      ["1999-11-15","Party like it's 1999","The Nasdaq gains 86% this year. Companies with no profits go public and double on their first day."],
      ["2000-01-10","Merger of the century","AOL agrees to buy Time Warner in a deal valued at about $165 billion."],
      ["2000-03-10","5,048","The Nasdaq peaks. It will take 15 years to get back here."],
      ["2000-11-07","Pets.com closes","The online pet store shuts down nine months after going public. Hundreds of dot-coms follow."],
      ["2001-09-17","Markets reopen","After 9/11 the exchanges stay closed for four trading days, the longest shutdown since 1933."],
      ["2001-12-02","Enron collapses","The energy giant files for bankruptcy after hiding its losses. Trust in markets cracks."],
      ["2002-10-09","The bottom","Nasdaq 1,114, down 78%. About $5 trillion in paper wealth is gone."]
    ]
  },
  {
    id: "gfc2008", theme: "suburb08", name: "Financial Crisis", period: "S&P 500 · 2007–2010", unit: "pts", len: 2200,
    pts: [["2007-01-03",1416],["2007-02-20",1459],["2007-03-05",1374],["2007-07-19",1553],["2007-08-15",1406],["2007-10-09",1565],["2007-11-26",1407],["2008-01-22",1310],["2008-02-01",1395],["2008-03-10",1273],["2008-05-19",1426],["2008-07-15",1214],["2008-08-11",1305],["2008-09-12",1252],["2008-09-15",1193],["2008-09-19",1255],["2008-09-29",1106],["2008-10-10",899],["2008-10-13",1003],["2008-10-27",848],["2008-11-04",1005],["2008-11-20",752],["2008-12-08",909],["2009-01-06",935],["2009-03-09",677],["2009-03-26",832],["2009-06-12",946],["2009-07-08",879],["2009-10-19",1097],["2009-12-31",1115],["2010-04-23",1217]],
    events: [["2007-10-09","Market peak"],["2008-09-15","Lehman Brothers files"],["2008-09-29","Bailout vote fails"],["2009-03-09","Bottom: −57%"]],
    story: [
      ["2007-04-02","Cracks in subprime","New Century, a big lender to risky home buyers, goes bankrupt. Few see what's coming."],
      ["2007-08-09","Credit freezes","French bank BNP Paribas freezes funds tied to US mortgages. Banks stop trusting each other."],
      ["2007-10-09","The top","The S&P 500 hits 1,565, even though home prices have already started to fall."],
      ["2008-03-16","Bear Stearns rescued","JPMorgan buys the 85-year-old bank for $2 a share, with Fed backing. It was over $170 a year earlier."],
      ["2008-09-07","Fannie & Freddie seized","The government takes over the two giants behind about half of all US mortgages."],
      ["2008-09-15","Lehman falls","Lehman Brothers files the largest bankruptcy in US history, over $600 billion."],
      ["2008-09-29","Bailout rejected","Congress votes down the rescue plan. The Dow drops 778 points."],
      ["2008-10-03","$700 billion","The TARP bank rescue is signed into law."],
      ["2009-03-09","The bottom","S&P 677, down 57%. Millions of homes are in foreclosure."]
    ]
  },
  {
    id: "covid2020", theme: "nyc20", name: "COVID Crash", period: "S&P 500 · 2020", unit: "pts", len: 1800,
    pts: [["2020-01-02",3258],["2020-01-31",3226],["2020-02-19",3386],["2020-02-28",2954],["2020-03-03",3003],["2020-03-09",2747],["2020-03-10",2882],["2020-03-12",2481],["2020-03-13",2711],["2020-03-16",2386],["2020-03-17",2529],["2020-03-23",2237],["2020-03-26",2630],["2020-04-01",2471],["2020-04-29",2940],["2020-05-13",2820],["2020-06-08",3232],["2020-06-11",3002],["2020-07-31",3271],["2020-09-02",3580],["2020-09-23",3237],["2020-10-12",3534],["2020-10-30",3270],["2020-11-09",3551],["2020-12-31",3756]],
    events: [["2020-02-19","Record high"],["2020-03-16","−12% in a day"],["2020-03-23","Bottom: −34% in 33 days"],["2020-11-09","Vaccine news"]],
    story: [
      ["2020-01-21","A virus arrives","The first US case of a new coronavirus is confirmed. Markets barely notice."],
      ["2020-02-19","Record high","S&P 500 at 3,386. Unemployment is near a 50-year low."],
      ["2020-03-11","Pandemic","The World Health Organization declares a global pandemic. The NBA suspends its season that night."],
      ["2020-03-16","Circuit breakers","Trading halts minutes after the open. The S&P ends the day down 12%."],
      ["2020-03-23","Whatever it takes","The Fed promises unlimited bond buying. This is the bottom: −34% in 33 days."],
      ["2020-03-27","$2.2 trillion","The CARES Act sends relief checks to most Americans."],
      ["2020-08-18","Back on top","A new record high, the fastest recovery from a bear market ever."],
      ["2020-11-09","A vaccine works","Pfizer reports its vaccine is more than 90% effective."]
    ]
  },
  {
    id: "btc2017", theme: "cyber", name: "Bitcoin Mania", period: "BTC/USD · 2017–2018", unit: "$", len: 2200,
    pts: [["2017-01-01",998],["2017-01-11",780],["2017-03-03",1280],["2017-03-24",940],["2017-05-25",2500],["2017-06-11",2950],["2017-07-16",1930],["2017-09-01",4890],["2017-09-15",3230],["2017-10-20",6000],["2017-11-08",7450],["2017-11-12",5950],["2017-11-29",10100],["2017-12-07",16500],["2017-12-17",19500],["2017-12-22",13800],["2018-01-06",17100],["2018-01-17",10900],["2018-02-06",6900],["2018-03-05",11500],["2018-04-06",6600],["2018-05-05",9800],["2018-06-29",5900],["2018-07-25",8200],["2018-08-14",6200],["2018-11-14",6300],["2018-11-25",3900],["2018-12-15",3200],["2018-12-31",3740]],
    events: [["2017-12-17","$19,500: peak hype"],["2018-02-06","Half gone in 7 weeks"],["2018-12-15","Crypto winter: −84%"]],
    story: [
      ["2017-01-03","$1,000","Bitcoin starts the year near $1,000. Few people outside tech have heard of it."],
      ["2017-08-01","The split","A fight over Bitcoin's future splits it in two, creating Bitcoin Cash."],
      ["2017-09-04","China bans ICOs","Beijing outlaws new coin offerings. Bitcoin dips, then shrugs it off."],
      ["2017-12-10","Wall Street arrives","Bitcoin futures start trading in Chicago. Everyone's cousin is asking how to buy."],
      ["2017-12-17","Nearly $20,000","Up about 20 times in a year. The top lands the same day CME futures launch."],
      ["2018-02-06","Half gone","Bitcoin is under $7,000, less than half its peak, after seven weeks."],
      ["2018-11-19","Hash war","Another split fight sends Bitcoin below $5,000."],
      ["2018-12-15","Crypto winter","About $3,200. Down 84% from the top."]
    ]
  },
  {
    id: "gme2021", theme: "gme", name: "GameStop Squeeze", period: "GME · Dec 2020–Mar 2021", unit: "$", len: 1700,
    pts: [["2020-12-01",16.6],["2020-12-31",18.8],["2021-01-12",19.9],["2021-01-13",31.4],["2021-01-14",39.9],["2021-01-19",39.4],["2021-01-21",43.0],["2021-01-22",65.0],["2021-01-25",76.8],["2021-01-26",148.0],["2021-01-27",347.5],["2021-01-28",193.6],["2021-01-29",325.0],["2021-02-01",225.0],["2021-02-02",90.0],["2021-02-04",53.5],["2021-02-19",40.6],["2021-02-24",91.7],["2021-02-25",108.7],["2021-03-03",124.2],["2021-03-10",246.9],["2021-03-15",220.1],["2021-03-24",120.3],["2021-03-31",189.8]],
    events: [["2021-01-27","$347: shorts squeezed"],["2021-01-28","Buy button turned off"],["2021-02-04","−85% in a week"],["2021-03-10","The sequel"]],
    story: [
      ["2020-12-01","A dying mall store","Hedge funds bet heavily against GameStop. Small investors online think they're wrong."],
      ["2021-01-11","New blood","Chewy co-founder Ryan Cohen joins GameStop's board. The stock starts to move."],
      ["2021-01-22","More shorts than shares","Short sellers have bet against more shares than are available to trade."],
      ["2021-01-26","“Gamestonk!!”","Elon Musk tweets one word. After-hours trading goes wild."],
      ["2021-01-27","The squeeze","GME closes at $347. A hedge fund that bet against it has already needed a $2.75 billion rescue."],
      ["2021-01-28","Buy button off","Robinhood and other apps block new purchases. Outrage on all sides."],
      ["2021-02-18","Congress asks why","The heads of Robinhood, Citadel and Reddit testify before Congress."],
      ["2021-02-24","Round two","GME doubles in the last 90 minutes of trading."]
    ]
  },
  {
    id: "nikkei1989", theme: "tokyo", name: "Japan's Bubble", period: "Nikkei 225 · 1985–1992", unit: "¥", len: 2400,
    pts: [["1985-01-04",11558],["1985-12-28",13113],["1986-08-20",18936],["1986-12-30",18701],["1987-06-17",25929],["1987-10-14",26646],["1987-10-20",21910],["1987-12-30",21564],["1988-06-30",27769],["1988-12-28",30159],["1989-05-31",34266],["1989-08-31",34431],["1989-12-29",38916],["1990-04-02",28002],["1990-06-07",33192],["1990-08-23",23737],["1990-10-01",20222],["1990-12-28",23849],["1991-03-18",26839],["1991-08-19",21456],["1991-12-30",22984],["1992-04-09",16598],["1992-06-01",18350],["1992-08-18",14309],["1992-12-28",16925]],
    events: [["1987-10-20","Black Monday hits Tokyo"],["1989-12-29","38,916: the summit"],["1992-08-18","−63%. 34 years to recover"]],
    story: [
      ["1985-09-22","The Plaza Accord","Five nations agree to weaken the dollar. The yen soars, Japan cuts rates, and money floods into land and stocks."],
      ["1987-02-09","NTT mania","The phone company's stock market debut sparks a frenzy. Its shares nearly triple in two months."],
      ["1987-10-20","Black Monday hits Tokyo","The Nikkei falls nearly 15% in a day, then recovers faster than any other market."],
      ["1989-06-01","Land of gold","The land under Tokyo's Imperial Palace is said to be worth more than all of California."],
      ["1989-12-29","38,916","The Nikkei peaks on the last trading day of the decade."],
      ["1990-03-27","Brakes on","The government caps bank lending for land, and the Bank of Japan keeps raising rates."],
      ["1990-10-01","Halved","The Nikkei has lost about half its value in nine months."],
      ["1992-08-18","The lost decade","14,309. The Nikkei won't see its old peak again until 2024."]
    ]
  },
  {
    id: "silver1980", theme: "texas", name: "Silver Thursday", period: "Silver $/oz · 1979–1980", unit: "$", len: 1800,
    pts: [["1979-01-02",6.1],["1979-04-02",7.6],["1979-06-29",8.6],["1979-08-31",10.6],["1979-09-28",16.8],["1979-10-26",15.4],["1979-11-30",19.1],["1979-12-31",28.0],["1980-01-08",37.0],["1980-01-17",49.45],["1980-01-22",34.0],["1980-01-29",36.5],["1980-02-14",34.8],["1980-03-03",30.0],["1980-03-14",21.0],["1980-03-27",10.8],["1980-04-15",14.2],["1980-05-15",13.5],["1980-07-15",16.2],["1980-09-22",21.5],["1980-12-31",15.7]],
    events: [["1980-01-17","Hunt brothers corner: $49.45"],["1980-03-27","Silver Thursday"]],
    story: [
      ["1979-01-02","$6 an ounce","Texas oil heirs Nelson Bunker Hunt and William Herbert Hunt keep buying silver. And buying."],
      ["1979-09-28","Cornering the market","The Hunts and their partners now control a huge share of the world's tradable silver."],
      ["1979-12-31","Melt down the teapot","Prices are so high that people line up to sell family silver to be melted."],
      ["1980-01-07","The rules change","The COMEX exchange limits how much silver traders can buy with borrowed money."],
      ["1980-01-17","$49.45","Silver peaks, up about eight times in a year."],
      ["1980-01-21","Sell orders only","COMEX allows only trades that close out positions. The squeeze is broken."],
      ["1980-03-27","Silver Thursday","The Hunts miss a huge margin call. Silver falls to $10.80 and Wall Street fears a chain of failures."],
      ["1980-05-01","The bailout","Banks lend the Hunts $1.1 billion to unwind it all. They later go bankrupt."]
    ]
  },
  {
    id: "co2", theme: "hawaii", name: "The Keeling Curve", period: "Atmospheric CO₂ · 1959–2024", unit: "ppm", len: 4200, gen: "co2",
    events: [["1959-03-01","Measurements begin, Mauna Loa"],["1988-06-23","Hansen testifies to Congress"],["2015-12-12","Paris Agreement"],["2016-01-01","Past 400 ppm for good"]],
    story: [
      ["1959-03-15","The first numbers","Charles David Keeling's instruments on Mauna Loa read about 316 parts per million."],
      ["1962-05-15","The sawtooth","Each northern summer, forests breathe in and CO₂ dips. Each winter it rises again. Those are the bumps you feel."],
      ["1979-02-12","Scientists gather","The first World Climate Conference meets in Geneva."],
      ["1988-06-23","Congress hears it","NASA's James Hansen testifies that global warming has begun."],
      ["1997-12-11","Kyoto","Nations adopt the first treaty to cut emissions. CO₂ keeps climbing."],
      ["2013-05-09","400","Daily CO₂ at Mauna Loa passes 400 ppm, higher than at any time in at least 800,000 years."],
      ["2015-12-12","Paris","Nearly every nation agrees to hold warming well under 2°C."],
      ["2024-06-15","Still rising","Around 424 ppm, about 50% above pre-industrial levels."]
    ]
  }
];

// CO2: trend fitted to the published annual means plus the ~6 ppm seasonal cycle (peak in May).
(function genCO2(d) {
  const pts = [];
  for (let y = 1959; y <= 2024; y++) for (let m = 0; m < 12; m++) {
    const t = y + m / 12 + 1 / 24 - 1959;
    const trend = 315.6 + 0.78 * t + 0.0128 * t * t;
    const season = 3.1 * Math.sin(2 * Math.PI * (t - 0.12)) + 0.9 * Math.sin(4 * Math.PI * (t + 0.1));
    pts.push([`${y}-${String(m + 1).padStart(2, "0")}-15`, +(trend + season).toFixed(2)]);
  }
  d.pts = pts;
})(DATASETS.find(d => d.gen === "co2"));

/* Each theme is a place and a time: sky, terrain, city, scenery, soundtrack, billboard style. */
const THEMES = {
  nyc29: {
    place: "Wall Street, New York", biome: "nyc", deco: true, station: "exchange", music: "ragtime", particles: "ticker", board: "newsprint",
    sky: { top: "#07060f", mid: "#2a1d3d", hor: "#d8925e", glow: "#ffc98a", aurora: "#ffd9a8", auroraAmt: 0.0, cloud: "#e0a77c", cloudAmt: 0.75, starAmt: 0.6, sun: "#fff1d6", sunSize: 0.05, sunDir: [1, 0.22, -0.45], stripes: 0 },
    fog: [180, 1400], lit: 0.5, win: "#ffd27a", win2: "#ffe9b8", bld: "#16131c", ground: ["#17140f", "#2a2219"], water: "#1c2433"
  },
  nyc87: {
    place: "Wall Street, New York", biome: "nyc", grid: "#ff3fb4", station: "exchange", music: "synthpop", particles: "ticker", board: "crt",
    sky: { top: "#07021a", mid: "#3b0c5e", hor: "#ff4f8b", glow: "#ffb347", aurora: "#3af3ff", auroraAmt: 0.35, cloud: "#ff7ab8", cloudAmt: 0.25, starAmt: 0.9, sun: "#ffd25a", sunSize: 0.17, sunDir: [1, 0.035, 0], stripes: 9 },
    fog: [200, 1500], lit: 0.55, win: "#7fe8ff", win2: "#ff9ad5", bld: "#0d0a1f", ground: ["#0c0618", "#1a0b2e"], water: "#1a0b33"
  },
  valley: {
    place: "Silicon Valley, California", biome: "valley", music: "y2k", particles: "glyphs", board: "web",
    sky: { top: "#020b1f", mid: "#0b3a6b", hor: "#6fd8ff", glow: "#c4f5ff", aurora: "#a6ff4d", auroraAmt: 0.35, cloud: "#8fd9ff", cloudAmt: 0.45, starAmt: 0.8, sun: "#f4fbff", sunSize: 0.05, sunDir: [1, 0.3, 0.5], stripes: 0 },
    fog: [220, 1600], lit: 0.45, win: "#bfe9ff", win2: "#fff6c4", bld: "#101a2a", ground: ["#2a2414", "#6b5626"], water: "#0b2a4a"
  },
  suburb08: {
    place: "Wall Street & Main Street, USA", biome: "suburb", city: true, signs: true, lightning: true, music: "downtempo", particles: "rain", board: "broadcast",
    sky: { top: "#05070c", mid: "#161d2b", hor: "#4c5a70", glow: "#9fb0c8", aurora: "#000000", auroraAmt: 0, cloud: "#76849b", cloudAmt: 1.1, starAmt: 0.15, sun: "#dfe6f0", sunSize: 0.035, sunDir: [1, 0.35, -0.6], stripes: 0 },
    fog: [120, 1000], lit: 0.35, win: "#ffd9a0", win2: "#cfe0ff", bld: "#121520", ground: ["#0e1410", "#1c2619"]
  },
  nyc20: {
    place: "Wall Street, in lockdown", biome: "nyc", station: "exchange", music: "lofi", particles: "dust", board: "broadcast",
    sky: { top: "#02050b", mid: "#0c2630", hor: "#3e8c86", glow: "#9ff2df", aurora: "#6affd0", auroraAmt: 0.55, cloud: "#4fb3a6", cloudAmt: 0.35, starAmt: 1.1, sun: "#e8fff8", sunSize: 0.05, sunDir: [1, 0.28, 0.4], stripes: 0 },
    fog: [180, 1400], lit: 0.1, win: "#fff0c9", win2: "#bff7ff", bld: "#0d1418", ground: ["#0b1214", "#14201f"], water: "#0c2228"
  },
  cyber: {
    place: "Everywhere and nowhere: the internet", biome: "cyber", grid: "#ff3fd0", music: "trap", particles: "coins", board: "neon",
    sky: { top: "#04010d", mid: "#1f0645", hor: "#ff5ccf", glow: "#ffb0ec", aurora: "#4dffb0", auroraAmt: 1.0, cloud: "#9a5cff", cloudAmt: 0.5, starAmt: 1.1, sun: "#f2e9ff", sunSize: 0.04, sunDir: [1, 0.4, -0.3], stripes: 0 },
    fog: [200, 1500], ground: ["#06020e", "#170830"]
  },
  gme: {
    place: "Reddit, and a mall near you", biome: "suburb", rockets: true, music: "chiptune", particles: "rocket", board: "neon",
    sky: { top: "#01030f", mid: "#0f1f55", hor: "#ff7a3d", glow: "#ffc07a", aurora: "#59d0ff", auroraAmt: 0.25, cloud: "#6a7cff", cloudAmt: 0.3, starAmt: 1.1, sun: "#f6f1e6", sunSize: 0.15, sunDir: [1, 0.3, 0], stripes: 0 },
    fog: [160, 1300], lit: 0.75, win: "#9fd8ff", win2: "#ffe08a", bld: "#141626", ground: ["#0d1210", "#1a2418"]
  },
  tokyo: {
    place: "Kabutochō, Tokyo", biome: "tokyo", station: "torii", music: "citypop", particles: "petals", board: "tokyo",
    sky: { top: "#0e0828", mid: "#57297a", hor: "#ff9cc4", glow: "#ffd6e6", aurora: "#a0f0ff", auroraAmt: 0.2, cloud: "#ffb3d1", cloudAmt: 0.65, starAmt: 0.7, sun: "#fff4f8", sunSize: 0.05, sunDir: [1, 0.2, -0.6], stripes: 0 },
    fog: [200, 1700], lit: 0.6, win: "#ff9ad5", win2: "#8ff3ff", bld: "#150d22", ground: ["#140c1c", "#2a1830"]
  },
  texas: {
    place: "COMEX & the Hunts' Texas", biome: "texas", disco: true, music: "disco", particles: "glitter", board: "disco",
    sky: { top: "#0b0418", mid: "#4a1a4d", hor: "#ff9547", glow: "#ffd08a", aurora: "#ff6ad5", auroraAmt: 0.15, cloud: "#ff9ab0", cloudAmt: 0.55, starAmt: 0.9, sun: "#ffe0b0", sunSize: 0.05, sunDir: [1, 0.12, -0.4], stripes: 0 },
    fog: [200, 1600], lit: 0.5, win: "#ffd08a", win2: "#ffffff", bld: "#1a0f1a", ground: ["#2b1610", "#7a4026"]
  },
  hawaii: {
    place: "Mauna Loa, Hawaiʻi", biome: "hawaii", station: "observatory", music: "ambient", particles: "embers", board: "field",
    sky: { top: "#000208", mid: "#08203f", hor: "#ff8a5c", glow: "#ffc8a0", aurora: "#7affc8", auroraAmt: 0.12, cloud: "#c7a6ff", cloudAmt: 0.55, starAmt: 1.3, sun: "#ffffff", sunSize: 0.03, sunDir: [1, 0.25, 0.5], stripes: 0 },
    fog: [240, 1800], ground: ["#120d0c", "#33241c"], water: "#06203a"
  },
  dream: {
    place: "Somewhere in your spreadsheet", biome: "dream", music: "lofi", particles: "glitter", board: "neon",
    sky: { top: "#120a33", mid: "#4b3a9a", hor: "#ffb3c8", glow: "#fff0c8", aurora: "#8affea", auroraAmt: 0.6, cloud: "#ffc6f0", cloudAmt: 0.75, starAmt: 1.1, sun: "#fff8ee", sunSize: 0.07, sunDir: [1, 0.25, 0], stripes: 0 },
    fog: [200, 1600], ground: ["#1d1640", "#5a3f7a"]
  }
};

// Billboard looks, one per era. css: font family used for the HUD card title.
const BOARDS = {
  newsprint: { bg: "#ebe2c8", fg: "#17130d", accent: "#8a1c12", title: '900 74px "Playfair Display", Georgia, serif', body: '400 34px Georgia, serif', kicker: '500 28px "IBM Plex Mono", monospace', css: '"Playfair Display", Georgia, serif', rule: true },
  crt: { bg: "#03140a", fg: "#57ff8a", accent: "#ffd84a", title: '400 96px VT323, monospace', body: '400 44px VT323, monospace', kicker: '400 38px VT323, monospace', css: 'VT323, monospace', scan: true },
  web: { bg: "#eef3ff", fg: "#0b1a5e", accent: "#0a64ff", title: '700 66px Verdana, Tahoma, sans-serif', body: '400 31px Verdana, Tahoma, sans-serif', kicker: '700 26px Verdana, sans-serif', css: 'Verdana, Tahoma, sans-serif', bevel: true },
  broadcast: { bg: "#0d1729", fg: "#ffffff", accent: "#e0242f", title: '600 68px "Instrument Sans", Arial, sans-serif', body: '400 34px "Instrument Sans", Arial, sans-serif', kicker: '600 28px "Instrument Sans", sans-serif', css: '"Instrument Sans", Arial, sans-serif', breaking: true },
  neon: { bg: "#0b0418", fg: "#f6ecff", accent: "#ff4fd8", title: '900 88px "Big Shoulders Display", Impact, sans-serif', body: '400 34px "Instrument Sans", sans-serif', kicker: '500 28px "IBM Plex Mono", monospace', css: '"Big Shoulders Display", Impact, sans-serif', glow: true },
  tokyo: { bg: "#fff3f7", fg: "#2a0d24", accent: "#e8336f", title: '900 86px "Big Shoulders Display", Impact, sans-serif', body: '400 34px "Instrument Sans", sans-serif', kicker: '500 28px "IBM Plex Mono", monospace', css: '"Big Shoulders Display", Impact, sans-serif' },
  disco: { bg: "#1c0b2b", fg: "#ffe9b8", accent: "#ffb547", title: 'italic 900 74px "Playfair Display", Georgia, serif', body: '400 34px "Instrument Sans", sans-serif', kicker: '500 28px "IBM Plex Mono", monospace', css: '"Playfair Display", Georgia, serif', glow: true },
  field: { bg: "#0b1d18", fg: "#e6fff5", accent: "#7affc8", title: '600 62px "IBM Plex Mono", monospace', body: '400 31px "IBM Plex Mono", monospace', kicker: '500 28px "IBM Plex Mono", monospace', css: '"IBM Plex Mono", monospace', grid: true }
};

CC.DATASETS = DATASETS;
CC.THEMES = THEMES;
CC.BOARDS = BOARDS;
})();
