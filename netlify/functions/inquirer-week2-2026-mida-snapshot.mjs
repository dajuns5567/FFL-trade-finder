// Historical MIDA context for the frozen 2026 Week 2 Inquirer edition.
// Source snapshot: mida-live-data/data/mida-team-context.csv @ 7225214a4e96e50d04d697a17bd2cd42fa21e495
// Snapshot metadata: Data as of 2026-09-24T01:01:28Z; Selected week,2.
// This file intentionally freezes only Week 2 MIDA context so later weeks cannot leak backward.

export const WEEK2_MIDA_AS_OF = '2026-09-24T01:01:28Z';

export const WEEK2_MIDA_2026 = [
  ['Miami Dolphins',1,1487.3286,10.5545,99.0550,30.5750],
  ['Denver Doncos',2,1209.4401,10.2184,97.3500,7.0200],
  ['philadelphia eagles',3,1163.9915,9.5532,89.8250,6.8000],
  ['New Orleans Aints',4,1239.3448,9.2906,88.0650,6.5250],
  ['San Francisco 49ers',5,1314.2700,8.8924,85.6350,13.3650],
  ['Los Angeles Chargers',6,1107.2656,8.6754,87.8850,3.5800],
  ['Baltimore Ravens',7,1021.7218,8.0792,68.8750,1.7700],
  ['Minnesota Vikings',8,1183.8925,7.6901,69.0000,5.1550],
  ['Tennessee Titans',9,1015.0988,7.6677,63.3900,1.6750],
  ['New England Patriots',10,1020.9608,7.4497,62.7900,1.4600],
  ['New York Giants',11,1032.4294,6.9791,44.6450,2.2500],
  ['Pittsburgh Steelers',12,1090.4366,6.9738,50.7600,1.2700],
  ['Seattle Seahawks',13,1042.7032,6.9138,45.7350,2.8450],
  ['Detroit Lions',14,1045.7576,6.8976,47.9950,2.0150],
  ['Cincinnati Bungals',15,1123.3289,6.7799,50.0050,4.4450],
  ['Chicago Bears',16,1059.6385,6.6363,40.7850,1.4500],
  ['Dallas Cowboys',17,950.7630,6.5677,38.5550,0.8100],
  ['Houston Texans',18,1014.5005,6.5040,44.6750,1.4150],
  ['Los Angeles Rams',19,1102.1550,6.4301,35.3250,1.5900],
  ['Arizona Cardinals',20,983.1641,6.3288,32.2650,0.3900],
  ['Indianapolis Colts',21,966.2656,6.2279,34.6200,1.3350],
  ['Carolina Panthers',22,898.0245,5.9001,27.0300,0.5750],
  ['Tampa Bay Buccaneers',23,974.6687,5.8119,27.2350,0.6650],
  ['Cleveland Browns',24,738.4229,5.2400,14.7700,0.0650],
  ['Buffalo Billiards',25,912.0020,4.6153,11.3150,0.3050],
  ['Atlanta Falcons',26,738.0646,4.5633,10.4700,0.1250],
  ['Jacksonville Jags',27,761.2720,4.5318,11.4750,0.0850],
  ['Washington Commanders',28,946.8234,4.4231,9.6450,0.2550],
  ['Green Bay Packers',29,759.9949,4.2861,7.7900,0.1800],
  ['New York Jets',30,732.0776,3.4256,2.6300,0.0050],
  ['Las Vegas Raiders',31,406.4514,2.2722,0.3350,0.0000],
  ['Kansas City Chiefs',32,345.1306,1.6206,0.0700,0.0000]
].map(([name,rank,expected_points,expected_wins,playoff,title])=>({
  name,rank,expected_points,expected_wins,playoff,title,as_of:WEEK2_MIDA_AS_OF,selected_week:2
}));
