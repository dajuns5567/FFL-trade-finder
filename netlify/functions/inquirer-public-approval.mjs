export function publiclyApprovedEdition(season,week){
 const approvalSeason=Number(process.env.INQUIRER_APPROVAL_SEASON??2026)||2026;
 const through=Math.max(0,Math.min(17,Number(process.env.INQUIRER_APPROVED_THROUGH_WEEK??4)||0));
 const year=Number(season),edition=Number(week);
 return Number.isInteger(year)&&year>=2020&&Number.isInteger(edition)&&edition>=1&&edition<=17&&(year<approvalSeason||year===approvalSeason&&edition<=through);
}
